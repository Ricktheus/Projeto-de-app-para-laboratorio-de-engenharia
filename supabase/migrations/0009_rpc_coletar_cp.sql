-- =====================================================================
-- Migration 0009 — RPC coletar_cp (F-S005-4)
-- =====================================================================
-- Collects a specimen scanned by QR (US06). Applies the CP state guard
-- server-side (SPEC §4.6: "CP deve estar moldado; grava coletado_por/em") —
-- the client never UPDATEs `status` directly (SOLID: the rule lives in the
-- domain/RPC). Mirrors the shared CP state machine (moldado -> coletado).
--
-- The SPEC's umbrella error `CP_ESTADO_INVALIDO` is refined into three
-- distinct machine tokens so the scanner can render the EXACT F-S005-4 copy:
--   * no row               -> raise 'CP_NAO_ENCONTRADO'  ("CP não encontrado.")
--   * already collected    -> raise 'CP_JA_COLETADO'     ("CP já coletado.", no-op)
--   * any other state       -> raise 'CP_NAO_COLETAVEL' + DETAIL = current status
--                             ("Este CP não pode ser coletado (status atual: {status}).")
-- The shared mapper `messageForColetarCpError` resolves the token (+ DETAIL)
-- to the Portuguese string.
--
-- `coleta_atrasada` (US05-CA2) is derived here — the authoritative value — as
-- collection strictly more than 24h after molding (created_at is the molding
-- instant). It never blocks the collection; it only flags the laudo caveat.
--
-- SECURITY DEFINER + pinned search_path (consistent with 0003/0007). Idempotent
-- via `create or replace`. The UPDATE fires the existing trg_audit trigger
-- (migration 0004), recording old/new and the acting auth.uid().
-- =====================================================================

create or replace function coletar_cp(cp_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid    uuid       := auth.uid();
  v_role   user_role  := current_role_name();
  v_cp     corpos_prova%rowtype;
  v_late   boolean;
begin
  -- ----- RBAC guard: only the field partner or the lab engineer collect
  -- (SPEC §4.5: corpos_prova "coletar: socio/eng_lab").
  if v_role is null or v_role not in ('socio_campo', 'eng_lab') then
    raise exception 'Sem permissao para coletar CP.'
      using errcode = 'insufficient_privilege'; -- 42501 -> 403
  end if;

  -- ----- Locate the specimen from the QR payload.
  select * into v_cp from corpos_prova where id = cp_id;
  if not found then
    raise exception 'CP_NAO_ENCONTRADO';
  end if;

  -- ----- Already collected: no-op signal (changes nothing).
  if v_cp.status = 'coletado' then
    raise exception 'CP_JA_COLETADO';
  end if;

  -- ----- Any non-moldado state (rompido/descartado/expurgado) cannot be
  -- collected; the current status travels in DETAIL for the UI message.
  if v_cp.status <> 'moldado' then
    raise exception 'CP_NAO_COLETAVEL' using detail = v_cp.status::text;
  end if;

  -- ----- moldado -> coletado. coleta_atrasada = collected > 24h after molding.
  v_late := (now() - v_cp.created_at) > interval '24 hours';

  update corpos_prova
     set status          = 'coletado',
         coletado_por    = v_uid,
         coletado_em     = now(),
         coleta_atrasada = v_late
   where id = cp_id;

  return jsonb_build_object(
    'id', v_cp.id,
    'codigo_rastreio', v_cp.codigo_rastreio,
    'status', 'coletado',
    'coleta_atrasada', v_late
  );
end;
$$;

-- Signed-in users only; the internal-role guard above is the real authorization.
revoke execute on function coletar_cp(uuid) from public, anon;
grant execute on function coletar_cp(uuid) to authenticated, service_role;
