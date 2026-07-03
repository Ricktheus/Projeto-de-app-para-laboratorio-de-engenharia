-- =====================================================================
-- Migration 0003 — Helper functions & structural triggers
-- =====================================================================
-- Covers:
--   * RBAC helper functions used by RLS (F-S001-2)
--   * updated_at maintenance (F-S001-1, optimistic locking)
--   * physical-delete guard on critical tables (F-S001-1: lifetime retention)
--   * auth.users -> usuarios provisioning trigger (F-S001-4)
--
-- SECURITY DEFINER functions pin `search_path` to avoid search-path
-- hijacking; they run as the owner and therefore bypass RLS on `usuarios`,
-- which is what allows the RBAC helpers to be called from within policies
-- without recursion.
-- Idempotent: `create or replace` + `drop trigger if exists` before create.
-- =====================================================================

-- ---------- RBAC helpers (read the caller's profile from the JWT) ----------
create or replace function current_role_name() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from usuarios where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from usuarios where id = auth.uid()), false);
$$;

create or replace function current_cliente_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select cliente_id from usuarios where id = auth.uid();
$$;

-- ---------- updated_at maintenance ----------
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'usuarios', 'clientes', 'obras', 'concretagens',
    'corpos_prova', 'laudos', 'email_events', 'app_settings'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on %I', t);
    execute format(
      'create trigger trg_set_updated_at before update on %I '
      || 'for each row execute function set_updated_at()', t
    );
  end loop;
end;
$$;

-- ---------- Physical-delete guard (lifetime retention / no hard DELETE) ----------
-- Critical domain tables must never be physically deleted; use `ativo=false`
-- or versioning. `usuarios` is intentionally EXCLUDED so the
-- `auth.users ON DELETE CASCADE` (F-S001-4 edge case) can still remove the
-- profile when an auth account is deleted.
create or replace function prevent_physical_delete() returns trigger
  language plpgsql as $$
begin
  raise exception
    'DELETE fisico nao permitido em "%": use inativacao (ativo=false) ou versionamento.',
    tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes', 'obras', 'concretagens', 'corpos_prova', 'rupturas', 'laudos'
  ]
  loop
    execute format('drop trigger if exists trg_prevent_physical_delete on %I', t);
    execute format(
      'create trigger trg_prevent_physical_delete before delete on %I '
      || 'for each row execute function prevent_physical_delete()', t
    );
  end loop;
end;
$$;

-- ---------- Auth provisioning: auth.users (1:1) -> usuarios ----------
-- Runs on every new auth account. Reads optional role/is_admin/cliente_id
-- from the invite metadata (raw_user_meta_data); defaults role='cliente',
-- is_admin=false. This lets an admin provision internal roles / the 2
-- engineer partners (is_admin=true) at invite time, while self-signups
-- default to 'cliente' (F-S001-4).
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_role     user_role;
  v_is_admin boolean;
  v_cliente  uuid;
begin
  v_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::user_role,
    'cliente'
  );
  v_is_admin := coalesce((new.raw_user_meta_data ->> 'is_admin')::boolean, false);
  v_cliente := case
    when v_role = 'cliente'
      then nullif(new.raw_user_meta_data ->> 'cliente_id', '')::uuid
    else null
  end;

  insert into usuarios (id, nome, email, role, is_admin, cliente_id)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nome', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    v_role,
    v_is_admin,
    v_cliente
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
