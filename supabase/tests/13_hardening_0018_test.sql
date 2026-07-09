-- =====================================================================
-- pgTAP — Post-S010 hardening invariants (migration 0018)
-- =====================================================================
-- Backs the AUDITORIA_POS_S008 fixes with executable assertions:
--   C4  — definir_numero_laudo: sets the definitive number; rejects the
--         placeholder / duplicates / a signed report; eng-only.
--   C2/C3 — publicar_laudo_assinado: pronto_assinatura -> assinado (with the PDF),
--         records the acting engineer in audit_log, and cannot be re-applied.
--   H1  — chk_laudo_assinado_requires_pdf: no `assinado` without a signed PDF;
--         rupture results (mpa/carga/nominal diameter) are immutable.
--   H3  — uq_laudos_substitui: a parent version is superseded at most once.
-- Run with: pg_prove -d <db> supabase/tests/13_hardening_0018_test.sql
-- =====================================================================
begin;
select plan(14);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c9000000-0000-0000-0000-000000000001', 'Cliente Hardening');

insert into auth.users (id, email, raw_app_meta_data) values
  ('e9000000-0000-0000-0000-000000000001', 'englab9@lab.test', '{"role":"eng_lab","is_admin":true}'),
  ('59000000-0000-0000-0000-000000000001', 'socio9@lab.test',  '{"role":"socio_campo"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b9000000-0000-0000-0000-0000000000aa', 'c9000000-0000-0000-0000-000000000001',
   'Obra Hardening', 'OBRA-H', '59000000-0000-0000-0000-000000000001');

insert into concretagens
  (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3,
   diametro_nominal_mm, altura_nominal_mm, cadastrado_por)
values
  ('d9000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-0000000000aa',
   current_date - 7, 'NF-H1', 30, 8, 100, 200, '59000000-0000-0000-0000-000000000001');

-- A ruptured specimen + its result (for the immutability check).
insert into corpos_prova
  (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada, status)
values
  ('e9c00000-0000-0000-0000-000000000001', 'd9000000-0000-0000-0000-000000000001',
   'QR-H1', current_date - 7, 7, current_date, 'rompido');

insert into rupturas
  (id, corpo_prova_id, diametro_nominal_mm, carga_ruptura_kgf, mpa_calculado, tipo_fratura, executado_por)
values
  ('f9000000-0000-0000-0000-000000000001', 'e9c00000-0000-0000-0000-000000000001',
   100, 23562, 29.42, 'ruptura_cisalhamento', 'e9000000-0000-0000-0000-000000000001');

-- Reports: a draft (placeholder number), an existing live number, a pronto one,
-- and a signed one (which the CHECK forces to carry a pdf_assinado_url).
insert into laudos
  (id, cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, pdf_assinado_url, criado_por)
values
  ('a9000000-0000-0000-0000-0000000000d1', 'c9000000-0000-0000-0000-000000000001',
   'b9000000-0000-0000-0000-0000000000aa', 'final_28d', 'RASCUNHO OBRA-H NF NF-H1',
   'codeh900000000000000000000000000d1', 'rascunho', null, 'e9000000-0000-0000-0000-000000000001'),
  ('a9000000-0000-0000-0000-0000000000d2', 'c9000000-0000-0000-0000-000000000001',
   'b9000000-0000-0000-0000-0000000000aa', 'final_28d', 'N°DUP-H',
   'codeh900000000000000000000000000d2', 'rascunho', null, 'e9000000-0000-0000-0000-000000000001'),
  ('a9000000-0000-0000-0000-0000000000f1', 'c9000000-0000-0000-0000-000000000001',
   'b9000000-0000-0000-0000-0000000000aa', 'final_28d', 'N°PUB-H',
   'codeh900000000000000000000000000f1', 'pronto_assinatura', null,
   'e9000000-0000-0000-0000-000000000001'),
  ('a9000000-0000-0000-0000-0000000000a1', 'c9000000-0000-0000-0000-000000000001',
   'b9000000-0000-0000-0000-0000000000aa', 'final_28d', 'N°ASSIN-H',
   'codeh900000000000000000000000000a1', 'assinado',
   'laudos/a9000000-0000-0000-0000-0000000000a1/assinado.pdf',
   'e9000000-0000-0000-0000-000000000001');

-- ===================== H1: assinado requires a signed PDF (23514) =====================
reset role;
select throws_ok(
  $$ insert into laudos (cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, criado_por)
     values ('c9000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-0000000000aa',
             'final_28d', 'N°NOPDF-H', 'codeh900000000000000000000000nopdf', 'assinado',
             'e9000000-0000-0000-0000-000000000001') $$,
  '23514', null, 'laudo assinado SEM pdf_assinado_url e bloqueado (chk_laudo_assinado_requires_pdf)');

