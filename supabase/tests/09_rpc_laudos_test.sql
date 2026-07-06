-- =====================================================================
-- pgTAP — laudo lifecycle RPCs (F-S007-3 / US13)
-- =====================================================================
-- Verifies the office-panel report actions applied server-side (SPEC §4.6):
--   * marcar_pronto_assinatura: rascunho -> pronto_assinatura when every covered
--     specimen is terminal; CPS_PENDENTES otherwise; not-found / not-rascunho
--     guards; audit trail; eng-only RBAC.
--   * emitir_laudo_parcial: creates/reuses a 7d|14d partial draft; SEM_RESULTADOS
--     when the age has no valid result; IDADE_PARCIAL_INVALIDA for other ages.
--   * agrupar_laudo: consolidated final draft over NFs of the SAME obra;
--     OBRAS_DIFERENTES / POUCAS_CONCRETAGENS guards; eng-only RBAC.
-- Run with: pg_prove -d <db> supabase/tests/09_rpc_laudos_test.sql
-- =====================================================================
begin;
select plan(20);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c7000000-0000-0000-0000-000000000001', 'Cliente Laudos');

insert into auth.users (id, email, raw_user_meta_data) values
  ('e7000000-0000-0000-0000-000000000001', 'englab7@lab.test',  '{"role":"eng_lab","is_admin":true}'),
  ('57000000-0000-0000-0000-000000000001', 'socio7@lab.test',   '{"role":"socio_campo"}'),
  ('17000000-0000-0000-0000-000000000001', 'cli7@cli.test',
     '{"role":"cliente","cliente_id":"c7000000-0000-0000-0000-000000000001"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b7000000-0000-0000-0000-0000000000aa', 'c7000000-0000-0000-0000-000000000001',
   'Obra A', 'OBRA-A', '57000000-0000-0000-0000-000000000001'),
  ('b7000000-0000-0000-0000-0000000000bb', 'c7000000-0000-0000-0000-000000000001',
   'Obra B', 'OBRA-B', '57000000-0000-0000-0000-000000000001');

insert into concretagens
  (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3,
   diametro_nominal_mm, altura_nominal_mm, cadastrado_por)
values
  ('d7000000-0000-0000-0000-000000000c01', 'b7000000-0000-0000-0000-0000000000aa',
   current_date - 28, 'NF-OK', 30, 8, 100, 200, '57000000-0000-0000-0000-000000000001'),
  ('d7000000-0000-0000-0000-000000000c02', 'b7000000-0000-0000-0000-0000000000aa',
   current_date - 28, 'NF-PD', 30, 8, 100, 200, '57000000-0000-0000-0000-000000000001'),
  ('d7000000-0000-0000-0000-000000000c03', 'b7000000-0000-0000-0000-0000000000aa',
   current_date - 28, 'NF-A2', 30, 8, 100, 200, '57000000-0000-0000-0000-000000000001'),
  ('d7000000-0000-0000-0000-000000000c04', 'b7000000-0000-0000-0000-0000000000bb',
   current_date - 28, 'NF-B1', 30, 8, 100, 200, '57000000-0000-0000-0000-000000000001');

insert into corpos_prova
  (concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada, status)
values
  -- conc OK: both ages broken -> all terminal (marcar_pronto happy; parcial 7d valid)
  ('d7000000-0000-0000-0000-000000000c01', 'CP-OK-7',  current_date - 28,  7, current_date - 21, 'rompido'),
  ('d7000000-0000-0000-0000-000000000c01', 'CP-OK-28', current_date - 28, 28, current_date,      'rompido'),
  -- conc PEND: 7d broken, 28d still collected -> pending at 28d
  ('d7000000-0000-0000-0000-000000000c02', 'CP-PD-7',  current_date - 28,  7, current_date - 21, 'rompido'),
  ('d7000000-0000-0000-0000-000000000c02', 'CP-PD-28', current_date - 28, 28, current_date,      'coletado'),
  -- conc A2 / B1: a 7d valid result each (grouping)
  ('d7000000-0000-0000-0000-000000000c03', 'CP-A2-7',  current_date - 28,  7, current_date - 21, 'rompido'),
  ('d7000000-0000-0000-0000-000000000c04', 'CP-B1-7',  current_date - 28,  7, current_date - 21, 'rompido');

