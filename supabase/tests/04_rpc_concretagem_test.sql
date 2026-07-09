-- =====================================================================
-- pgTAP — RPC criar_concretagem_com_cps (F-S004-5)
-- =====================================================================
-- Verifies the transactional creation of a concretagem + N corpos_prova,
-- the mandatorio_28d rule (2 highest target ages), the planned rupture
-- dates, and the RBAC guard (internal roles only; cliente denied).
-- Run with: pg_prove -d <db> supabase/tests/04_rpc_concretagem_test.sql
-- =====================================================================
begin;
select plan(9);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c1111111-1111-1111-1111-111111111111', 'Cliente A');

insert into auth.users (id, email, raw_app_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'socio@lab.test', '{"role":"socio_campo"}'),
  ('44444444-4444-4444-4444-444444444444', 'clia@cli.test',
     '{"role":"cliente","cliente_id":"c1111111-1111-1111-1111-111111111111"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
   'Obra A', 'OBRA-A', '11111111-1111-1111-1111-111111111111');

-- ---------- socio_campo creates a concretagem with 2×7d + 2×28d ----------
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select criar_concretagem_com_cps(
  '{"obra_id":"b1111111-1111-1111-1111-111111111111","data_concretagem":"2026-05-20",'
  || '"nf_numero":"NF-1","fck_projeto":30,"volume_m3":8}',
  array[
    '{"idade_alvo_dias":7}',
    '{"idade_alvo_dias":7}',
    '{"idade_alvo_dias":28}',
    '{"idade_alvo_dias":28}'
  ]::jsonb[]
);

-- Assertions run as superuser to bypass RLS.
reset role;
select is((select count(*)::int from concretagens), 1,
  'concretagem criada (1 registro)');
select is((select count(*)::int from corpos_prova), 4,
  'gera exatamente N corpos de prova (4)');
select is((select count(*)::int from corpos_prova where mandatorio_28d), 2,
  'exatamente 2 CPs recebem mandatorio_28d');
select is(
  (select bool_and(mandatorio_28d) from corpos_prova where idade_alvo_dias = 28),
  true, 'os 2 CPs de maior idade (28d) sao os mandatorios');
select is(
  (select bool_or(mandatorio_28d) from corpos_prova where idade_alvo_dias = 7),
  false, 'CPs de 7d nao sao mandatorios');
select is(
  (select max(data_ruptura_planejada) from corpos_prova),
  date '2026-06-17', 'data_ruptura_planejada (28d) = moldagem + 28 dias');
select is(
  (select min(data_ruptura_planejada) from corpos_prova),
  date '2026-05-27', 'data_ruptura_planejada (7d) = moldagem + 7 dias');

-- ---------- cliente cannot create (DENIED 403 / 42501) ----------
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
select throws_ok(
  $$ select criar_concretagem_com_cps(
       '{"obra_id":"b1111111-1111-1111-1111-111111111111","data_concretagem":"2026-05-20",'
       || '"nf_numero":"NF-9","fck_projeto":30,"volume_m3":8}',
       array['{"idade_alvo_dias":7}']::jsonb[]
     ) $$,
  '42501', NULL, 'cliente NAO pode criar concretagem (DENIED)');

-- ---------- empty CP list is rejected ----------
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select throws_ok(
  $$ select criar_concretagem_com_cps(
       '{"obra_id":"b1111111-1111-1111-1111-111111111111","data_concretagem":"2026-05-20",'
       || '"nf_numero":"NF-8","fck_projeto":30,"volume_m3":8}',
       array[]::jsonb[]
     ) $$,
  '23514', NULL, 'lista de CPs vazia e rejeitada');

select * from finish();
rollback;
