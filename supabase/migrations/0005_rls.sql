-- =====================================================================
-- Migration 0005 — Row Level Security (F-S001-2)
-- =====================================================================
-- Translates the RBAC matrix (PRD §3.2 / SPEC §4.5) into RLS policies.
-- Deny-by-default: RLS is ENABLED on every table; a table with no
-- permissive policy for an operation denies it. `service_role` (Edge
-- Functions) bypasses RLS and is the only path for infra tables
-- (ocr_attempts, email_events, app_settings) and the public validation
-- endpoint.
-- Idempotent: enable-RLS is repeatable; each policy is dropped-if-exists
-- before being (re)created.
-- =====================================================================

-- ---------- Enable RLS everywhere (deny-by-default) ----------
alter table usuarios            enable row level security;
alter table clientes            enable row level security;
alter table obras               enable row level security;
alter table concretagens        enable row level security;
alter table corpos_prova        enable row level security;
alter table rupturas            enable row level security;
alter table evidencia_fotos     enable row level security;
alter table laudos              enable row level security;
alter table laudo_concretagens  enable row level security;
alter table audit_log           enable row level security;
alter table ocr_attempts        enable row level security;
alter table email_events        enable row level security;
alter table app_settings        enable row level security;

-- ===== usuarios =====
drop policy if exists usuarios_self_select on usuarios;
create policy usuarios_self_select on usuarios for select
  using (id = auth.uid() or is_admin());

drop policy if exists usuarios_admin_write on usuarios;
create policy usuarios_admin_write on usuarios for all
  using (is_admin()) with check (is_admin());

-- ===== clientes ===== (CRUD only admins; a client sees its own record)
drop policy if exists clientes_admin_all on clientes;
create policy clientes_admin_all on clientes for all
  using (is_admin()) with check (is_admin());

drop policy if exists clientes_self_select on clientes;
create policy clientes_self_select on clientes for select
  using (id = current_cliente_id());

-- ===== obras ===== (create: internals; edit: author socio_campo OR engineers; client: denied)
drop policy if exists obras_internos_select on obras;
create policy obras_internos_select on obras for select
  using (current_role_name() in ('socio_campo', 'eng_lab', 'eng_escritorio'));

drop policy if exists obras_criar on obras;
create policy obras_criar on obras for insert
  with check (current_role_name() in ('socio_campo', 'eng_lab', 'eng_escritorio'));

drop policy if exists obras_editar on obras;
create policy obras_editar on obras for update
  using (is_admin() or (current_role_name() = 'socio_campo' and criado_por = auth.uid()))
  with check (is_admin() or (current_role_name() = 'socio_campo' and criado_por = auth.uid()));

-- ===== concretagens ===== (create: internals; edit: engineers only; socio sees its own)
drop policy if exists conc_select on concretagens;
create policy conc_select on concretagens for select using (
  is_admin()
  or (current_role_name() = 'socio_campo' and cadastrado_por = auth.uid())
);

drop policy if exists conc_insert on concretagens;
create policy conc_insert on concretagens for insert
  with check (current_role_name() in ('socio_campo', 'eng_lab', 'eng_escritorio'));

drop policy if exists conc_update on concretagens;
create policy conc_update on concretagens for update
  using (is_admin()) with check (is_admin()); -- socio does NOT edit after saving

-- ===== corpos_prova ===== (create: internals; collection/discard via SECURITY DEFINER RPCs)
drop policy if exists cp_select on corpos_prova;
create policy cp_select on corpos_prova for select using (
  current_role_name() in ('socio_campo', 'eng_lab', 'eng_escritorio')
);

drop policy if exists cp_insert on corpos_prova;
create policy cp_insert on corpos_prova for insert
  with check (current_role_name() in ('socio_campo', 'eng_lab', 'eng_escritorio'));

-- ===== rupturas ===== (register/purge: eng_lab only; engineers can read)
drop policy if exists rupt_select on rupturas;
create policy rupt_select on rupturas for select using (
  current_role_name() in ('eng_lab', 'eng_escritorio')
);

drop policy if exists rupt_write on rupturas;
create policy rupt_write on rupturas for all
  using (current_role_name() = 'eng_lab')
  with check (current_role_name() = 'eng_lab');

-- ===== evidencia_fotos ===== (send/see: eng_lab/eng_escritorio; client NEVER)
drop policy if exists evid_rw on evidencia_fotos;
create policy evid_rw on evidencia_fotos for all
  using (current_role_name() in ('eng_lab', 'eng_escritorio'))
  with check (current_role_name() in ('eng_lab', 'eng_escritorio'));

-- ===== laudos ===== (generate/edit/correct: engineers; client: only 'assinado' of its obras)
drop policy if exists laudos_eng_all on laudos;
create policy laudos_eng_all on laudos for all
  using (current_role_name() in ('eng_lab', 'eng_escritorio'))
  with check (current_role_name() in ('eng_lab', 'eng_escritorio'));

drop policy if exists laudos_cliente_select on laudos;
create policy laudos_cliente_select on laudos for select using (
  current_role_name() = 'cliente'
  and status = 'assinado'
  and cliente_id = current_cliente_id()
);

-- ===== laudo_concretagens ===== (follows laudos; engineers)
drop policy if exists lc_eng on laudo_concretagens;
create policy lc_eng on laudo_concretagens for all
  using (current_role_name() in ('eng_lab', 'eng_escritorio'))
  with check (current_role_name() in ('eng_lab', 'eng_escritorio'));

-- ===== audit_log ===== (read only admins; writes only via trigger/service)
drop policy if exists audit_admin_select on audit_log;
create policy audit_admin_select on audit_log for select using (is_admin());

-- ===== ocr_attempts / email_events / app_settings =====
-- No permissive policy: RLS enabled = fully denied to anon/authenticated.
-- Access is exclusively through Edge Functions using service_role.
