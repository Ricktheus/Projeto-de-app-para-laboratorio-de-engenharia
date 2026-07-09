-- =====================================================================
-- Migration 0018 — Post-S010 security & data-integrity hardening
-- =====================================================================
-- Closes the findings of AUDITORIA_POS_S008.md against the full S001–S010
-- codebase. Every statement is idempotent and forward-only (no existing
-- migration is edited). Grouped by finding:
--
--   C1  — privilege escalation via self-signup + user_metadata role/is_admin.
--   C3  — audit trail loses the actor on service_role writes (laudo publish /
--         PDF registration): route those transitions through user-JWT RPCs.
--   C2  — a signed PDF could be overwritten before the state was checked:
--         the publish transition is now an atomic, guarded RPC (+ integrity hash).
--   C4  — no flow assigned the definitive laudo number: add definir_numero_laudo
--         and forbid publishing a PDF while the number is still a placeholder.
--   H1  — the FOR ALL policies let an engineer bypass the state machine via a
--         direct PATCH: a CHECK (assinado ⇒ pdf_assinado_url) + an immutable
--         rupture-result trigger reinstate the invariants at the DB layer.
--   H3  — corrigir_laudo had no row lock and no uniqueness on the version chain:
--         SELECT … FOR UPDATE + a partial unique index make corrections
--         deterministic (a parent can be superseded exactly once).
--   M1  — registrar_ruptura now rounds the load (KGF is integer) BEFORE the MPa
--         computation, matching the canonical calcMpa in packages/shared.
--   M5  — evidence photos are immutable: drop the evidencias UPDATE policy.
-- =====================================================================

