-- =====================================================================
-- Migration 0008 — Internal read access to `clientes` (F-S004-2 / US20)
-- =====================================================================
-- US20 requires a partner (`socio_campo`) to pick the linked client when
-- creating an obra on mobile, but the S001 RLS only granted `clientes`
-- SELECT to admins (`clientes_admin_all`) and to the client themselves
-- (`clientes_self_select`). Without a read policy, socio_campo / non-admin
-- engineers cannot list clients to attach an obra.
--
-- This adds a READ-ONLY policy for the three internal roles. It does NOT
-- grant writes (create/edit clients stays admins-only, F-S004-1). Additive
-- and idempotent.
--
-- [PREMISSA] The SPEC §4.5 matrix omitted this internal read; it is required
-- for US20 to function and is documented as an assumption.
-- =====================================================================

drop policy if exists clientes_internos_select on clientes;
create policy clientes_internos_select on clientes for select
  using (current_role_name() in ('socio_campo', 'eng_lab', 'eng_escritorio'));
