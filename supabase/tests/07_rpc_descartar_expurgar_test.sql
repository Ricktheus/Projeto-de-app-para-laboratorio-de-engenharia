-- =====================================================================
-- pgTAP — RPCs descartar_cp & expurgar_resultado (F-S006-4)
-- =====================================================================
-- Verifies the eng_lab discard/purge transitions (US10): moldado/coletado ->
-- descartado and rompido -> expurgado; the mandatory `motivo`
-- (MOTIVO_OBRIGATORIO blocks); the reason persisted on the CP and the rupture;
-- the audit_log carrying the motivo (US10-CA4); the wrong-state and RBAC
-- boundaries; and the "age fully purged" rule (US10-CA3).
-- Run with: pg_prove -d <db> supabase/tests/07_rpc_descartar_expurgar_test.sql
-- =====================================================================
begin;
select plan(15);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c7777777-7777-7777-7777-777777777777', 'Cliente Descarte');

insert into auth.users (id, email, raw_app_meta_data) values
  ('e7777777-7777-7777-7777-777777777777', 'englab7@lab.test', '{"role":"eng_lab","is_admin":true}'),
  ('57777777-7777-7777-7777-777777777777', 'socio7@lab.test',  '{"role":"socio_campo"}'),
  ('17777777-7777-7777-7777-777777777777', 'cli7@cli.test',
     '{"role":"cliente","cliente_id":"c7777777-7777-7777-7777-777777777777"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b7777777-7777-7777-7777-777777777777', 'c7777777-7777-7777-7777-777777777777',
   'Obra Descarte', 'OBRA-D', '57777777-7777-7777-7777-777777777777');

insert into concretagens
  (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3, cadastrado_por)
values ('d7777777-7777-7777-7777-777777777777', 'b7777777-7777-7777-7777-777777777777',
        current_date, 'NF-D', 30, 8, '57777777-7777-7777-7777-777777777777');

insert into corpos_prova
  (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias,
   data_ruptura_planejada, status)
values
  ('c7a10001-0000-0000-0000-000000000001', 'd7777777-7777-7777-7777-777777777777',
   'CP-DESC-M', current_date, 7, current_date + 7, 'moldado'),   -- -> descartar
  ('c7a20002-0000-0000-0000-000000000002', 'd7777777-7777-7777-7777-777777777777',
   'CP-DESC-K', current_date, 7, current_date + 7, 'coletado'),  -- -> descartar
  ('c7a30003-0000-0000-0000-000000000003', 'd7777777-7777-7777-7777-777777777777',
   'CP-DESC-R', current_date, 14, current_date + 14, 'rompido'), -- -> expurgar
  ('c7a40004-0000-0000-0000-000000000004', 'd7777777-7777-7777-7777-777777777777',
   'CP-DESC-V', current_date, 28, current_date + 28, 'rompido'); -- valid, stays

insert into rupturas
  (corpo_prova_id, diametro_nominal_mm, carga_ruptura_kgf, mpa_calculado, tipo_fratura, executado_por)
values
  ('c7a30003-0000-0000-0000-000000000003', 100, 23562, 29.42, 'ruptura_total',
   'e7777777-7777-7777-7777-777777777777'),
  ('c7a40004-0000-0000-0000-000000000004', 100, 24194, 30.21, 'ruptura_total',
   'e7777777-7777-7777-7777-777777777777');

-- ===================== eng_lab session =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e7777777-7777-7777-7777-777777777777"}', true);

-- motivo vazio bloqueia (guarda antes do estado) — CP-M continua moldado
select throws_ok(
  $$ select descartar_cp('c7a10001-0000-0000-0000-000000000001', '   ') $$,
  'P0001', 'MOTIVO_OBRIGATORIO', 'motivo vazio -> MOTIVO_OBRIGATORIO (bloqueia)');

-- descartar CP danificado antes do ensaio (moldado -> descartado) — US10-CA2
select is(
  (descartar_cp('c7a10001-0000-0000-0000-000000000001', 'Quebrou no transporte') ->> 'status'),
  'descartado', 'descartar CP moldado -> descartado (US10-CA2)');
