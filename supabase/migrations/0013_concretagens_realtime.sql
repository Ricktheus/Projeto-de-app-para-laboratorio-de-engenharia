-- =====================================================================
-- Migration 0013 — Realtime on concretagens (F-S007-1 / US12)
-- =====================================================================
-- The office web panel subscribes to `postgres_changes` on `concretagens`
-- (SPEC §6.2 "Realtime (web)") so a pour saved on the mobile app shows up
-- without a reload. Two things are required for that:
--
--   1. the table must belong to the `supabase_realtime` publication;
--   2. REPLICA IDENTITY FULL so Realtime can evaluate the table's RLS
--      (conc_select) against the OLD/NEW row of UPDATE/DELETE events and only
--      deliver rows the subscriber may read.
--
-- Realtime still enforces RLS, so only admins (the office engineers) receive
-- the changes — exactly the conc_select audience (SPEC §4.5).
--
-- Idempotent, and safe on a plain Postgres instance where the Supabase
-- `supabase_realtime` publication does not exist (the block is a no-op there).
-- =====================================================================

alter table concretagens replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'concretagens'
    ) then
      alter publication supabase_realtime add table concretagens;
    end if;
  end if;
end;
$$;
