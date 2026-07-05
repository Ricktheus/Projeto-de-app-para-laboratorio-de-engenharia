-- =====================================================================
-- pgTAP — RPC coletar_cp (F-S005-4) + corpos_prova RLS
-- =====================================================================
-- Verifies the QR-scan collection flow (US06): the state guard (only a
-- `moldado` CP can be collected), the coletado_por/coletado_em stamps, the
-- derived coleta_atrasada (>24h), the three distinct error tokens with the
-- terminal status in DETAIL, the audit trail, and the RBAC/RLS boundary.
-- Run with: pg_prove -d <db> supabase/tests/05_rpc_coletar_cp_test.sql
-- =====================================================================
begin;
select plan(16);

-- ---------- setup (superuser: bypasses RLS) ----------
insert into clientes (id, nome) values
  ('c5555555-5555-5555-5555-555555555555', 'Cliente Coleta');

insert into auth.users (id, email, raw_user_meta_data) values
  ('55555555-5555-5555-5555-555555555555', 'socio5@lab.test', '{"role":"socio_campo"}'),
  ('66666666-6666-6666-6666-666666666666', 'englab5@lab.test', '{"role":"eng_lab","is_admin":true}'),
  ('77777777-7777-7777-7777-777777777777', 'cli5@cli.test',
     '{"role":"cliente","cliente_id":"c5555555-5555-5555-5555-555555555555"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555',
   'Obra Coleta', 'OBRA-C', '55555555-5555-5555-5555-555555555555');

insert into concretagens (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3, cadastrado_por)
values ('d5555555-5555-5555-5555-555555555555', 'b5555555-5555-5555-5555-555555555555',
        current_date, 'NF-C', 30, 8, '55555555-5555-5555-5555-555555555555');

-- Four specimens in different states / ages.
insert into corpos_prova
  (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada, status, created_at)
values
  -- recent moldado (~0h old) -> collected on time
  ('aaaa0001-0000-0000-0000-000000000001', 'd5555555-5555-5555-5555-555555555555',
   'CP-COLETA-RECENT', current_date, 28, current_date + 28, 'moldado', now()),
  -- old moldado (30h old) -> collected late (coleta_atrasada)
  ('aaaa0002-0000-0000-0000-000000000002', 'd5555555-5555-5555-5555-555555555555',
   'CP-COLETA-OLD', current_date, 28, current_date + 28, 'moldado', now() - interval '30 hours'),
  -- already collected
  ('aaaa0003-0000-0000-0000-000000000003', 'd5555555-5555-5555-5555-555555555555',
   'CP-COLETA-DONE', current_date, 28, current_date + 28, 'coletado', now()),
  -- terminal (rompido)
  ('aaaa0004-0000-0000-0000-000000000004', 'd5555555-5555-5555-5555-555555555555',
   'CP-COLETA-ROMP', current_date, 28, current_date + 28, 'rompido', now());

-- Helper to capture the PG_EXCEPTION_DETAIL of a coletar_cp call (created as
-- superuser; callable by authenticated).
create or replace function _coletar_cp_detail(p_id uuid) returns text
  language plpgsql as $$
declare v_detail text;
begin
  begin
    perform coletar_cp(p_id);
  exception when others then
    get stacked diagnostics v_detail = pg_exception_detail;
    return v_detail;
  end;
  return null; -- no exception raised
end;
$$;

-- ===================== happy path: socio collects a recent CP =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555"}', true);

select is(
  (coletar_cp('aaaa0001-0000-0000-0000-000000000001') ->> 'status'),
  'coletado', 'coletar_cp retorna status coletado (US06-CA1)');

reset role;
select is(
  (select status::text from corpos_prova where id = 'aaaa0001-0000-0000-0000-000000000001'),
  'coletado', 'CP moldado passa a coletado');
select is(
  (select coletado_por from corpos_prova where id = 'aaaa0001-0000-0000-0000-000000000001'),
  '55555555-5555-5555-5555-555555555555'::uuid, 'grava coletado_por = auth.uid()');
select ok(
  (select coletado_em is not null from corpos_prova where id = 'aaaa0001-0000-0000-0000-000000000001'),
  'grava coletado_em');
select is(
  (select coleta_atrasada from corpos_prova where id = 'aaaa0001-0000-0000-0000-000000000001'),
  false, 'coleta <24h nao marca coleta_atrasada');

-- audit trail (F-S001-3 pattern): the collection UPDATE is recorded old->new.
select is(
  (select count(*)::int from audit_log
     where table_name = 'corpos_prova' and action = 'UPDATE'
       and record_id = 'aaaa0001-0000-0000-0000-000000000001'
       and old_value ->> 'status' = 'moldado' and new_value ->> 'status' = 'coletado'),
  1, 'auditoria registra a coleta (moldado -> coletado)');

-- ===================== coleta_atrasada: collected > 24h after molding =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555"}', true);
select is(
  (coletar_cp('aaaa0002-0000-0000-0000-000000000002') ->> 'coleta_atrasada'),
  'true', 'coleta >24h marca coleta_atrasada=true (US05-CA2)');
reset role;
select is(
  (select status::text from corpos_prova where id = 'aaaa0002-0000-0000-0000-000000000002'),
  'coletado', 'CP antigo tambem passa a coletado (nao bloqueia)');

-- ===================== sad paths =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555"}', true);

-- QR sem CP correspondente
select throws_ok(
  $$ select coletar_cp('00000000-0000-0000-0000-0000000000ff') $$,
  'P0001', 'CP_NAO_ENCONTRADO', 'QR sem CP -> CP_NAO_ENCONTRADO');

-- CP já coletado (no-op)
select throws_ok(
  $$ select coletar_cp('aaaa0003-0000-0000-0000-000000000003') $$,
  'P0001', 'CP_JA_COLETADO', 'CP ja coletado -> CP_JA_COLETADO');

-- CP em estado terminal + status no DETAIL
select throws_ok(
  $$ select coletar_cp('aaaa0004-0000-0000-0000-000000000004') $$,
  'P0001', 'CP_NAO_COLETAVEL', 'CP terminal -> CP_NAO_COLETAVEL');
select is(
  _coletar_cp_detail('aaaa0004-0000-0000-0000-000000000004'),
  'rompido', 'CP_NAO_COLETAVEL carrega o status atual no DETAIL');

-- "já coletado" nao altera nada: a linha permanece inalterada
reset role;
select is(
  (select coletado_por from corpos_prova where id = 'aaaa0003-0000-0000-0000-000000000003'),
  null, 'CP ja coletado permanece inalterado (nao altera nada)');

-- ===================== RBAC: cliente nao pode coletar (DENIED 42501) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"77777777-7777-7777-7777-777777777777"}', true);
select throws_ok(
  $$ select coletar_cp('aaaa0002-0000-0000-0000-000000000002') $$,
  '42501', NULL, 'cliente NAO pode coletar (DENIED)');

-- ===================== corpos_prova RLS (1 permitido + 1 negado) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555"}', true);
select ok(
  (select count(*) from corpos_prova) >= 4,
  'socio_campo VE corpos_prova (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"77777777-7777-7777-7777-777777777777"}', true);
select is(
  (select count(*)::int from corpos_prova),
  0, 'cliente NAO ve corpos_prova (DENIED)');

select * from finish();
rollback;
