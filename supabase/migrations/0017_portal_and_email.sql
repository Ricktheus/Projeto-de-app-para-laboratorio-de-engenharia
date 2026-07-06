-- =====================================================================
-- Migration 0017 — Client portal access + transactional e-mail plumbing (S009)
-- =====================================================================
-- Adds the data-layer support the S009 features need, all deny-by-default and
-- scoped by cliente_id, plus the producer side of the e-mail pipeline (the
-- delivery worker is the `enviar-email` Edge Function):
--
--   1. obras_cliente_select      — a client may READ its own obras, so the
--      portal (F-S009-1 / US18) can list/filter reports by obra. Writes stay
--      denied (only obras_criar/obras_editar for internal roles).
--   2. laudos_cliente_select (storage) — a client may download the SIGNED PDF
--      (`<laudo_id>/assinado.pdf`) of its own `assinado` reports; never the
--      unsigned original nor any other client's file (SPEC §7.1 retention: no
--      DELETE policy).
--   3. trg_laudos_notify        — when a report enters `pronto_assinatura`,
--      enqueue a `pronto_assinatura` e-mail to each active RT (eng_lab)
--      (US24-CA2). The `laudo_assinado` notification is already enqueued by the
--      S008 `upload-laudo-assinado` function on publication (US24-CA1).
--   4. enqueue_cps_pendentes_coleta_emails() + a daily pg_cron job — enqueue a
--      `cps_pendentes_coleta` e-mail to each active sócio de campo with the
--      count of specimens `moldado` for >24h and not yet collected (US24-CA3).
--
-- The e-mail helpers are SECURITY DEFINER (owner bypasses RLS) so they can write
-- the infra table `email_events`, exactly like the audit trigger (0004). All
-- statements are idempotent. `public.` qualification is used in storage policies
-- because storage policies do not run with `public` on the search_path.
-- =====================================================================

-- ---------- 1. obras: a client reads its own obras (portal filter) ----------
drop policy if exists obras_cliente_select on obras;
create policy obras_cliente_select on obras for select
  using (current_role_name() = 'cliente' and cliente_id = current_cliente_id());

-- ---------- 2. laudos bucket: a client downloads its own SIGNED PDF ----------
-- Object path is `<laudo_id>/assinado.pdf`; the id is compared as text to avoid
-- any cast error on an unexpected object name.
drop policy if exists laudos_cliente_select on storage.objects;
create policy laudos_cliente_select on storage.objects for select
  using (
    bucket_id = 'laudos'
    and public.current_role_name() = 'cliente'
    and storage.objects.name like '%/assinado.pdf'
    and exists (
      select 1
      from public.laudos l
      where l.id::text = split_part(storage.objects.name, '/', 1)
        and l.status = 'assinado'
        and l.cliente_id = public.current_cliente_id()
    )
  );

-- ---------- 3. pronto_assinatura -> RT e-mail (US24-CA2) ----------
create or replace function notify_laudo_pronto_assinatura()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Only on the transition INTO pronto_assinatura (not on repeated updates).
  if new.status = 'pronto_assinatura'
     and (old.status is distinct from 'pronto_assinatura') then
    insert into email_events (evento, destinatario, payload, status)
    select
      'pronto_assinatura',
      u.email,
      jsonb_build_object('laudo_id', new.id, 'numero', new.numero),
      'pendente'
    from usuarios u
    where u.role = 'eng_lab'
      and u.ativo = true
      and u.email is not null
      and u.email <> '';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_laudos_notify on laudos;
create trigger trg_laudos_notify
  after update on laudos
  for each row
  execute function notify_laudo_pronto_assinatura();

-- ---------- 4. Daily: enqueue "X CPs pendentes de coleta" -> sócio ----------
-- Counts specimens still `moldado` whose molding record is older than 24h (never
-- collected) and, when there is at least one, enqueues one e-mail per active
-- sócio de campo carrying the count. Returns the pending count. SECURITY DEFINER
-- so it can write `email_events`; callable by the cron job and the worker.
create or replace function enqueue_cps_pendentes_coleta_emails()
  returns integer
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)::int into v_count
  from corpos_prova
  where status = 'moldado'
    and created_at < now() - interval '24 hours';

  if v_count > 0 then
    insert into email_events (evento, destinatario, payload, status)
    select
      'cps_pendentes_coleta',
      u.email,
      jsonb_build_object('quantidade', v_count),
      'pendente'
    from usuarios u
    where u.role = 'socio_campo'
      and u.ativo = true
      and u.email is not null
      and u.email <> '';
  end if;

  return v_count;
end;
$$;

revoke execute on function enqueue_cps_pendentes_coleta_emails() from public, anon, authenticated;
grant execute on function enqueue_cps_pendentes_coleta_emails() to service_role;

-- Daily cron (09:00) — guarded so the migration is a no-op where pg_cron is not
-- installed (plain Postgres / CI). The job only ENQUEUES; the `enviar-email`
-- worker delivers the queued rows (its own scheduled drain, see functions/README).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'cps-pendentes-coleta-diario') then
      perform cron.unschedule('cps-pendentes-coleta-diario');
    end if;
    perform cron.schedule(
      'cps-pendentes-coleta-diario',
      '0 9 * * *',
      $cron$ select public.enqueue_cps_pendentes_coleta_emails(); $cron$
    );
  end if;
end;
$$;