-- =====================================================================
-- C1 — Harden auth provisioning: never trust USER-controllable metadata.
-- =====================================================================
-- `raw_user_meta_data` is fully controlled by the signer at signUp(), so trusting
-- it for role/is_admin let anyone self-provision as an admin engineer. Roles now
-- come from `raw_app_meta_data` (a SERVER-only channel the Admin API writes and
-- signUp() cannot touch); `raw_user_meta_data` is used ONLY for the display name.
-- Public signup is additionally disabled (supabase/config.toml) so the sole way
-- to create a user is the admin function `admin-provisionar-usuario`, which sets
-- the app_metadata + the authoritative usuarios row under service_role.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_role     user_role;
  v_is_admin boolean;
  v_cliente  uuid;
  v_app      jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_user     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Role / is_admin / cliente_id are read ONLY from app_metadata (server-only).
  v_role := coalesce(nullif(v_app ->> 'role', '')::user_role, 'cliente');
  v_is_admin := coalesce((v_app ->> 'is_admin')::boolean, false);
  v_cliente := case
    when v_role = 'cliente' then nullif(v_app ->> 'cliente_id', '')::uuid
    else null
  end;

  -- The display name is non-privileged: user_metadata is acceptable here.
  insert into usuarios (id, nome, email, role, is_admin, cliente_id)
  values (
    new.id,
    coalesce(
      nullif(v_user ->> 'nome', ''),
      nullif(v_user ->> 'name', ''),
      nullif(v_app ->> 'nome', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    v_role,
    v_is_admin,
    v_cliente
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- =====================================================================
-- C1 / M2 — integrity hash column for the signed PDF (also used by C2).
-- =====================================================================
alter table laudos add column if not exists pdf_assinado_sha256 text;

-- =====================================================================
-- H1 — DB-level invariant: a report can only be `assinado` with a signed PDF.
-- =====================================================================
-- The laudos_eng_all policy is FOR ALL, so an engineer could PATCH status
-- directly to 'assinado' without a PDF, bypassing the upload flow. This CHECK
-- reinstates the state-machine guard at the table level. Fresh DBs have no
-- assinado rows at migration time; the pgTAP fixtures that fabricate an
-- 'assinado' laudo now carry a pdf_assinado_url (tests updated in lockstep).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_laudo_assinado_requires_pdf'
  ) then
    alter table laudos
      add constraint chk_laudo_assinado_requires_pdf
      check (status <> 'assinado' or pdf_assinado_url is not null);
  end if;
end;
$$;

-- =====================================================================
-- H1 — Rupture results are immutable once recorded.
-- =====================================================================
-- The FOR ALL rupt_write policy would let an engineer rewrite an emitted
-- mpa_calculado / carga_ruptura_kgf via a direct PATCH. Those are the legal
-- record of the compression test — only `expurgar_resultado` (which touches
-- motivo_expurgo, never the numbers) may alter a rupture after insertion.
create or replace function prevent_rupture_result_mutation() returns trigger
  language plpgsql as $$
begin
  if new.mpa_calculado is distinct from old.mpa_calculado
     or new.carga_ruptura_kgf is distinct from old.carga_ruptura_kgf
     or new.diametro_nominal_mm is distinct from old.diametro_nominal_mm then
    raise exception
      'Resultado de ruptura e imutavel (mpa/carga/diametro nominal nao podem ser alterados).'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_rupture_result_mutation on rupturas;
create trigger trg_prevent_rupture_result_mutation
  before update on rupturas
  for each row execute function prevent_rupture_result_mutation();

-- =====================================================================
-- H3 — Deterministic laudo correction (row lock + one-successor invariant).
-- =====================================================================
-- A parent version may be superseded by exactly ONE successor; without this,
-- two concurrent corrigir_laudo calls create two "v2" rows and the public page's
-- version resolver (validar-laudo walks substitui_laudo_id with .maybeSingle())
-- becomes ambiguous / throws.
create unique index if not exists uq_laudos_substitui
  on laudos (substitui_laudo_id)
  where substitui_laudo_id is not null;

-- Re-create corrigir_laudo with SELECT … FOR UPDATE so concurrent corrections
-- serialize on the parent row (body otherwise identical to migration 0016).
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

  -- Lock the parent so a concurrent correction cannot also read it as `assinado`.
  select * into v_old from laudos where id = laudo_id for update;
  if not found then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;

  if v_old.status <> 'assinado' then
    raise exception 'LAUDO_NAO_ASSINADO';
  end if;

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

  insert into laudo_concretagens (laudo_id, concretagem_id)
  select v_new_id, lc.concretagem_id
  from laudo_concretagens lc
  where lc.laudo_id = v_old.id
  on conflict do nothing;

  update laudos set status = 'substituido' where id = v_old.id;

  return jsonb_build_object(
    'id', v_new_id,
    'versao', v_old.versao + 1,
    'substitui_laudo_id', v_old.id,
    'status', 'rascunho'
  );
end;
$$;

-- =====================================================================
-- C4 — Assign the definitive laudo number (PRD §2.3).
-- =====================================================================
-- Drafts are born with a "RASCUNHO {SIGLA} NF {n}" placeholder; the engineer must
-- set the real controlled number (N°003AGEHAB / CT001-T2-CP1) before the PDF can
-- be generated. Guards: engineer-only, laudo not yet signed, number non-empty and
-- not a placeholder, unique per client among live (non-substituído) reports.
create or replace function definir_numero_laudo(laudo_id uuid, numero text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_laudo  laudos%rowtype;
  v_numero text := btrim(numero);
begin
  perform _assert_laudo_eng();

  if v_numero = '' or v_numero ilike 'RASCUNHO%' then
    raise exception 'NUMERO_INVALIDO';
  end if;

  select * into v_laudo from laudos where id = laudo_id for update;
  if not found then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;
  -- Only editable while the report is not yet published/superseded.
  if v_laudo.status not in ('rascunho', 'pronto_assinatura') then
    raise exception 'LAUDO_NAO_EDITAVEL';
  end if;

  -- Unique per client among live versions (ignore the report itself + superseded).
  if exists (
    select 1 from laudos l
    where l.cliente_id = v_laudo.cliente_id
      and l.numero = v_numero
      and l.id <> laudo_id
      and l.status <> 'substituido'
  ) then
    raise exception 'NUMERO_DUPLICADO';
  end if;

  update laudos set numero = v_numero where id = laudo_id;

  return jsonb_build_object('id', laudo_id, 'numero', v_numero);
end;
$$;

revoke execute on function definir_numero_laudo(uuid, text) from public, anon;
grant execute on function definir_numero_laudo(uuid, text) to authenticated, service_role;

-- =====================================================================
-- C2 / C3 / M2 — Publish the signed laudo through an auditable, guarded RPC.
-- =====================================================================
-- The `upload-laudo-assinado` Edge Function used to write status='assinado' with
-- service_role, so audit_log recorded a NULL actor and the guard raced the upload.
-- The transition now lives here: called with the engineer's JWT (auth.uid() is the
-- real actor, captured by trg_audit), it re-checks the state under a row lock, so
-- a laudo already `assinado` cannot be re-published (protecting the stored PDF).
-- data_emissao is preserved if already set (M2).
create or replace function publicar_laudo_assinado(
  laudo_id            uuid,
  pdf_assinado_url    text,
  assinatura_elaborador_url text default null,
  pdf_sha256          text default null
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_laudo laudos%rowtype;
begin
  perform _assert_laudo_eng();

  if pdf_assinado_url is null or btrim(pdf_assinado_url) = '' then
    raise exception 'SEM_PDF_ASSINADO';
  end if;

  select * into v_laudo from laudos where id = laudo_id for update;
  if not found then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;
  if v_laudo.status <> 'pronto_assinatura' then
    raise exception 'LAUDO_NAO_PUBLICAVEL';
  end if;

  -- RHS parameters are function-qualified so they are never ambiguous with the
  -- like-named columns (plpgsql variable_conflict = error otherwise).
  update laudos set
    status = 'assinado',
    pdf_assinado_url = publicar_laudo_assinado.pdf_assinado_url,
    assinatura_rt_url = publicar_laudo_assinado.pdf_assinado_url,
    assinatura_elaborador_url = publicar_laudo_assinado.assinatura_elaborador_url,
    pdf_assinado_sha256 = publicar_laudo_assinado.pdf_sha256,
    data_emissao = coalesce(data_emissao, current_date)
  where id = laudo_id;

  return jsonb_build_object('id', laudo_id, 'status', 'assinado');
end;
$$;

revoke execute on function publicar_laudo_assinado(uuid, text, text, text) from public, anon;
grant execute on function publicar_laudo_assinado(uuid, text, text, text) to authenticated, service_role;

-- =====================================================================
-- C3 — Register the generated (unsigned) PDF through a user-JWT RPC.
-- =====================================================================
-- Same rationale as the publish RPC: gerar-laudo-pdf wrote pdf_original_url +
-- codigo_verificacao under service_role (NULL actor). This records the engineer.
create or replace function registrar_pdf_laudo(
  laudo_id           uuid,
  pdf_original_url   text,
  codigo_verificacao text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_laudo laudos%rowtype;
begin
  perform _assert_laudo_eng();

  select * into v_laudo from laudos where id = laudo_id for update;
  if not found then
    raise exception 'LAUDO_NAO_ENCONTRADO';
  end if;
  if v_laudo.status <> 'pronto_assinatura' then
    raise exception 'LAUDO_NAO_PRONTO';
  end if;

  update laudos set
    pdf_original_url = registrar_pdf_laudo.pdf_original_url,
    codigo_verificacao = registrar_pdf_laudo.codigo_verificacao
  where id = laudo_id;

  return jsonb_build_object('id', laudo_id, 'pdf_original_url', pdf_original_url);
end;
$$;

revoke execute on function registrar_pdf_laudo(uuid, text, text) from public, anon;
grant execute on function registrar_pdf_laudo(uuid, text, text) to authenticated, service_role;

-- =====================================================================
-- M1 — registrar_ruptura: round the load before computing MPa.
-- =====================================================================
-- KGF is an integer (PRD §7.3); the canonical calcMpa rounds the load first.
-- The RPC used the raw numeric, so a fractional kgf could diverge ±0.01 MPa from
-- the client preview. Body identical to 0010 except `v_carga := round(v_carga)`.
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
  if v_role is null or v_role <> 'eng_lab' then
    raise exception 'Sem permissao para registrar ruptura.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_cp from corpos_prova where id = cp_id;
  if not found then
    raise exception 'CP_NAO_ENCONTRADO';
  end if;

  if v_cp.status <> 'coletado' then
    raise exception 'CP_ESTADO_INVALIDO';
  end if;

  if v_cp.mandatorio_28d and current_date < v_cp.data_ruptura_planejada then
    raise exception 'CP_MANDATORIO_28D'
      using detail = v_cp.idade_alvo_dias::text || '|' || v_cp.data_ruptura_planejada::text;
  end if;

  v_carga := (dados ->> 'carga_ruptura_kgf')::numeric;
  if v_carga is null or v_carga <= 0 then
    raise exception 'CARGA_INVALIDA';
  end if;
  -- KGF is a whole number; round before the area/MPa math (mirrors calcMpa).
  v_carga := round(v_carga);

  select * into v_conc from concretagens where id = v_cp.concretagem_id;
  select * into v_obra from obras where id = v_conc.obra_id;
  v_dnom := v_conc.diametro_nominal_mm;

  v_area_full := pi() * power(v_dnom, 2) / 4.0;
  v_area := round(v_area_full::numeric, 2);
  v_mpa  := round((v_carga::double precision * 9.80665 / v_area_full)::numeric, 2);

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
    v_carga,
    v_mpa,
    (dados ->> 'tipo_fratura')::tipo_fratura,
    v_uid
  )
  returning id into v_ruptura_id;

  update corpos_prova set status = 'rompido' where id = v_cp.id;

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

revoke execute on function registrar_ruptura(uuid, jsonb) from public, anon;
grant execute on function registrar_ruptura(uuid, jsonb) to authenticated, service_role;

-- =====================================================================
-- M5 — Evidence photos are immutable (no overwrite of the technical annex).
-- =====================================================================
-- The evidence object paths already carry a timestamp; dropping the UPDATE policy
-- makes stored evidence write-once (retention/anti-tamper). Uploads (insert) and
-- eng-only reads (select) stay as defined in 0012.
drop policy if exists evidencias_eng_update on storage.objects;

-- =====================================================================
-- H2 — Per-user daily OCR ceiling (configurable, consumed by ocr-nota-fiscal).
-- =====================================================================
insert into app_settings (key, value) values
  ('ocr_user_daily_max', '50'::jsonb)
on conflict (key) do nothing;