insert into laudos (id, cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, criado_por)
values
  ('a7000000-0000-0000-0000-000000000101', 'c7000000-0000-0000-0000-000000000001',
   'b7000000-0000-0000-0000-0000000000aa', 'final_28d', 'RASCUNHO OBRA-A NF NF-OK',
   'code010000000000000000000000000000', 'rascunho', 'e7000000-0000-0000-0000-000000000001'),
  ('a7000000-0000-0000-0000-000000000102', 'c7000000-0000-0000-0000-000000000001',
   'b7000000-0000-0000-0000-0000000000aa', 'final_28d', 'RASCUNHO OBRA-A NF NF-PD',
   'code020000000000000000000000000000', 'rascunho', 'e7000000-0000-0000-0000-000000000001'),
  ('a7000000-0000-0000-0000-000000000103', 'c7000000-0000-0000-0000-000000000001',
   'b7000000-0000-0000-0000-0000000000aa', 'final_28d', 'RASCUNHO OBRA-A NF NF-OK v2',
   'code030000000000000000000000000000', 'pronto_assinatura', 'e7000000-0000-0000-0000-000000000001');

insert into laudo_concretagens (laudo_id, concretagem_id) values
  ('a7000000-0000-0000-0000-000000000101', 'd7000000-0000-0000-0000-000000000c01'),
  ('a7000000-0000-0000-0000-000000000102', 'd7000000-0000-0000-0000-000000000c02'),
  ('a7000000-0000-0000-0000-000000000103', 'd7000000-0000-0000-0000-000000000c01');

-- ===================== marcar_pronto_assinatura =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e7000000-0000-0000-0000-000000000001"}', true);

create temp table _m as
  select marcar_pronto_assinatura('a7000000-0000-0000-0000-000000000101') as j;
select is((select j ->> 'status' from _m), 'pronto_assinatura',
  'marcar_pronto retorna status pronto_assinatura (US13 happy)');

reset role;
select is(
  (select status::text from laudos where id = 'a7000000-0000-0000-0000-000000000101'),
  'pronto_assinatura', 'laudo rascunho -> pronto_assinatura (todos os CPs terminais)');
select ok(
  (select data_emissao is not null from laudos where id = 'a7000000-0000-0000-0000-000000000101'),
  'grava data_emissao ao marcar pronto');
select is(
  (select count(*)::int from audit_log
     where table_name = 'laudos' and action = 'UPDATE'
       and record_id = 'a7000000-0000-0000-0000-000000000101'
       and old_value ->> 'status' = 'rascunho'
       and new_value ->> 'status' = 'pronto_assinatura'),
  1, 'auditoria registra rascunho -> pronto_assinatura (old/new)');

-- sad path: CPs pendentes (28d ainda coletado) -> CPS_PENDENTES
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e7000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select marcar_pronto_assinatura('a7000000-0000-0000-0000-000000000102') $$,
  'P0001', 'CPS_PENDENTES', 'CPs pendentes -> CPS_PENDENTES (F-S007-3 sad path)');

-- laudo inexistente -> LAUDO_NAO_ENCONTRADO
select throws_ok(
  $$ select marcar_pronto_assinatura('a7000000-0000-0000-0000-0000000001ff') $$,
  'P0001', 'LAUDO_NAO_ENCONTRADO', 'laudo inexistente -> LAUDO_NAO_ENCONTRADO');

-- laudo ja pronto (nao rascunho) -> LAUDO_NAO_RASCUNHO
select throws_ok(
  $$ select marcar_pronto_assinatura('a7000000-0000-0000-0000-000000000103') $$,
  'P0001', 'LAUDO_NAO_RASCUNHO', 'laudo nao-rascunho -> LAUDO_NAO_RASCUNHO');

-- ===================== emitir_laudo_parcial =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e7000000-0000-0000-0000-000000000001"}', true);

