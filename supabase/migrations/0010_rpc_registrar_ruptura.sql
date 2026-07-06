-- =====================================================================
-- Migration 0010 — RPC registrar_ruptura (F-S006-2 / F-S006-3)
-- =====================================================================
-- Registers the press rupture of a specimen (US08/US09) and applies the
-- state machine server-side (SPEC §4.6 / §5.2). The client never UPDATEs
-- `status` nor trusts a client-computed MPa (SOLID: the rule lives in the
-- domain/RPC).
--
-- Guards, in order:
--   * caller must be eng_lab (SPEC §4.5 rupturas "registrar: só eng_lab"),
--     else 42501 -> PostgREST 403;
--   * CP must exist                 -> raise 'CP_NAO_ENCONTRADO';
--   * CP must be `coletado`         -> raise 'CP_ESTADO_INVALIDO'
--       (mirrors shared canRomper: only a collected specimen can be broken);
--   * a `mandatorio_28d` specimen cannot be broken before its planned age
--       -> raise 'CP_MANDATORIO_28D' with DETAIL = 'idade|data' so the UI can
--          render "Este CP de {idade}d é obrigatório … ({data}).";
--   * load must be > 0              -> raise 'CARGA_INVALIDA'.
--
-- MPa is computed HERE, authoritatively, from the NOMINAL diameter inherited
-- from the concretagem (never the measured one) — this mirrors the canonical
-- `calcMpa` in packages/shared (used client-side only for the live preview):
--
--     area  = π × d_nominal² / 4                        (full precision)
--     MPa   = (carga_kgf × 9.80665) / area              (rounded to 2 dp)
--
-- Reference vectors (mold 100, area 7853.98 mm²): 23562 kgf -> 29.42 MPa
-- (SPEC F-S006-2 / §5.2); 21977 -> 27.44; 24194 -> 30.21; 20045 -> 25.03.
--
-- Effects (US08-CA3): inserts `rupturas` (executado_por = auth.uid()), moves
-- the CP to `rompido`, and creates/reuses the concretagem's DRAFT laudo
-- (`rascunho`), returning its id. Audit rows for the ruptura insert and the CP
-- update come from the existing trg_audit triggers (migration 0004).
--
-- SECURITY DEFINER + pinned search_path (consistent with 0003/0007/0009);
-- idempotent via `create or replace`.
-- =====================================================================

create or replace function registrar_ruptura(cp_id uuid, dados jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid        uuid       := auth.uid();
  v_role       user_role  := current_role_name();
  v_cp         corpos_prova%rowtype;
  v_conc       concretagens%rowtype;
  v_obra       obras%rowtype;
  v_dnom       numeric;
  v_carga      numeric;
  v_area_full  double precision;
  v_area       numeric;
  v_mpa        numeric;
  v_ruptura_id uuid;
  v_laudo_id   uuid;
begin
  -- ----- RBAC guard: only the lab engineer runs the press (rupturas write).
  if v_role is null or v_role <> 'eng_lab' then
    raise exception 'Sem permissao para registrar ruptura.'
      using errcode = 'insufficient_privilege'; -- 42501 -> 403
  end if;

  -- ----- Locate the specimen.
  select * into v_cp from corpos_prova where id = cp_id;
  if not found then
    raise exception 'CP_NAO_ENCONTRADO';
  end if;

  -- ----- State guard: only a `coletado` specimen can be broken.
  if v_cp.status <> 'coletado' then
    raise exception 'CP_ESTADO_INVALIDO';
  end if;

  -- ----- Mandatory-28d guard: block early rupture; carry age + planned date.
  if v_cp.mandatorio_28d and current_date < v_cp.data_ruptura_planejada then
    raise exception 'CP_MANDATORIO_28D'
      using detail = v_cp.idade_alvo_dias::text || '|' || v_cp.data_ruptura_planejada::text;
  end if;

  -- ----- Load validation (mirrors calcMpa's CARGA_INVALIDA).
  v_carga := (dados ->> 'carga_ruptura_kgf')::numeric;
  if v_carga is null or v_carga <= 0 then
    raise exception 'CARGA_INVALIDA';
  end if;

  -- ----- Nominal diameter is inherited from the concretagem (never measured).
  select * into v_conc from concretagens where id = v_cp.concretagem_id;
  select * into v_obra from obras where id = v_conc.obra_id;
  v_dnom := v_conc.diametro_nominal_mm;

  -- ----- MPa from the nominal area (canonical formula; see header).
  v_area_full := pi() * power(v_dnom, 2) / 4.0;
  v_area := round(v_area_full::numeric, 2);
  v_mpa  := round((v_carga::double precision * 9.80665 / v_area_full)::numeric, 2);

  -- ----- Persist the rupture (KGF integer; measured values for traceability).
  insert into rupturas (
    corpo_prova_id, data_ruptura_real, peso_g, diametro_mm, altura_mm,
    diametro_nominal_mm, carga_ruptura_kgf, mpa_calculado, tipo_fratura,
    executado_por
  )
  values (
    v_cp.id,
    current_date,
    (dados ->> 'peso_g')::numeric,
    (dados ->> 'diametro_mm')::numeric,
    (dados ->> 'altura_mm')::numeric,
    v_dnom,
    round(v_carga),
    v_mpa,
    (dados ->> 'tipo_fratura')::tipo_fratura,
    v_uid
  )
  returning id into v_ruptura_id;

  -- ----- CP coletado -> rompido.
  update corpos_prova set status = 'rompido' where id = v_cp.id;

  -- ----- Create or reuse the concretagem's DRAFT laudo (US08-CA3). By default
  -- the report is per-NF and consolidates 7/14/28d (final_28d, SPEC S007). The
  -- number and verification code are PROVISIONAL placeholders here; the real
  -- values are assigned when the PDF is generated (S008, SPEC §7.1). [PREMISSA]
  select l.id into v_laudo_id
  from laudos l
  join laudo_concretagens lc on lc.laudo_id = l.id
  where lc.concretagem_id = v_conc.id
    and l.status = 'rascunho'
    and l.tipo_laudo = 'final_28d'
  limit 1;

  if v_laudo_id is null then
    insert into laudos (
      cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, criado_por
    )
    values (
      v_obra.cliente_id,
      v_obra.id,
      'final_28d',
      'RASCUNHO ' || v_obra.sigla || ' NF ' || v_conc.nf_numero,
      replace(gen_random_uuid()::text, '-', ''),
      'rascunho',
      v_uid
    )
    returning id into v_laudo_id;

    insert into laudo_concretagens (laudo_id, concretagem_id)
    values (v_laudo_id, v_conc.id)
    on conflict do nothing;
  else
    -- Touch the existing draft so the panel sees fresh activity.
    update laudos set updated_at = now() where id = v_laudo_id;
  end if;

  return jsonb_build_object(
    'ruptura_id', v_ruptura_id,
    'mpa_calculado', v_mpa,
    'area_mm2', v_area,
    'cp_status', 'rompido',
    'laudo_rascunho_id', v_laudo_id
  );
end;
$$;

-- Signed-in users only; the eng_lab guard above is the real authorization.
revoke execute on function registrar_ruptura(uuid, jsonb) from public, anon;
grant execute on function registrar_ruptura(uuid, jsonb) to authenticated, service_role;
