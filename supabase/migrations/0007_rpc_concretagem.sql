-- =====================================================================
-- Migration 0007 — RPC criar_concretagem_com_cps (F-S004-5)
-- =====================================================================
-- Creates a concretagem and its N corpos_prova in a SINGLE transaction
-- (SPEC §4.6). Business rules applied server-side (SOLID: the rule lives in
-- the domain/RPC, never in the client):
--   * caller must be an internal role (socio_campo | eng_lab | eng_escritorio),
--     otherwise 42501 → PostgREST 403 "Você não tem permissão…";
--   * each CP gets data_moldagem = data_concretagem and
--     data_ruptura_planejada = data_moldagem + idade_alvo_dias;
--   * the 2 CPs of the HIGHEST target ages receive mandatorio_28d = true
--     (mirrors packages/shared selectMandatory28d — single canonical rule);
--   * cadastrado_por = auth.uid().
--
-- SECURITY DEFINER + pinned search_path (consistent with 0003). Idempotent
-- via `create or replace`. Audit rows for the concretagem/CP inserts are
-- produced by the existing trg_audit triggers (migration 0004).
-- =====================================================================

create or replace function criar_concretagem_com_cps(concretagem jsonb, cps jsonb[])
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_role           user_role := current_role_name();
  v_concretagem_id uuid;
  v_data_moldagem  date;
  v_result         jsonb;
begin
  -- ----- RBAC guard: internal roles only (socio_campo / eng_lab / eng_escritorio).
  if v_role is null or v_role not in ('socio_campo', 'eng_lab', 'eng_escritorio') then
    raise exception 'Sem permissao para criar concretagem.'
      using errcode = 'insufficient_privilege'; -- 42501 → 403
  end if;

  -- ----- At least one CP is required.
  if cps is null or array_length(cps, 1) is null then
    raise exception 'Configure ao menos um corpo de prova.'
      using errcode = 'check_violation'; -- 23514 → 4xx
  end if;

  -- ----- Insert the concretagem. Slump is already stored in mm (UI converts).
  insert into concretagens (
    obra_id, data_concretagem, nf_numero, nf_foto_url,
    fck_projeto, volume_m3, concreteira,
    slump_projeto, slump_tolerancia, slump_medido,
    diametro_nominal_mm, altura_nominal_mm,
    quadra, lote, traco, placa_caminhao, lacre_caminhao, aditivo,
    cadastrado_por
  )
  values (
    (concretagem ->> 'obra_id')::uuid,
    (concretagem ->> 'data_concretagem')::date,
    concretagem ->> 'nf_numero',
    nullif(concretagem ->> 'nf_foto_url', ''),
    (concretagem ->> 'fck_projeto')::numeric,
    (concretagem ->> 'volume_m3')::numeric,
    nullif(concretagem ->> 'concreteira', ''),
    (concretagem ->> 'slump_projeto')::numeric,
    (concretagem ->> 'slump_tolerancia')::numeric,
    (concretagem ->> 'slump_medido')::numeric,
    coalesce((concretagem ->> 'diametro_nominal_mm')::numeric, 100),
    coalesce((concretagem ->> 'altura_nominal_mm')::numeric, 200),
    nullif(concretagem ->> 'quadra', ''),
    nullif(concretagem ->> 'lote', ''),
    nullif(concretagem ->> 'traco', ''),
    nullif(concretagem ->> 'placa_caminhao', ''),
    nullif(concretagem ->> 'lacre_caminhao', ''),
    nullif(concretagem ->> 'aditivo', ''),
    v_uid
  )
  returning id, data_concretagem into v_concretagem_id, v_data_moldagem;

  -- ----- Generate the N corpos_prova. The 2 highest target ages (stable on
  -- ties by input order) are the mandatory 28-day specimens.
  with cp_in as (
    select
      (elem ->> 'idade_alvo_dias')::int as idade_alvo_dias,
      ord
    from unnest(cps) with ordinality as t(elem, ord)
  ),
  ranked as (
    select
      idade_alvo_dias,
      ord,
      row_number() over (order by idade_alvo_dias desc, ord asc) as rnk
    from cp_in
  ),
  inserted as (
    insert into corpos_prova (
      concretagem_id, codigo_rastreio, data_moldagem,
      idade_alvo_dias, data_ruptura_planejada, mandatorio_28d
    )
    select
      v_concretagem_id,
      'CP-' || replace(gen_random_uuid()::text, '-', ''),
      v_data_moldagem,
      idade_alvo_dias,
      v_data_moldagem + idade_alvo_dias,
      (rnk <= 2)
    from ranked
    order by ord
    returning id, codigo_rastreio, idade_alvo_dias, data_ruptura_planejada, mandatorio_28d
  )
  select jsonb_build_object(
    'concretagem_id', v_concretagem_id,
    'corpos_prova', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'codigo_rastreio', codigo_rastreio,
        'idade_alvo_dias', idade_alvo_dias,
        'data_ruptura_planejada', data_ruptura_planejada,
        'mandatorio_28d', mandatorio_28d
      )
      order by idade_alvo_dias
    ), '[]'::jsonb)
  )
  into v_result
  from inserted;

  return v_result;
end;
$$;

-- Expose to signed-in users only; the internal-role guard above is the real
-- authorization. anon must never reach it.
revoke execute on function criar_concretagem_com_cps(jsonb, jsonb[]) from public, anon;
grant execute on function criar_concretagem_com_cps(jsonb, jsonb[]) to authenticated, service_role;
