-- =====================================================================
-- pgTAP — Security hardening (F-S010-3)
-- =====================================================================
-- Backs the S010 security edge cases with executable assertions:
--   1. NO physical DELETE on critical tables — the `prevent_physical_delete`
--      guard (0003) raises `restrict_violation` (23001); the row survives.
--   2. Infra/secret tables (`ocr_attempts`, `email_events`, `app_settings`) are
--      fully denied to authenticated roles — they are reachable ONLY via
--      service_role in the Edge Functions, so the secrets/attempt-counters they
--      relate to never leak to any app client (SPEC §7.1).
-- Run with: pg_prove -d <db> supabase/tests/12_seguranca_hardening_test.sql
-- =====================================================================
begin;
select plan(10);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome)
values ('c1111111-1111-1111-1111-111111111111', 'Cliente A');

insert into auth.users (id, email, raw_user_meta_data)
values ('22222222-2222-2222-2222-222222222222', 'englab@lab.test',
        '{"nome":"Eng Lab","role":"eng_lab","is_admin":true}');
-- handle_new_user() provisioned the matching usuarios row.

insert into obras (id, cliente_id, nome, sigla, criado_por)
values ('b1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111', 'Obra A', 'OBRA-A',
        '22222222-2222-2222-2222-222222222222');

insert into concretagens (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3, cadastrado_por)
values ('d1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111', current_date, 'NF-1', 30.00, 8.00,
        '22222222-2222-2222-2222-222222222222');

insert into corpos_prova (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada)
values ('e1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111', 'QR-CP1', current_date, 7, current_date + 7);

insert into rupturas (id, corpo_prova_id, diametro_nominal_mm, carga_ruptura_kgf, mpa_calculado, tipo_fratura, executado_por)
values ('f1111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111', 100, 23562, 29.42, 'ruptura_cisalhamento',
        '22222222-2222-2222-2222-222222222222');

insert into laudos (id, cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, criado_por)
values ('a1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111',
        'parcial_7d', 'N-A1', 'hash-a1', 'rascunho', '22222222-2222-2222-2222-222222222222');

-- Infra/secret tables: seed one row each (as superuser).
insert into ocr_attempts (concretagem_ref, user_id, success)
values ('d1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', true);
insert into email_events (evento, destinatario, payload)
values ('laudo_assinado', 'cliente@obra.test', '{"laudo_id":"a1111111-1111-1111-1111-111111111111"}');
insert into app_settings (key, value)
values ('projection_factor_7d', '0.70');

-- ===================== 1. Physical DELETE guard (23001) =====================
-- reset role => superuser (RLS bypassed): the DELETE reaches the guard trigger.
reset role;
select throws_ok($$ delete from concretagens where id = 'd1111111-1111-1111-1111-111111111111' $$,
  '23001', null, 'DELETE fisico em concretagens e bloqueado (retencao vitalicia)');
select throws_ok($$ delete from laudos where id = 'a1111111-1111-1111-1111-111111111111' $$,
  '23001', null, 'DELETE fisico em laudos e bloqueado');
select throws_ok($$ delete from rupturas where id = 'f1111111-1111-1111-1111-111111111111' $$,
  '23001', null, 'DELETE fisico em rupturas e bloqueado');
select throws_ok($$ delete from corpos_prova where id = 'e1111111-1111-1111-1111-111111111111' $$,
  '23001', null, 'DELETE fisico em corpos_prova e bloqueado');
select throws_ok($$ delete from clientes where id = 'c1111111-1111-1111-1111-111111111111' $$,
  '23001', null, 'DELETE fisico em clientes e bloqueado');
select throws_ok($$ delete from obras where id = 'b1111111-1111-1111-1111-111111111111' $$,
  '23001', null, 'DELETE fisico em obras e bloqueado');

-- The blocked deletes did not remove anything (retention preserved).
select is((select count(*)::int from concretagens
           where id = 'd1111111-1111-1111-1111-111111111111'), 1,
  'a concretagem continua presente apos o DELETE bloqueado (retencao)');

-- ===================== 2. Infra/secret tables denied to clients =====================
-- Even an engineer admin cannot read the infra tables (no permissive policy):
-- these are service_role-only surfaces (secrets/attempt counters never leak).
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

select is((select count(*)::int from ocr_attempts), 0,
  'ocr_attempts NAO e legivel por usuario autenticado (apenas service_role)');
select is((select count(*)::int from email_events), 0,
  'email_events NAO e legivel por usuario autenticado (apenas service_role)');
select is((select count(*)::int from app_settings), 0,
  'app_settings NAO e legivel por usuario autenticado (apenas service_role)');

reset role;
select * from finish();
rollback;
