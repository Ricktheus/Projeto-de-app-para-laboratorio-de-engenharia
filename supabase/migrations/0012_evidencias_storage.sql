-- =====================================================================
-- Migration 0012 — Private 'evidencias' Storage bucket + policies (F-S006-5)
-- =====================================================================
-- Internal evidence photos (antes/depois) are uploaded straight from the app
-- to a PRIVATE Storage bucket and must NEVER be reachable by clients — they are
-- an internal technical annex, visible only to eng_lab / eng_escritorio
-- (US11-CA2, SPEC §4.5 evidencia_fotos "cliente NUNCA").
--
-- Two layers enforce this:
--   * the `evidencia_fotos` TABLE (metadata) already has the eng-only RLS
--     policy `evid_rw` (migration 0005);
--   * the BUCKET below is private (public=false) and its storage.objects
--     policies restrict every operation on `bucket_id = 'evidencias'` to the two
--     internal engineering roles. Signed URLs (service side) are the only way a
--     photo is ever displayed.
--
-- `current_role_name()` is fully schema-qualified because storage policies do
-- not run with `public` on the search_path. Idempotent: bucket upsert +
-- drop-if-exists before each policy.
-- =====================================================================

-- ---------- Private bucket ----------
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do update set public = false;

-- ---------- storage.objects policies (eng_lab / eng_escritorio only) ----------
drop policy if exists evidencias_eng_select on storage.objects;
create policy evidencias_eng_select on storage.objects for select
  using (
    bucket_id = 'evidencias'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  );

drop policy if exists evidencias_eng_insert on storage.objects;
create policy evidencias_eng_insert on storage.objects for insert
  with check (
    bucket_id = 'evidencias'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  );

-- Allow re-upload (upsert) of the same object by the internal roles; no DELETE
-- policy is created, so removals stay denied (lifetime retention, SPEC §7.1).
drop policy if exists evidencias_eng_update on storage.objects;
create policy evidencias_eng_update on storage.objects for update
  using (
    bucket_id = 'evidencias'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  )
  with check (
    bucket_id = 'evidencias'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  );
