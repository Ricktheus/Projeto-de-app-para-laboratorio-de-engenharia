-- =====================================================================
-- Migration 0014 — Laudo lifecycle RPCs (F-S007-3 / US13)
-- =====================================================================
-- The office panel's report actions, applied server-side (SPEC §4.6 / §6.2:
-- "toda transição de estado passa por RPC SECURITY DEFINER — o cliente nunca
-- faz UPDATE direto de status"). The per-NF DRAFT itself is created by
-- `registrar_ruptura` (S006); these RPCs cover what S007 adds on top:
--
--   * marcar_pronto_assinatura(laudo_id)          — rascunho -> pronto_assinatura,
--       guarded by "every covered specimen is terminal" (else CPS_PENDENTES).
--   * emitir_laudo_parcial(concretagem_id, idade) — creates/reuses a 7d|14d
--       partial draft on demand (US13-CA2).
--   * agrupar_laudo(concretagem_ids[])            — consolidated final draft over
--       several NFs of the SAME obra (US13-CA3).
--
-- RBAC: engineers only (eng_lab/eng_escritorio), mirroring the laudos_eng_all /
-- lc_eng policies (SPEC §4.5). SECURITY DEFINER bypasses RLS, so the role guard
-- is asserted explicitly. The provisional `numero`/`codigo_verificacao` are
-- placeholders for the draft; the real anti-fraud hash is assigned at PDF
-- generation (S008, SPEC §7.1) — same convention as registrar_ruptura.
--
-- Covered-age coverage mirrors packages/shared `laudoCobreIdade`: a partial
-- report covers only its own age; the final report covers every age.
--
-- SECURITY DEFINER + pinned search_path; idempotent via `create or replace`.
-- =====================================================================

-- ---------- Shared engineer-role guard (private helper) ----------
create or replace function _assert_laudo_eng()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if current_role_name() is null
     or current_role_name() not in ('eng_lab', 'eng_escritorio') then
    raise exception 'Sem permissao para gerenciar laudos.'
      using errcode = 'insufficient_privilege'; -- 42501 -> 403
  end if;
end;
$$;

revoke execute on function _assert_laudo_eng() from public, anon;

