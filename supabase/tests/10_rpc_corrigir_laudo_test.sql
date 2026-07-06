-- =====================================================================
-- pgTAP — corrigir_laudo RPC (F-S008-3 / US22)
-- =====================================================================
-- Verifies the report correction/versioning applied server-side (SPEC §4.6):
--   * a SIGNED report moves assinado -> substituido and a NEW version is created
--     (versao+1, substitui_laudo_id -> previous, fresh rascunho, same NFs);
--   * the previous version is preserved and the correction is auditable;
--   * correcting a non-assinado report -> LAUDO_NAO_ASSINADO (sad path);
--   * eng-only RBAC (socio_campo / cliente are denied).
-- Run with: pg_prove -d <db> supabase/tests/10_rpc_corrigir_laudo_test.sql
-- =====================================================================
begin;
select plan(15);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c8000000-0000-0000-0000-000000000001', 'Cliente Correcao');

insert into auth.users (id, email, raw_user_meta_data) values
  ('e8000000-0000-0000-0000-000000000001', 'englab8@lab.test',  '{"role":"eng_lab","is_admin":true}'),
  ('58000000-0000-0000-0000-000000000001', 'socio8@lab.test',   '{"role":"socio_campo"}'),
  ('18000000-0000-0000-0000-000000000001', 'cli8@cli.test',
     '{"role":"cliente","cliente_id":"c8000000-0000-0000-0000-000000000001"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b8000000-0000-0000-0000-0000000000aa', 'c8000000-0000-0000-0000-000000000001',
   'Obra Correcao', 'OBRA-C', '58000000-0000-0000-0000-000000000001');

insert into concretagens
  (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3,
   diametro_nominal_mm, altura_nominal_mm, cadastrado_por)
values
  ('d8000000-0000-0000-0000-000000000c01', 'b8000000-0000-0000-0000-0000000000aa',
   current_date - 28, 'NF-C1', 30, 8, 100, 200, '58000000-0000-0000-0000-000000000001'),
  ('d8000000-0000-0000-0000-000000000c02', 'b8000000-0000-0000-0000-0000000000aa',
   current_date - 28, 'NF-C2', 30, 8, 100, 200, '58000000-0000-0000-0000-000000000001');

-- A SIGNED report (v1) over 2 NFs, and a still-DRAFT report (cannot be corrected).
insert into laudos
  (id, cliente_id, obra_id, tipo_laudo, numero, versao, codigo_verificacao, status,
   pdf_original_url, pdf_assinado_url, assinatura_rt_url, data_emissao, criado_por)
values
  ('a8000000-0000-0000-0000-000000000101', 'c8000000-0000-0000-0000-000000000001',
   'b8000000-0000-0000-0000-0000000000aa', 'final_28d', 'N°010OBRA-C', 1,
   'code0800000000000000000000000000v1', 'assinado',
   'laudos/a8000000-0000-0000-0000-000000000101/original.pdf',
   'laudos/a8000000-0000-0000-0000-000000000101/assinado.pdf',
   'laudos/a8000000-0000-0000-0000-000000000101/rt.png', current_date - 1,
   'e8000000-0000-0000-0000-000000000001'),
  ('a8000000-0000-0000-0000-000000000102', 'c8000000-0000-0000-0000-000000000001',
   'b8000000-0000-0000-0000-0000000000aa', 'final_28d', 'N°011OBRA-C', 1,
   'code0800000000000000000000000000d2', 'rascunho', null, null, null, null,
   'e8000000-0000-0000-0000-000000000001');

insert into laudo_concretagens (laudo_id, concretagem_id) values
  ('a8000000-0000-0000-0000-000000000101', 'd8000000-0000-0000-0000-000000000c01'),
  ('a8000000-0000-0000-0000-000000000101', 'd8000000-0000-0000-0000-000000000c02');

-- ===================== happy path (US22-CA1) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e8000000-0000-0000-0000-000000000001"}', true);

create temp table _c as
  select corrigir_laudo('a8000000-0000-0000-0000-000000000101') as j;

select is((select j ->> 'status' from _c), 'rascunho',
  'corrigir_laudo retorna a nova versao em rascunho (US22-CA1)');
select is((select (j ->> 'versao')::int from _c), 2,
  'nova versao = versao anterior + 1');
select is((select j ->> 'substitui_laudo_id' from _c), 'a8000000-0000-0000-0000-000000000101',
  'nova versao referencia a anterior (substitui_laudo_id)');

reset role;
-- previous version preserved as substituido (US22-CA2)
select is(
  (select status::text from laudos where id = 'a8000000-0000-0000-0000-000000000101'),
  'substituido', 'versao anterior vira substituido (preservada)');

-- new version row: fresh, same identity, cleared PDFs/signatures
select is(
  (select numero from laudos where id = (select (j ->> 'id')::uuid from _c)),
  'N°010OBRA-C', 'nova versao mantem o mesmo numero do laudo');
select ok(
  (select pdf_original_url is null and pdf_assinado_url is null and assinatura_rt_url is null
     from laudos where id = (select (j ->> 'id')::uuid from _c)),
  'nova versao nasce sem PDFs/assinaturas (regeracao)');
select is(
  (select data_emissao from laudos where id = (select (j ->> 'id')::uuid from _c)),
  null, 'nova versao nasce sem data_emissao');

-- the same NFs are carried over
select is(
  (select count(*)::int from laudo_concretagens where laudo_id = (select (j ->> 'id')::uuid from _c)),
  2, 'nova versao referencia as mesmas 2 concretagens (NFs)');

-- codigo_verificacao is fresh + unique (placeholder; real hash at PDF gen)
select isnt(
  (select codigo_verificacao from laudos where id = (select (j ->> 'id')::uuid from _c)),
  'code0800000000000000000000000000v1',
  'nova versao recebe um codigo_verificacao proprio (unico)');

-- audit: the assinado -> substituido update is recorded (old/new)
select is(
  (select count(*)::int from audit_log
     where table_name = 'laudos' and action = 'UPDATE'
       and record_id = 'a8000000-0000-0000-0000-000000000101'
       and old_value ->> 'status' = 'assinado'
       and new_value ->> 'status' = 'substituido'),
  1, 'auditoria registra assinado -> substituido (old/new)');
-- audit: the new version insert is recorded
select is(
  (select count(*)::int from audit_log
     where table_name = 'laudos' and action = 'INSERT'
       and record_id = (select (j ->> 'id')::uuid from _c)),
  1, 'auditoria registra o INSERT da nova versao');

-- ===================== sad path: non-assinado =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e8000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select corrigir_laudo('a8000000-0000-0000-0000-000000000102') $$,
  'P0001', 'LAUDO_NAO_ASSINADO', 'corrigir laudo nao-assinado -> LAUDO_NAO_ASSINADO (sad path)');

-- laudo inexistente -> LAUDO_NAO_ENCONTRADO
select throws_ok(
  $$ select corrigir_laudo('a8000000-0000-0000-0000-0000000001ff') $$,
  'P0001', 'LAUDO_NAO_ENCONTRADO', 'laudo inexistente -> LAUDO_NAO_ENCONTRADO');

-- ===================== RBAC: engenheiros somente =====================
-- socio_campo cannot correct
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"58000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select corrigir_laudo('a8000000-0000-0000-0000-000000000102') $$,
  '42501', NULL, 'socio_campo NAO corrige laudo (DENIED)');

-- cliente cannot correct
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"18000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select corrigir_laudo('a8000000-0000-0000-0000-000000000102') $$,
  '42501', NULL, 'cliente NAO corrige laudo (DENIED)');

select * from finish();
rollback;
