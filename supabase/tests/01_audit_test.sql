-- =====================================================================
-- pgTAP — Automatic audit trail (F-S001-3)
-- =====================================================================
-- Verifies the generic audit_trigger records INSERT/UPDATE with old/new
-- snapshots, the acting user, the discard reason, and that audit_log is
-- not directly writable by an authenticated user.
-- Run with: pg_prove -d <db> supabase/tests/01_audit_test.sql
-- =====================================================================
begin;
select plan(8);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into auth.users (id, email, raw_app_meta_data)
values ('22222222-2222-2222-2222-222222222222', 'englab@lab.test',
        '{"nome":"Eng Lab","role":"eng_lab","is_admin":true}');
-- handle_new_user() provisioned the matching usuarios row.

insert into clientes (id, nome)
values ('c1111111-1111-1111-1111-111111111111', 'Cliente A');

insert into obras (id, cliente_id, nome, sigla, criado_por)
values ('b1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111', 'Obra A', 'OBRA-A',
        '22222222-2222-2222-2222-222222222222');

insert into concretagens (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3, cadastrado_por)
values ('d1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111', current_date, 'NF-1', 30.00, 8.00,
        '22222222-2222-2222-2222-222222222222');

-- ========== INSERT audit ==========
select is(
  (select count(*)::int from audit_log
     where table_name = 'concretagens' and action = 'INSERT'
       and record_id = 'd1111111-1111-1111-1111-111111111111'),
  1, 'INSERT em concretagens gera 1 linha de auditoria (action=INSERT)');

select ok(
  (select new_value ->> 'fck_projeto' from audit_log
     where table_name = 'concretagens' and action = 'INSERT'
       and record_id = 'd1111111-1111-1111-1111-111111111111') is not null,
  'auditoria de INSERT grava new_value');

select ok(
  (select old_value from audit_log
     where table_name = 'concretagens' and action = 'INSERT'
       and record_id = 'd1111111-1111-1111-1111-111111111111') is null,
  'auditoria de INSERT mantem old_value nulo');

-- ========== UPDATE audit (F-S001-3 DoD) ==========
-- Act as the eng_lab admin so user_id is captured from auth.uid().
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
update concretagens set fck_projeto = 35.00
  where id = 'd1111111-1111-1111-1111-111111111111';
reset role;

select is(
  (select count(*)::int from audit_log
     where table_name = 'concretagens' and action = 'UPDATE'
       and record_id = 'd1111111-1111-1111-1111-111111111111'),
  1, 'UPDATE em concretagens.fck_projeto gera 1 linha de auditoria');

select ok(
  (select (old_value ->> 'fck_projeto') <> (new_value ->> 'fck_projeto')
     from audit_log
     where table_name = 'concretagens' and action = 'UPDATE'
       and record_id = 'd1111111-1111-1111-1111-111111111111'),
  'auditoria de UPDATE: old_value.fck_projeto <> new_value.fck_projeto');

select is(
  (select user_id from audit_log
     where table_name = 'concretagens' and action = 'UPDATE'
       and record_id = 'd1111111-1111-1111-1111-111111111111'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'auditoria grava o user_id (auth.uid) que realizou a escrita');

-- ========== reason persisted on discard/purge ==========
insert into corpos_prova (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada)
values ('e1111111-1111-1111-1111-111111111111',
        'd1111111-1111-1111-1111-111111111111', 'QR-CP1', current_date, 7, current_date + 7);
update corpos_prova set status = 'descartado', motivo_descarte = 'CP danificado na cura'
  where id = 'e1111111-1111-1111-1111-111111111111';

select is(
  (select motivo from audit_log
     where table_name = 'corpos_prova' and action = 'UPDATE'
       and record_id = 'e1111111-1111-1111-1111-111111111111'
     order by created_at desc limit 1),
  'CP danificado na cura',
  'descarte/expurgo persiste o motivo no registro de auditoria');

-- ========== audit_log is not user-writable ==========
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select throws_ok(
  $$ insert into audit_log (action, table_name, record_id)
     values ('INSERT', 'x', '00000000-0000-0000-0000-0000000000ff') $$,
  '42501', null,
  'usuario nao pode inserir em audit_log diretamente (RLS nega)');
reset role;

select * from finish();
rollback;