select is(
  (descartar_cp('c7a20002-0000-0000-0000-000000000002', 'Danificado no manuseio') ->> 'status'),
  'descartado', 'descartar CP coletado -> descartado');

reset role;
select is(
  (select motivo_descarte from corpos_prova where id = 'c7a10001-0000-0000-0000-000000000001'),
  'Quebrou no transporte', 'grava motivo_descarte no CP');

-- expurgar resultado anomalo (rompido -> expurgado) — US10-CA1
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e7777777-7777-7777-7777-777777777777"}', true);
select is(
  (expurgar_resultado('c7a30003-0000-0000-0000-000000000003', 'Resultado outlier (> 2 desvios)') ->> 'status'),
  'expurgado', 'expurgar resultado rompido -> expurgado (US10-CA1)');
reset role;
select is(
  (select motivo_expurgo from rupturas where corpo_prova_id = 'c7a30003-0000-0000-0000-000000000003'),
  'Resultado outlier (> 2 desvios)', 'grava motivo_expurgo na ruptura');

-- auditoria com motivo (US10-CA4)
select is(
  (select count(*)::int from audit_log
     where table_name = 'corpos_prova' and action = 'UPDATE'
       and record_id = 'c7a10001-0000-0000-0000-000000000001'
       and motivo = 'Quebrou no transporte'),
  1, 'auditoria do descarte registra o motivo (US10-CA4)');
select ok(
  (select count(*) from audit_log
     where action = 'UPDATE' and record_id = 'c7a30003-0000-0000-0000-000000000003'
       and motivo = 'Resultado outlier (> 2 desvios)') >= 1,
  'auditoria do expurgo registra o motivo');

-- ===================== sad paths (state / motivo) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e7777777-7777-7777-7777-777777777777"}', true);

select throws_ok(
  $$ select expurgar_resultado('c7a40004-0000-0000-0000-000000000004', '') $$,
  'P0001', 'MOTIVO_OBRIGATORIO', 'expurgar sem motivo -> MOTIVO_OBRIGATORIO');
select throws_ok(
  $$ select expurgar_resultado('c7a10001-0000-0000-0000-000000000001', 'x') $$,
  'P0001', 'CP_ESTADO_INVALIDO', 'expurgar CP descartado (nao rompido) -> CP_ESTADO_INVALIDO');
select throws_ok(
  $$ select descartar_cp('c7a30003-0000-0000-0000-000000000003', 'x') $$,
  'P0001', 'CP_ESTADO_INVALIDO', 'descartar CP expurgado (terminal) -> CP_ESTADO_INVALIDO');

-- ===================== RBAC: apenas eng_lab =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"57777777-7777-7777-7777-777777777777"}', true);
select throws_ok(
  $$ select descartar_cp('c7a40004-0000-0000-0000-000000000004', 'tentativa socio') $$,
  '42501', NULL, 'socio_campo NAO descarta (DENIED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"17777777-7777-7777-7777-777777777777"}', true);
select throws_ok(
  $$ select expurgar_resultado('c7a40004-0000-0000-0000-000000000004', 'tentativa cliente') $$,
  '42501', NULL, 'cliente NAO expurga (DENIED)');

-- ===================== idade totalmente expurgada (US10-CA3) =====================
reset role;
-- idade 7: CP-M e CP-K ambos descartados -> nenhuma resultado valido -> expurgada
select ok(
  (select bool_and(status in ('descartado', 'expurgado'))
     from corpos_prova
    where concretagem_id = 'd7777777-7777-7777-7777-777777777777' and idade_alvo_dias = 7),
  'idade 7 totalmente descartada -> laudo daquela idade nao e emitido (US10-CA3)');
-- idade 28: CP-V rompido -> ha resultado valido -> NAO expurgada
select ok(
  (select bool_or(status = 'rompido')
     from corpos_prova
    where concretagem_id = 'd7777777-7777-7777-7777-777777777777' and idade_alvo_dias = 28),
  'idade 28 tem resultado valido -> laudo emitido normalmente');

select * from finish();
rollback;
