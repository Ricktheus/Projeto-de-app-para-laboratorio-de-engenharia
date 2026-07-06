-- =====================================================================
-- pgTAP — S009 portal RLS + e-mail plumbing (F-S009-1 / F-S009-4)
-- =====================================================================
-- Covers migration 0017:
--   * obras_cliente_select — a client reads its OWN obras (allowed) and never
--     another client's (denied); internal roles still read all.
--   * trg_laudos_notify — entering pronto_assinatura enqueues an RT e-mail.
--   * enqueue_cps_pendentes_coleta_emails — counts stale moldado CPs and
--     enqueues a sócio e-mail with that count.
-- Run with: pg_prove -d <db> supabase/tests/11_portal_email_test.sql
-- =====================================================================
begin;
select plan(8);

-- ---------- setup (superuser: bypasses RLS; triggers still fire) ----------
insert into clientes (id, nome, email) values
  ('c1111111-1111-1111-1111-111111111111', 'Cliente A', 'clienteA@cli.test'),
  ('c2222222-2222-2222-2222-222222222222', 'Cliente B', 'clienteB@cli.test');

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'socio@lab.test',  '{"role":"socio_campo"}'),
  ('22222222-2222-2222-2222-222222222222', 'englab@lab.test', '{"role":"eng_lab","is_admin":true}'),
  ('44444444-4444-4444-4444-444444444444', 'clia@cli.test',
     '{"role":"cliente","cliente_id":"c1111111-1111-1111-1111-111111111111"}');

insert into obras (id, cliente_id, nome, sigla, criado_por) values
  ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Obra A', 'OBRA-A', '11111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Obra B', 'OBRA-B', '11111111-1111-1111-1111-111111111111');

insert into concretagens (id, obra_id, data_concretagem, nf_numero, fck_projeto, volume_m3, cadastrado_por) values
  ('d1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', current_date, 'NF-1', 30.00, 8.00, '11111111-1111-1111-1111-111111111111');

-- Two specimens molded >24h ago and never collected (still moldado).
insert into corpos_prova (id, concretagem_id, codigo_rastreio, data_moldagem, idade_alvo_dias, data_ruptura_planejada, status, created_at) values
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'QR-CP1', current_date - 2, 7,  current_date + 5,  'moldado', now() - interval '2 days'),
  ('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'QR-CP2', current_date - 2, 28, current_date + 26, 'moldado', now() - interval '2 days');

insert into laudos (id, cliente_id, obra_id, tipo_laudo, numero, codigo_verificacao, status, criado_por) values
  ('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'final_28d', 'N-A1', 'hash-a1', 'rascunho', '22222222-2222-2222-2222-222222222222');

-- ===================== obras_cliente_select (F-S009-1) =====================
reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
select is((select count(*)::int from obras), 1,
  'cliente ve apenas as suas obras (ALLOWED/escopo por cliente_id)');
select is((select id from obras), 'b1111111-1111-1111-1111-111111111111'::uuid,
  'a unica obra visivel ao cliente e a do seu cliente_id');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select is((select count(*)::int from obras), 2,
  'engenheiro (interno) continua vendo todas as obras (ALLOWED)');

reset role; set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from obras where cliente_id = 'c2222222-2222-2222-2222-222222222222'), 1,
  'socio interno enxerga obras de qualquer cliente (nao cliente-escopado)');

-- ===================== trg_laudos_notify (US24-CA2) =====================
reset role;
update laudos set status = 'pronto_assinatura' where id = 'a1111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from email_events
     where evento = 'pronto_assinatura' and destinatario = 'englab@lab.test'),
  1,
  'entrar em pronto_assinatura enfileira 1 e-mail para o RT (eng_lab)');

-- Re-updating within pronto_assinatura must NOT enqueue again (transition-only).
reset role;
update laudos set numero = 'N-A1b' where id = 'a1111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from email_events where evento = 'pronto_assinatura'),
  1,
  'atualizacao sem mudanca de status NAO reenfileira o e-mail do RT');

-- ===================== enqueue_cps_pendentes_coleta_emails (US24-CA3) =====================
reset role;
select is(
  (select enqueue_cps_pendentes_coleta_emails()),
  2,
  'a funcao retorna a quantidade de CPs moldados ha >24h sem coleta (2)');
select is(
  (select count(*)::int from email_events
     where evento = 'cps_pendentes_coleta' and destinatario = 'socio@lab.test'
       and (payload ->> 'quantidade')::int = 2),
  1,
  'enfileira 1 e-mail para o socio com a contagem de CPs pendentes');

reset role;
select * from finish();
rollback;
