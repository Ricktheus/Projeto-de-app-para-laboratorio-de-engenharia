-- =====================================================================
-- Migration 0001 — Enums (F-S001-1)
-- =====================================================================
-- All domain enums for the concrete testing laboratory MVP.
-- Idempotent: each CREATE TYPE is guarded so re-running the migration
-- (e.g. `supabase db reset`) is a safe no-op instead of aborting.
-- =====================================================================

do $$ begin
  create type user_role as enum ('socio_campo', 'eng_lab', 'eng_escritorio', 'cliente');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type cp_status as enum ('moldado', 'coletado', 'rompido', 'descartado', 'expurgado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type laudo_status as enum ('rascunho', 'pronto_assinatura', 'assinado', 'substituido');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type laudo_tipo as enum ('parcial_7d', 'parcial_14d', 'final_28d');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type audit_action as enum ('INSERT', 'UPDATE', 'DELETE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tipo_fratura as enum (
    'ruptura_cabeca', 'ruptura_face', 'ruptura_parcial',
    'ruptura_total', 'ruptura_cisalhamento', 'ruptura_trinca'
  );
exception when duplicate_object then null;
end $$;
