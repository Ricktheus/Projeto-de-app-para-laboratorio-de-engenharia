-- =====================================================================
-- pgTAP — Row Level Security by role (F-S001-2)
-- =====================================================================
-- For each critical table (§7.2): at least one ALLOWED and one DENIED case
-- per role, plus deny-by-default writes and the anonymous surface.
-- Run with: pg_prove -d <db> supabase/tests/02_rls_test.sql
-- =====================================================================
begin;
select plan(19);

-- ---------- setup (superuser: bypasses RLS) ----------
-- Clients first (usuarios.cliente_id FK).
insert into clientes (id, nome) values
  ('c1111111-1111-1111-1111-111111111111', 'Cliente A'),
  ('c2222222-2222-2222-2222-222222222222', 'Cliente B');

-- Users via auth.users -> handle_new_user() provisions usuarios.
insert into auth.users (id, email, raw_app_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'socio@lab.test',  '{"role":"socio_campo"}'),
  ('22222222-2222-2222-2222-222222222222', 'englab@lab.test', '{"role":"eng_lab","is_admin":true}'),
  ('33333333-3333-3333-3333-333333333333', 'engesc@lab.test', '{"role":"eng_escritorio","is_admin":true}'),
  ('44444444-4444-4444-4444-444444444444', 'clia@cli.test',
     '{"role":"cliente","cliente_id":"c1111111-1111-1111-1111-111111111111"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Obra A', 'OBRA-A', '11111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Obra B', 'OBRA-B', '11111111-1111-1111-1111-111111111111');

insert into concretagens (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3, cadastrado_por) values
  ('d1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', current_date, 'NF-1', 30.00, 8.00, '11111111-1111-1111-1111-111111111111'),
  ('d2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', current_date, 'NF-2', 30.00, 6.00, '22222222-2222-2222-2222-222222222222');

insert into corpos_prova (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada) values
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'QR-CP1', current_date, 7,  current_date + 7),
  ('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'QR-CP2', current_date, 28, current_date + 28);

insert into rupturas (id, corpo_prova_id, diametro_nominal_mm, carga_ruptura_kgf, mpa_calculado, tipo_fratura, executado_por) values
  ('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 100, 23562, 29.42, 'ruptura_cisalhamento', '22222222-2222-2222-2222-222222222222');

insert into evidencia_fotos (id, ruptura_id, tipo, storage_path) values
  ('f9111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'antes', 'evidencias/x.png');

-- `assinado` reports carry a pdf_assinado_url (chk_laudo_assinado_requires_pdf, 0018).
insert into laudos (id, cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, pdf_assinado_url, criado_por) values
  ('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'parcial_7d', 'N-A1', 'hash-a1', 'assinado',  'laudos/a1111111-1111-1111-1111-111111111111/assinado.pdf', '22222222-2222-2222-2222-222222222222'),
  ('a2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'parcial_7d', 'N-A2', 'hash-a2', 'rascunho',  null, '22222222-2222-2222-2222-222222222222'),
  ('a3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'parcial_7d', 'N-B1', 'hash-b1', 'assinado',  'laudos/a3333333-3333-3333-3333-333333333333/assinado.pdf', '22222222-2222-2222-2222-222222222222');

-- ===================== concretagens =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from concretagens), 1,
  'socio_campo ve apenas as concretagens que cadastrou (ALLOWED/escopo)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select is((select count(*)::int from concretagens), 2,
  'eng_lab (admin) ve todas as concretagens (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
select is((select count(*)::int from concretagens), 0,
  'cliente NAO ve concretagens (DENIED)');

-- ===================== rupturas =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select is((select count(*)::int from rupturas), 1,
  'eng_lab ve rupturas (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from rupturas), 0,
  'socio_campo NAO ve rupturas (DENIED)');

-- ===================== laudos =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select is((select count(*)::int from laudos), 3,
  'engenheiro ve todos os laudos (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
select is((select count(*)::int from laudos), 1,
  'cliente ve apenas laudos assinado das suas obras (escopo por cliente_id)');
select is((select id from laudos), 'a1111111-1111-1111-1111-111111111111'::uuid,
  'o unico laudo visivel ao cliente e o assinado da sua obra');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from laudos), 0,
  'socio_campo NAO ve laudos (DENIED)');

-- ===================== evidencia_fotos =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
select is((select count(*)::int from evidencia_fotos), 1,
  'eng_escritorio ve fotos de evidencia (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
select is((select count(*)::int from evidencia_fotos), 0,
  'cliente NUNCA acessa fotos de evidencia (DENIED)');

-- ===================== audit_log =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select ok((select count(*) from audit_log) > 0,
  'admin (eng_lab) le audit_log (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from audit_log), 0,
  'socio_campo (nao-admin) NAO le audit_log (DENIED)');

-- ===================== clientes =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select is((select count(*)::int from clientes), 2,
  'admin ve todos os clientes (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
select is((select count(*)::int from clientes), 1,
  'cliente ve apenas o proprio cadastro (escopo self)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from clientes), 0,
  'socio_campo NAO ve clientes (DENIED)');

-- ===================== deny-by-default writes =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
select throws_ok(
  $$ insert into obras (cliente_id, nome, sigla, criado_por)
     values ('c1111111-1111-1111-1111-111111111111', 'X', 'OBRA-X', '44444444-4444-4444-4444-444444444444') $$,
  '42501', null,
  'cliente NAO pode criar obra (RLS nega escrita)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select throws_ok(
  $$ insert into rupturas (corpo_prova_id, diametro_nominal_mm, carga_ruptura_kgf, mpa_calculado, tipo_fratura, executado_por)
     values ('e2222222-2222-2222-2222-222222222222', 100, 20000, 25.00, 'ruptura_total', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null,
  'socio_campo NAO pode registrar ruptura (RLS nega escrita)');

-- ===================== anonymous surface =====================
reset role; set role anon;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from laudos), 0,
  'acesso anonimo NAO ve laudos autenticados (unico acesso anon e a pagina publica)');

reset role;
select * from finish();
rollback;