-- ===================== H1: rupture result is immutable =====================
select throws_ok(
  $$ update rupturas set mpa_calculado = 99.99
       where id = 'f9000000-0000-0000-0000-000000000001' $$,
  '23001', null, 'mpa_calculado de uma ruptura e imutavel (23001)');

select lives_ok(
  $$ update rupturas set motivo_expurgo = 'anomalia'
       where id = 'f9000000-0000-0000-0000-000000000001' $$,
  'expurgar (motivo_expurgo) continua permitido na ruptura');

-- ===================== H3: a parent is superseded at most once =====================
insert into laudos
  (id, cliente_id, obra_id, tipo_laudo, numero, versao, substitui_laudo_id, codigo_verificacao, status, criado_por)
values
  ('a9000000-0000-0000-0000-0000000000c1', 'c9000000-0000-0000-0000-000000000001',
   'b9000000-0000-0000-0000-0000000000aa', 'final_28d', 'N°ASSIN-H', 2,
   'a9000000-0000-0000-0000-0000000000a1', 'codeh900000000000000000000000000c1', 'rascunho',
   'e9000000-0000-0000-0000-000000000001');

select throws_ok(
  $$ insert into laudos
       (cliente_id, obra_id, tipo_laudo, numero, versao, substitui_laudo_id, codigo_verificacao, status, criado_por)
     values ('c9000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-0000000000aa',
             'final_28d', 'N°ASSIN-H', 2, 'a9000000-0000-0000-0000-0000000000a1',
             'codeh900000000000000000000000000c2', 'rascunho',
             'e9000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'uma versao so pode ser substituida uma vez (uq_laudos_substitui)');

-- ===================== C4: definir_numero_laudo (eng_lab) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-000000000001"}', true);

select lives_ok(
  $$ select definir_numero_laudo('a9000000-0000-0000-0000-0000000000d1', 'N°NEW-H') $$,
  'definir_numero_laudo define o numero de um rascunho');

reset role;
select is(
  (select numero from laudos where id = 'a9000000-0000-0000-0000-0000000000d1'),
  'N°NEW-H', 'o numero definitivo foi gravado');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-000000000001"}', true);

select throws_ok(
  $$ select definir_numero_laudo('a9000000-0000-0000-0000-0000000000d1', 'RASCUNHO qualquer') $$,
  'P0001', 'NUMERO_INVALIDO', 'numero placeholder (RASCUNHO...) e rejeitado');

select throws_ok(
  $$ select definir_numero_laudo('a9000000-0000-0000-0000-0000000000d1', 'N°DUP-H') $$,
  'P0001', 'NUMERO_DUPLICADO', 'numero duplicado no mesmo cliente e rejeitado');

select throws_ok(
  $$ select definir_numero_laudo('a9000000-0000-0000-0000-0000000000a1', 'N°QUALQUER-H') $$,
  'P0001', 'LAUDO_NAO_EDITAVEL', 'laudo assinado nao pode ter o numero alterado');

-- RBAC: socio_campo cannot set the number.
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"59000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select definir_numero_laudo('a9000000-0000-0000-0000-0000000000d1', 'N°Z-H') $$,
  '42501', null, 'socio_campo NAO define numero de laudo (DENIED)');

-- ===================== C2/C3: publicar_laudo_assinado =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-000000000001"}', true);

select is(
  (select publicar_laudo_assinado(
            'a9000000-0000-0000-0000-0000000000f1',
            'laudos/a9000000-0000-0000-0000-0000000000f1/assinado.pdf', null, 'deadbeef'
          ) ->> 'status'),
  'assinado', 'publicar_laudo_assinado move pronto_assinatura -> assinado');

-- Re-publishing the same (now assinado) report is rejected (C2 guard).
select throws_ok(
  $$ select publicar_laudo_assinado(
              'a9000000-0000-0000-0000-0000000000f1',
              'laudos/a9000000-0000-0000-0000-0000000000f1/assinado.pdf', null, 'deadbeef') $$,
  'P0001', 'LAUDO_NAO_PUBLICAVEL', 'republicar um laudo ja assinado e bloqueado (C2)');

reset role;
-- C3: the publish UPDATE is attributed to the acting engineer in audit_log.
select is(
  (select count(*)::int from audit_log
     where table_name = 'laudos' and action = 'UPDATE'
       and record_id = 'a9000000-0000-0000-0000-0000000000f1'
       and new_value ->> 'status' = 'assinado'
       and user_id = 'e9000000-0000-0000-0000-000000000001'),
  1, 'auditoria da publicacao registra o engenheiro (auth.uid) como ator (C3)');

-- C2: the signed-PDF integrity hash was persisted at publication.
select is(
  (select pdf_assinado_sha256 from laudos where id = 'a9000000-0000-0000-0000-0000000000f1'),
  'deadbeef', 'o hash de integridade do PDF assinado foi gravado (C2)');

select * from finish();
rollback;
