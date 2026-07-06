-- =====================================================================
-- Migration 0011 — RPCs descartar_cp & expurgar_resultado (F-S006-4)
-- =====================================================================
-- The two eng_lab discard/purge transitions of the CP state machine
-- (US10), applied server-side (SPEC §4.6). The client never UPDATEs `status`.
--
--   descartar_cp:        moldado | coletado -> descartado   (CP damaged)
--   expurgar_resultado:  rompido             -> expurgado    (result out of avg)
--
-- Shared guards (mirror packages/shared canTransitionCp):
--   * caller must be eng_lab (SPEC §4.5: "descartar/expurgar após coleta:
--     eng_lab"; F-S006-4 "apenas eng_lab"), else 42501 -> 403;
--   * `motivo` is mandatory -> raise 'MOTIVO_OBRIGATORIO'
--       ("Informe o motivo do descarte/expurgo.", blocks — US10 edge case);
--   * CP must exist -> 'CP_NAO_ENCONTRADO'; wrong state -> 'CP_ESTADO_INVALIDO'.
--
-- The reason is written to `corpos_prova.motivo_descarte` (the column the SPEC
-- marks "obrigatório em descarte/expurgo"), so the existing trg_audit trigger
-- records the `motivo` in audit_log (US10-CA4). For a purge the reason is also
-- copied to `rupturas.motivo_expurgo` (its semantic home), which additionally
-- audits the rupture row.
--
-- SECURITY DEFINER + pinned search_path; idempotent via `create or replace`.
-- =====================================================================

-- ---------- Shared eng_lab + motivo guard (private helper) ----------
create or replace function _assert_descarte_guard(p_motivo text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if current_role_name() is null or current_role_name() <> 'eng_lab' then
    raise exception 'Sem permissao para descartar/expurgar.'
      using errcode = 'insufficient_privilege'; -- 42501 -> 403
  end if;
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'MOTIVO_OBRIGATORIO';
  end if;
end;
$$;

revoke execute on function _assert_descarte_guard(text) from public, anon;

-- ---------- descartar_cp: moldado | coletado -> descartado ----------
create or replace function descartar_cp(cp_id uuid, motivo text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cp corpos_prova%rowtype;
begin
  perform _assert_descarte_guard(motivo);

  select * into v_cp from corpos_prova where id = cp_id;
  if not found then
    raise exception 'CP_NAO_ENCONTRADO';
  end if;

  -- Only a specimen that has NOT been broken yet can be discarded.
  if v_cp.status not in ('moldado', 'coletado') then
    raise exception 'CP_ESTADO_INVALIDO' using detail = v_cp.status::text;
  end if;

  update corpos_prova
     set status = 'descartado', motivo_descarte = btrim(motivo)
   where id = cp_id;

  return jsonb_build_object('id', v_cp.id, 'status', 'descartado', 'motivo', btrim(motivo));
end;
$$;

revoke execute on function descartar_cp(uuid, text) from public, anon;
grant execute on function descartar_cp(uuid, text) to authenticated, service_role;

-- ---------- expurgar_resultado: rompido -> expurgado ----------
create or replace function expurgar_resultado(cp_id uuid, motivo text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cp corpos_prova%rowtype;
begin
  perform _assert_descarte_guard(motivo);

  select * into v_cp from corpos_prova where id = cp_id;
  if not found then
    raise exception 'CP_NAO_ENCONTRADO';
  end if;

  -- Only a broken specimen carries a result that can be purged from the average.
  if v_cp.status <> 'rompido' then
    raise exception 'CP_ESTADO_INVALIDO' using detail = v_cp.status::text;
  end if;

  -- Reason on the CP (audited via motivo_descarte) and on its rupture result.
  update corpos_prova
     set status = 'expurgado', motivo_descarte = btrim(motivo)
   where id = cp_id;
  update rupturas
     set motivo_expurgo = btrim(motivo)
   where corpo_prova_id = cp_id;

  return jsonb_build_object('id', v_cp.id, 'status', 'expurgado', 'motivo', btrim(motivo));
end;
$$;

revoke execute on function expurgar_resultado(uuid, text) from public, anon;
grant execute on function expurgar_resultado(uuid, text) to authenticated, service_role;