create temp table _p1 as
  select emitir_laudo_parcial('d7000000-0000-0000-0000-000000000c01', 7) as j;
select is((select j ->> 'tipo_laudo' from _p1), 'parcial_7d',
  'emitir_laudo_parcial(7) cria rascunho parcial_7d (US13-CA2)');
select is(
  (select count(*)::int from laudos l
     join laudo_concretagens lc on lc.laudo_id = l.id
    where lc.concretagem_id = 'd7000000-0000-0000-0000-000000000c01'
      and l.tipo_laudo = 'parcial_7d' and l.status = 'rascunho'),
  1, 'existe exatamente 1 rascunho parcial_7d para a NF');

-- second call reuses the same draft (idempotente)
create temp table _p2 as
  select emitir_laudo_parcial('d7000000-0000-0000-0000-000000000c01', 7) as j;
select is((select j ->> 'id' from _p2), (select j ->> 'id' from _p1),
  'segunda chamada reutiliza o mesmo rascunho parcial (nao duplica)');

-- 14d sem resultado valido -> SEM_RESULTADOS
select throws_ok(
  $$ select emitir_laudo_parcial('d7000000-0000-0000-0000-000000000c01', 14) $$,
  'P0001', 'SEM_RESULTADOS', 'parcial 14d sem CP rompido -> SEM_RESULTADOS');

-- idade fora de {7,14} -> IDADE_PARCIAL_INVALIDA
select throws_ok(
  $$ select emitir_laudo_parcial('d7000000-0000-0000-0000-000000000c01', 28) $$,
  'P0001', 'IDADE_PARCIAL_INVALIDA', 'parcial so 7/14 dias -> IDADE_PARCIAL_INVALIDA');

-- ===================== agrupar_laudo =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e7000000-0000-0000-0000-000000000001"}', true);

create temp table _g as
  select agrupar_laudo(array[
    'd7000000-0000-0000-0000-000000000c01'::uuid,
    'd7000000-0000-0000-0000-000000000c03'::uuid
  ]) as j;
select is((select (j ->> 'concretagens')::int from _g), 2,
  'agrupar_laudo consolida 2 NFs da mesma obra (US13-CA3)');
select is((select j ->> 'tipo_laudo' from _g), 'final_28d',
  'laudo agrupado e final_28d');
select is(
  (select count(*)::int from laudo_concretagens where laudo_id = (select (j ->> 'id')::uuid from _g)),
  2, 'laudo agrupado referencia as 2 concretagens (laudo_concretagens)');

-- NFs de obras diferentes -> OBRAS_DIFERENTES
select throws_ok(
  $$ select agrupar_laudo(array[
       'd7000000-0000-0000-0000-000000000c01'::uuid,
       'd7000000-0000-0000-0000-000000000c04'::uuid]) $$,
  'P0001', 'OBRAS_DIFERENTES', 'agrupar obras diferentes -> OBRAS_DIFERENTES');

-- menos de 2 concretagens -> POUCAS_CONCRETAGENS
select throws_ok(
  $$ select agrupar_laudo(array['d7000000-0000-0000-0000-000000000c01'::uuid]) $$,
  'P0001', 'POUCAS_CONCRETAGENS', 'agrupar < 2 concretagens -> POUCAS_CONCRETAGENS');

-- ===================== RBAC: engenheiros somente =====================
-- socio_campo NAO marca pronto
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"57000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select marcar_pronto_assinatura('a7000000-0000-0000-0000-000000000102') $$,
  '42501', NULL, 'socio_campo NAO marca laudo pronto (DENIED)');
select throws_ok(
  $$ select emitir_laudo_parcial('d7000000-0000-0000-0000-000000000c03', 7) $$,
  '42501', NULL, 'socio_campo NAO emite laudo parcial (DENIED)');

-- cliente NAO agrupa laudo
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"17000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select agrupar_laudo(array[
       'd7000000-0000-0000-0000-000000000c01'::uuid,
       'd7000000-0000-0000-0000-000000000c03'::uuid]) $$,
  '42501', NULL, 'cliente NAO agrupa laudo (DENIED)');

select * from finish();
rollback;