-- ---------- marcar_pronto_assinatura: rascunho -> pronto_assinatura ----------
create or replace function marcar_pronto_assinatura(laudo_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_laudo     laudos%rowtype;
  v_pendentes int;
begin
  perform _assert_laudo_eng();

  select * into v_laudo from laudos where id = laudo_id;
  if not found then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;
  if v_laudo.status <> 'rascunho' then
    raise exception 'LAUDO_NAO_RASCUNHO';
  end if;

  -- Count covered specimens still pending (non-terminal: moldado/coletado).
  -- Coverage depends on the report type (final covers all ages; a partial
  -- covers only its own age).
  select count(*)
    into v_pendentes
  from laudo_concretagens lc
  join corpos_prova cp on cp.concretagem_id = lc.concretagem_id
  where lc.laudo_id = laudo_id
    and cp.status in ('moldado', 'coletado')
    and (
      v_laudo.tipo_laudo = 'final_28d'
      or (v_laudo.tipo_laudo = 'parcial_7d'  and cp.idade_alvo_dias = 7)
      or (v_laudo.tipo_laudo = 'parcial_14d' and cp.idade_alvo_dias = 14)
    );

  if v_pendentes > 0 then
    raise exception 'CPS_PENDENTES';
  end if;

  update laudos
     set status = 'pronto_assinatura',
         data_emissao = coalesce(data_emissao, current_date)
   where id = laudo_id;

  return jsonb_build_object('id', laudo_id, 'status', 'pronto_assinatura');
end;
$$;

revoke execute on function marcar_pronto_assinatura(uuid) from public, anon;
grant execute on function marcar_pronto_assinatura(uuid) to authenticated, service_role;

-- ---------- emitir_laudo_parcial: on-demand 7d|14d partial draft ----------
create or replace function emitir_laudo_parcial(concretagem_id uuid, idade_dias int)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_conc    concretagens%rowtype;
  v_obra    obras%rowtype;
  v_tipo    laudo_tipo;
  v_validos int;
  v_laudo_id uuid;
begin
  perform _assert_laudo_eng();

  v_tipo := case idade_dias
    when 7  then 'parcial_7d'::laudo_tipo
    when 14 then 'parcial_14d'::laudo_tipo
    else null
  end;
  if v_tipo is null then
    raise exception 'IDADE_PARCIAL_INVALIDA';
  end if;

  select * into v_conc from concretagens where id = concretagem_id;
  if not found then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;
  select * into v_obra from obras where id = v_conc.obra_id;

  -- A partial report is only meaningful once there is a valid result at that age.
  select count(*)
    into v_validos
  from corpos_prova cp
  where cp.concretagem_id = concretagem_id
    and cp.idade_alvo_dias = idade_dias
    and cp.status = 'rompido';
  if v_validos = 0 then
    raise exception 'SEM_RESULTADOS';
  end if;

  -- Reuse an existing partial draft for this NF + age, else create it.
  select l.id into v_laudo_id
  from laudos l
  join laudo_concretagens lc on lc.laudo_id = l.id
  where lc.concretagem_id = concretagem_id
    and l.tipo_laudo = v_tipo
    and l.status = 'rascunho'
  limit 1;

  if v_laudo_id is null then
    insert into laudos (
      cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, criado_por
    )
    values (
      v_obra.cliente_id,
      v_obra.id,
      v_tipo,
      'RASCUNHO ' || v_obra.sigla || ' NF ' || v_conc.nf_numero || ' (' || idade_dias || 'd)',
      replace(gen_random_uuid()::text, '-', ''),
      'rascunho',
      v_uid
    )
    returning id into v_laudo_id;

    insert into laudo_concretagens (laudo_id, concretagem_id)
    values (v_laudo_id, concretagem_id)
    on conflict do nothing;
  end if;

  return jsonb_build_object('id', v_laudo_id, 'tipo_laudo', v_tipo, 'status', 'rascunho');
end;
$$;

revoke execute on function emitir_laudo_parcial(uuid, int) from public, anon;
grant execute on function emitir_laudo_parcial(uuid, int) to authenticated, service_role;

-- ---------- agrupar_laudo: consolidated final draft over NFs of one obra ----------
create or replace function agrupar_laudo(concretagem_ids uuid[])
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_selected int  := coalesce(array_length(concretagem_ids, 1), 0);
  v_found    int;
  v_obras    int;
  v_obra_id  uuid;
  v_obra     obras%rowtype;
  v_nfs      text;
  v_laudo_id uuid;
begin
  perform _assert_laudo_eng();

  if v_selected < 2 then
    raise exception 'POUCAS_CONCRETAGENS';
  end if;

  -- All selected pours must exist and belong to the SAME obra (US13-CA3).
  select count(*), count(distinct obra_id), min(obra_id)
    into v_found, v_obras, v_obra_id
  from concretagens
  where id = any(concretagem_ids);

  if v_found <> v_selected then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;
  if v_obras <> 1 then
    raise exception 'OBRAS_DIFERENTES';
  end if;

  select * into v_obra from obras where id = v_obra_id;

  select string_agg(nf_numero, '/' order by nf_numero)
    into v_nfs
  from concretagens
  where id = any(concretagem_ids);

  insert into laudos (
    cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, criado_por
  )
  values (
    v_obra.cliente_id,
    v_obra.id,
    'final_28d',
    'RASCUNHO ' || v_obra.sigla || ' NFs ' || v_nfs,
    replace(gen_random_uuid()::text, '-', ''),
    'rascunho',
    v_uid
  )
  returning id into v_laudo_id;

  insert into laudo_concretagens (laudo_id, concretagem_id)
  select v_laudo_id, unnest(concretagem_ids)
  on conflict do nothing;

  return jsonb_build_object(
    'id', v_laudo_id,
    'tipo_laudo', 'final_28d',
    'status', 'rascunho',
    'concretagens', v_selected
  );
end;
$$;

revoke execute on function agrupar_laudo(uuid[]) from public, anon;
grant execute on function agrupar_laudo(uuid[]) to authenticated, service_role;
