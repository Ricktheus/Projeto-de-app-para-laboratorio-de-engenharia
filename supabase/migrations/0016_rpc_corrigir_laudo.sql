-- =====================================================================
-- Migration 0016 — RPC corrigir_laudo (F-S008-3 / US22)
-- =====================================================================
-- Corrects a SIGNED report while preserving the previous version, as a legal
-- document with lifetime retention demands (PRD §2.3 / §5.2). Applied
-- server-side (SPEC §4.6): the client never rewrites `status`/`versao` directly.
--
-- Happy (US22-CA1):
--   * the previous version moves `assinado` -> `substituido` (preserved);
--   * a NEW version is inserted with `versao = old.versao + 1`,
--     `substitui_laudo_id = old.id`, the SAME numero/cliente/obra/tipo, and a
--     fresh `rascunho` state (its PDFs/signatures are cleared — the corrected
--     document is regenerated and re-signed through the normal S008 flow);
--   * the `laudo_concretagens` junction is copied so the new version consolidates
--     the same NFs.
-- The public page always resolves the CURRENT version by walking the
-- `substitui_laudo_id` chain to the row that is NOT itself substituted (US22-CA2,
-- consumed by S009's `validar-laudo`); the whole chain is retained + auditable.
--
-- Sad path: correcting a non-`assinado` report -> raise 'LAUDO_NAO_ASSINADO'
-- ("Só é possível corrigir laudos já assinados.").
--
-- RBAC: engineers only (reuses `_assert_laudo_eng` from 0014). The provisional
-- `codigo_verificacao` is a placeholder; the real anti-fraud hash is assigned
-- when the corrected PDF is generated (S008 gerar-laudo-pdf, SPEC §7.1). Both the
-- UPDATE and the INSERT fire the existing trg_audit trigger (migration 0004).
--
-- SECURITY DEFINER + pinned search_path; idempotent via `create or replace`.
-- =====================================================================

create or replace function corrigir_laudo(laudo_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_old    laudos%rowtype;
  v_new_id uuid;
begin
  perform _assert_laudo_eng();

  select * into v_old from laudos where id = laudo_id;
  if not found then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;

  -- Only a signed report can be corrected (US22 sad path).
  if v_old.status <> 'assinado' then
    raise exception 'LAUDO_NAO_ASSINADO';
  end if;

  -- New version: same identity, incremented versao, references the previous one,
  -- fresh rascunho (PDFs/signatures cleared for regeneration + re-signing).
  insert into laudos (
    cliente_id, obra_id, tipo_laudo, numero, versao, substitui_laudo_id,
    codigo_verificacao, status, criado_por
  )
  values (
    v_old.cliente_id,
    v_old.obra_id,
    v_old.tipo_laudo,
    v_old.numero,
    v_old.versao + 1,
    v_old.id,
    replace(gen_random_uuid()::text, '-', ''),
    'rascunho',
    v_uid
  )
  returning id into v_new_id;

  -- Carry the same NFs into the corrected version. The source column is aliased
  -- and qualified (lc.laudo_id) so it is never ambiguous with the `laudo_id`
  -- function parameter under plpgsql's default variable_conflict = error.
  insert into laudo_concretagens (laudo_id, concretagem_id)
  select v_new_id, lc.concretagem_id
  from laudo_concretagens lc
  where lc.laudo_id = v_old.id
  on conflict do nothing;

  -- Preserve the previous version (retained + auditable).
  update laudos set status = 'substituido' where id = v_old.id;

  return jsonb_build_object(
    'id', v_new_id,
    'versao', v_old.versao + 1,
    'substitui_laudo_id', v_old.id,
    'status', 'rascunho'
  );
end;
$$;

revoke execute on function corrigir_laudo(uuid) from public, anon;
grant execute on function corrigir_laudo(uuid) to authenticated, service_role;
