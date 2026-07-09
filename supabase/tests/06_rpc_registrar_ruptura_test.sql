-- =====================================================================
-- pgTAP — RPC registrar_ruptura (F-S006-2 / F-S006-3) + rupturas RLS
-- =====================================================================
-- Verifies the press flow (US08/US09): the authoritative MPa from the NOMINAL
-- diameter (23562 kgf, mold 100 -> area 7853.98 mm², 29.42 MPa; and 21977 ->
-- 27.44), the coletado->rompido transition with executado_por, the created
-- draft laudo (reused across ruptures of the same NF), the mandatorio-28d block
-- with the age|date DETAIL, the CP_ESTADO_INVALIDO / CARGA_INVALIDA sad paths,
-- the audit trail, the eng_lab RBAC boundary and rupturas RLS.
-- Run with: pg_prove -d <db> supabase/tests/06_rpc_registrar_ruptura_test.sql
-- =====================================================================
begin;
select plan(23);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c6666666-6666-6666-6666-666666666666', 'Cliente Prensa');

insert into auth.users (id, email, raw_app_meta_data) values
  ('e6666666-6666-6666-6666-666666666666', 'englab6@lab.test', '{"role":"eng_lab","is_admin":true}'),
  ('56666666-6666-6666-6666-666666666666', 'socio6@lab.test',  '{"role":"socio_campo"}'),
  ('16666666-6666-6666-6666-666666666666', 'cli6@cli.test',
     '{"role":"cliente","cliente_id":"c6666666-6666-6666-6666-666666666666"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b6666666-6666-6666-6666-666666666666', 'c6666666-6666-6666-6666-666666666666',
   'Obra Prensa', 'OBRA-P', '56666666-6666-6666-6666-666666666666');

insert into concretagens
  (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3,
   diametro_nominal_mm, altura_nominal_mm, cadastrado_por)
values ('d6666666-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666',
        current_date - 28, 'NF-P', 30, 8, 100, 200, '56666666-6666-6666-6666-666666666666');

insert into corpos_prova
  (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias,
   data_ruptura_planejada, status, mandatorio_28d)
values
  -- coletado, due today -> main MPa vector (23562 -> 29.42)
  ('c6a10001-0000-0000-0000-000000000001', 'd6666666-6666-6666-6666-666666666666',
   'CP-PRENSA-A', current_date - 28, 28, current_date, 'coletado', false),
  -- coletado, mandatorio, FUTURE planned date -> early-rupture block
  ('c6a20002-0000-0000-0000-000000000002', 'd6666666-6666-6666-6666-666666666666',
   'CP-PRENSA-B', current_date, 28, current_date + 10, 'coletado', true),
  -- moldado (not collected) -> CP_ESTADO_INVALIDO
  ('c6a30003-0000-0000-0000-000000000003', 'd6666666-6666-6666-6666-666666666666',
   'CP-PRENSA-C', current_date, 7, current_date + 7, 'moldado', false),
  -- coletado, due -> draft-laudo reuse (21977 -> 27.44)
  ('c6a40004-0000-0000-0000-000000000004', 'd6666666-6666-6666-6666-666666666666',
   'CP-PRENSA-D', current_date - 7, 7, current_date, 'coletado', false),
  -- coletado, due -> CARGA_INVALIDA / RBAC (stays coletado)
  ('c6a50005-0000-0000-0000-000000000005', 'd6666666-6666-6666-6666-666666666666',
   'CP-PRENSA-E', current_date - 7, 7, current_date, 'coletado', false);

-- Helper capturing the PG_EXCEPTION_DETAIL of a registrar_ruptura call.
create or replace function _registrar_ruptura_detail(p_id uuid) returns text
  language plpgsql as $$
declare v_detail text;
begin
  begin
    perform registrar_ruptura(p_id,
      '{"carga_ruptura_kgf":20000,"tipo_fratura":"ruptura_total"}'::jsonb);
  exception when others then
    get stacked diagnostics v_detail = pg_exception_detail;
    return v_detail;
  end;
  return null;
end;
$$;

-- ===================== happy path: eng_lab registers a rupture =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e6666666-6666-6666-6666-666666666666"}', true);

create temp table _r as
  select registrar_ruptura('c6a10001-0000-0000-0000-000000000001',
    '{"peso_g":3820,"diametro_mm":100.2,"altura_mm":200.1,"carga_ruptura_kgf":23562,"tipo_fratura":"ruptura_cisalhamento"}'::jsonb) as j;

select is((select j ->> 'mpa_calculado' from _r), '29.42',
  'MPa 29.42 (mold 100, carga 23562) — US08-CA1');
select is((select j ->> 'area_mm2' from _r), '7853.98',
  'area nominal 7853.98 mm²');
select is((select j ->> 'cp_status' from _r), 'rompido',
  'RPC retorna cp_status rompido');
select ok((select (j ->> 'laudo_rascunho_id') is not null from _r),
  'RPC retorna o id do rascunho de laudo');

reset role;
select is(
  (select status::text from corpos_prova where id = 'c6a10001-0000-0000-0000-000000000001'),
  'rompido', 'CP coletado -> rompido (US08-CA3)');
select is(
  (select mpa_calculado::text from rupturas where corpo_prova_id = 'c6a10001-0000-0000-0000-000000000001'),
  '29.42', 'ruptura grava mpa_calculado 29.42');
