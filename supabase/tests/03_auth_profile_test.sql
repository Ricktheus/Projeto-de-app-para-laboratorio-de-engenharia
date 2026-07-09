-- =====================================================================
-- pgTAP — Auth provisioning & profile rules (F-S001-4)
-- =====================================================================
-- Verifies the auth.users -> usuarios 1:1 trigger, the default role,
-- metadata-driven role/is_admin provisioning, ON DELETE CASCADE, and the
-- cliente_id/role check constraint.
-- Run with: pg_prove -d <db> supabase/tests/03_auth_profile_test.sql
-- =====================================================================
begin;
select plan(7);

insert into clientes (id, nome)
values ('c1111111-1111-1111-1111-111111111111', 'Cliente A');

-- ---------- default role = cliente ----------
insert into auth.users (id, email) values
  ('f1111111-1111-1111-1111-111111111111', 'novo@cli.test');

select is(
  (select role::text from usuarios where id = 'f1111111-1111-1111-1111-111111111111'),
  'cliente',
  'auth.users sem metadata -> usuarios com role default cliente');

select is(
  (select is_admin from usuarios where id = 'f1111111-1111-1111-1111-111111111111'),
  false,
  'novo usuario recebe is_admin default false');

select is(
  (select count(*)::int from usuarios where id = 'f1111111-1111-1111-1111-111111111111'),
  1,
  'usuarios 1:1 com auth.users via trigger on_auth_user_created');

-- ---------- app_metadata (server-only) provisions the engineer partner ----------
insert into auth.users (id, email, raw_app_meta_data) values
  ('f2222222-2222-2222-2222-222222222222', 'rt@lab.test',
   '{"role":"eng_lab","is_admin":true,"nome":"RT"}');

select is(
  (select role::text || ':' || is_admin::text from usuarios
     where id = 'f2222222-2222-2222-2222-222222222222'),
  'eng_lab:true',
  'app_metadata provisiona role=eng_lab e is_admin=true (socio engenheiro)');

-- ---------- SECURITY (C1): role in USER metadata is IGNORED (no escalation) ----------
-- raw_user_meta_data is user-controllable at signUp(); a self-signed user asking
-- for eng_lab/is_admin must still land as a plain cliente.
insert into auth.users (id, email, raw_user_meta_data) values
  ('f3333333-3333-3333-3333-333333333333', 'attacker@evil.test',
   '{"role":"eng_lab","is_admin":true}');

select is(
  (select role::text || ':' || is_admin::text from usuarios
     where id = 'f3333333-3333-3333-3333-333333333333'),
  'cliente:false',
  'role/is_admin em raw_user_meta_data NAO escala privilegios (C1)');

-- ---------- ON DELETE CASCADE ----------
delete from auth.users where id = 'f1111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from usuarios where id = 'f1111111-1111-1111-1111-111111111111'),
  0,
  'deletar auth.user faz cascade no perfil usuarios');

-- ---------- cliente_id only when role='cliente' ----------
select throws_ok(
  $$ update usuarios set cliente_id = 'c1111111-1111-1111-1111-111111111111'
     where id = 'f2222222-2222-2222-2222-222222222222' $$,
  '23514', null,
  'cliente_id so pode ser preenchido quando role=cliente (check constraint)');

select * from finish();
rollback;
