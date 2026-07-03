-- =====================================================================
-- Migration 0004 — Automatic audit trail (F-S001-3)
-- =====================================================================
-- A single generic AFTER INSERT/UPDATE/DELETE trigger writes to
-- `audit_log` for every critical table, capturing old/new snapshots, the
-- acting user (auth.uid()) and the discard/purge reason when present.
--
-- IMPLEMENTATION NOTE: the illustrative snippet in SPEC §4.4 referenced
-- `new.motivo_descarte` / `new.motivo_expurgo` / `new.id` directly. That
-- only compiles for tables that actually have those columns and breaks for
-- DELETE (where NEW is null). This robust version derives everything from
-- the `to_jsonb()` snapshots, so the SAME trigger works on all critical
-- tables and for all operations. Behaviour matches the spec's intent.
--
-- `audit_log` itself is NOT audited (would recurse) and has no writable RLS
-- policy — writes happen only here, under SECURITY DEFINER (F-S001-3 edge
-- cases: never user-editable; written only via trigger/service).
-- Idempotent.
-- =====================================================================

create or replace function audit_trigger() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_old    jsonb;
  v_new    jsonb;
  v_record uuid;
  v_motivo text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
  end if;

  v_record := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);

  -- Discard/purge reason, whichever column the table carries.
  v_motivo := coalesce(
    v_new ->> 'motivo_descarte', v_new ->> 'motivo_expurgo',
    v_old ->> 'motivo_descarte', v_old ->> 'motivo_expurgo'
  );

  insert into audit_log (user_id, action, table_name, record_id, old_value, new_value, motivo)
  values (auth.uid(), tg_op::audit_action, tg_table_name, v_record, v_old, v_new, v_motivo);

  return coalesce(new, old);
end;
$$;

-- Attach to every critical table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'concretagens', 'corpos_prova', 'rupturas',
    'laudos', 'obras', 'clientes', 'usuarios'
  ]
  loop
    execute format('drop trigger if exists trg_audit on %I', t);
    execute format(
      'create trigger trg_audit after insert or update or delete on %I '
      || 'for each row execute function audit_trigger()', t
    );
  end loop;
end;
$$;
