-- =====================================================================
-- pgTAP — evidencia_fotos RLS + private bucket (F-S006-5)
-- =====================================================================
-- Evidence photos are an INTERNAL technical annex (US11-CA2): visible/writable
-- only by eng_lab / eng_escritorio, NEVER by socio_campo or cliente, and the
-- Storage bucket is private. Covers the §7.2 evidencia_fotos RLS requirement
-- (1 allowed + 1 denied) plus the bucket privacy flag from migration 0012.
-- Run with: pg_prove -d <db> supabase/tests/08_evidencia_fotos_test.sql
-- =====================================================================
begin;
select plan(7);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c8888888-8888-8888-8888-888888888888', 'Cliente Evidencia');

insert into auth.users (id, email, raw_app_meta_data) values
  ('e8888888-8888-8888-8888-888888888888', 'englab8@lab.test',  '{"role":"eng_lab","is_admin":true}'),
  ('a8888888-8888-8888-8888-888888888888', 'engesc8@lab.test',  '{"role":"eng_escritorio","is_admin":true}'),
  ('58888888-8888-8888-8888-888888888888', 'socio8@lab.test',   '{"role":"socio_campo"}'),
  ('18888888-8888-8888-8888-888888888888', 'cli8@cli.test',
     '{"role":"cliente","cliente_id":"c8888888-8888-8888-8888-888888888888"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b8888888-8888-8888-8888-888888888888', 'c8888888-8888-8888-8888-888888888888',
   'Obra Evidencia', 'OBRA-E', '58888888-8888-8888-8888-888888888888');

insert into concretagens
  (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3, cadastrado_por)
values ('d8888888-8888-8888-8888-888888888888', 'b8888888-8888-8888-8888-888888888888',
        current_date, 'NF-E', 30, 8, '58888888-8888-8888-8888-888888888888');

insert into corpos_prova
  (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada, status)
values ('c8a10001-0000-0000-0000-000000000001', 'd8888888-8888-8888-8888-888888888888',
        'CP-EVID', current_date, 28, current_date + 28, 'rompido');

insert into rupturas
  (id, corpo_prova_id, diametro_nominal_mm, carga_ruptura_kgf, mpa_calculado, tipo_fratura, executado_por)
values ('f8888888-8888-8888-8888-888888888888', 'c8a10001-0000-0000-0000-000000000001',
        100, 23562, 29.42, 'ruptura_total', 'e8888888-8888-8888-8888-888888888888');

-- ===================== eng_lab: insert + read (ALLOWED) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e8888888-8888-8888-8888-888888888888"}', true);
insert into evidencia_fotos (id, ruptura_id, tipo, storage_path) values
  ('ef888888-8888-8888-8888-888888888888', 'f8888888-8888-8888-8888-888888888888',
   'antes', 'evidencias/f8888888/antes.png');
select is(
  (select count(*)::int from evidencia_fotos where ruptura_id = 'f8888888-8888-8888-8888-888888888888'),
  1, 'eng_lab insere e ve a evidencia (ALLOWED)');

-- ===================== eng_escritorio: read (ALLOWED) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8888888-8888-8888-8888-888888888888"}', true);
select is(
  (select count(*)::int from evidencia_fotos where ruptura_id = 'f8888888-8888-8888-8888-888888888888'),
  1, 'eng_escritorio VE a evidencia (ALLOWED)');

-- ===================== socio_campo: DENIED =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"58888888-8888-8888-8888-888888888888"}', true);
select is((select count(*)::int from evidencia_fotos), 0,
  'socio_campo NAO ve evidencia (DENIED)');
select throws_ok(
  $$ insert into evidencia_fotos (ruptura_id, tipo, storage_path)
       values ('f8888888-8888-8888-8888-888888888888', 'depois', 'x') $$,
  '42501', NULL, 'socio_campo NAO insere evidencia (DENIED)');

-- ===================== cliente: DENIED (anexo interno) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"18888888-8888-8888-8888-888888888888"}', true);
select is((select count(*)::int from evidencia_fotos), 0,
  'cliente NUNCA ve evidencia (DENIED - anexo tecnico interno, US11-CA2)');
select throws_ok(
  $$ insert into evidencia_fotos (ruptura_id, tipo, storage_path)
       values ('f8888888-8888-8888-8888-888888888888', 'antes', 'y') $$,
  '42501', NULL, 'cliente NAO insere evidencia (DENIED)');

-- ===================== bucket privado (migration 0012) =====================
reset role;
select is((select public from storage.buckets where id = 'evidencias'), false,
  'bucket evidencias e privado (public = false)');

select * from finish();
rollback;