select is(
  (select executado_por from rupturas where corpo_prova_id = 'c6a10001-0000-0000-0000-000000000001'),
  'e6666666-6666-6666-6666-666666666666'::uuid, 'grava executado_por = auth.uid()');
select is(
  (select carga_ruptura_kgf::text from rupturas where corpo_prova_id = 'c6a10001-0000-0000-0000-000000000001'),
  '23562', 'grava carga em KGF inteiro');
select is(
  (select diametro_nominal_mm::text from rupturas where corpo_prova_id = 'c6a10001-0000-0000-0000-000000000001'),
  '100.0', 'usa diametro NOMINAL (nao o medido 100.2)');
select is(
  (select tipo_fratura::text from rupturas where corpo_prova_id = 'c6a10001-0000-0000-0000-000000000001'),
  'ruptura_cisalhamento', 'grava tipo_fratura (US09)');

-- draft laudo created for the concretagem (rascunho, final_28d).
select is(
  (select count(*)::int from laudos l
     join laudo_concretagens lc on lc.laudo_id = l.id
    where lc.concretagem_id = 'd6666666-6666-6666-6666-666666666666'
      and l.status = 'rascunho' and l.tipo_laudo = 'final_28d'),
  1, 'cria rascunho de laudo (final_28d) da concretagem — US08-CA3');

-- audit trail (F-S001-3 pattern).
select is(
  (select count(*)::int from audit_log
     where table_name = 'corpos_prova' and action = 'UPDATE'
       and record_id = 'c6a10001-0000-0000-0000-000000000001'
       and old_value ->> 'status' = 'coletado' and new_value ->> 'status' = 'rompido'),
  1, 'auditoria registra coletado -> rompido');
select ok(
  (select count(*) from audit_log
     where table_name = 'rupturas' and action = 'INSERT'
       and record_id = (select id from rupturas
                          where corpo_prova_id = 'c6a10001-0000-0000-0000-000000000001')) >= 1,
  'auditoria registra o INSERT da ruptura');

-- ===================== draft laudo reused across ruptures of the same NF =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e6666666-6666-6666-6666-666666666666"}', true);
create temp table _r2 as
  select registrar_ruptura('c6a40004-0000-0000-0000-000000000004',
    '{"carga_ruptura_kgf":21977,"tipo_fratura":"ruptura_total"}'::jsonb) as j;
select is((select j ->> 'mpa_calculado' from _r2), '27.44',
  'segundo vetor 21977 -> 27.44 MPa');
select is(
  (select j ->> 'laudo_rascunho_id' from _r2),
  (select j ->> 'laudo_rascunho_id' from _r),
  'reutiliza o mesmo rascunho de laudo (1 laudo por NF)');

-- ===================== sad paths =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e6666666-6666-6666-6666-666666666666"}', true);

-- mandatorio 28d antes da idade -> bloqueado + DETAIL 'idade|data'
select throws_ok(
  $$ select registrar_ruptura('c6a20002-0000-0000-0000-000000000002',
       '{"carga_ruptura_kgf":20000,"tipo_fratura":"ruptura_total"}'::jsonb) $$,
  'P0001', 'CP_MANDATORIO_28D', 'CP mandatorio antes da idade -> bloqueado (US08-CA4)');
select is(
  _registrar_ruptura_detail('c6a20002-0000-0000-0000-000000000002'),
  '28|' || (current_date + 10)::text,
  'CP_MANDATORIO_28D carrega idade|data no DETAIL');

-- CP nao coletado -> CP_ESTADO_INVALIDO
select throws_ok(
  $$ select registrar_ruptura('c6a30003-0000-0000-0000-000000000003',
       '{"carga_ruptura_kgf":20000,"tipo_fratura":"ruptura_total"}'::jsonb) $$,
  'P0001', 'CP_ESTADO_INVALIDO', 'CP moldado (nao coletado) -> CP_ESTADO_INVALIDO');

-- carga <= 0 -> CARGA_INVALIDA
select throws_ok(
  $$ select registrar_ruptura('c6a50005-0000-0000-0000-000000000005',
       '{"carga_ruptura_kgf":0,"tipo_fratura":"ruptura_total"}'::jsonb) $$,
  'P0001', 'CARGA_INVALIDA', 'carga <= 0 -> CARGA_INVALIDA');

-- CP ja rompido nao rompe de novo (idempotencia da guarda de estado)
select throws_ok(
  $$ select registrar_ruptura('c6a10001-0000-0000-0000-000000000001',
       '{"carga_ruptura_kgf":23562,"tipo_fratura":"ruptura_total"}'::jsonb) $$,
  'P0001', 'CP_ESTADO_INVALIDO', 'CP ja rompido -> CP_ESTADO_INVALIDO');

-- ===================== RBAC: socio_campo NAO registra ruptura =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"56666666-6666-6666-6666-666666666666"}', true);
select throws_ok(
  $$ select registrar_ruptura('c6a50005-0000-0000-0000-000000000005',
       '{"carga_ruptura_kgf":23562,"tipo_fratura":"ruptura_total"}'::jsonb) $$,
  '42501', NULL, 'socio_campo NAO registra ruptura (DENIED)');

-- ===================== rupturas RLS (1 permitido + 1 negado) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e6666666-6666-6666-6666-666666666666"}', true);
select ok((select count(*) from rupturas) >= 2, 'eng_lab VE rupturas (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"16666666-6666-6666-6666-666666666666"}', true);
select is((select count(*)::int from rupturas), 0, 'cliente NAO ve rupturas (DENIED)');

select * from finish();
rollback;
