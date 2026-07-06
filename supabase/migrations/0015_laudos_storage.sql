-- =====================================================================
-- Migration 0015 — Private 'laudos' Storage bucket + policies (S008)
-- =====================================================================
-- The generated report PDFs live in a PRIVATE bucket:
--   * laudos/<id>/original.pdf  — the locked, unsigned PDF (F-S008-1);
--   * laudos/<id>/assinado.pdf  — the gov.br-signed PDF (F-S008-2).
--
-- The Edge Functions (`gerar-laudo-pdf`, `upload-laudo-assinado`) write these
-- with the service_role (bypasses RLS). The office panel READS them by minting a
-- short-lived signed URL under the engineer's own session ("Baixar Laudo (PDF)",
-- F-S008-2 CA1), so the two internal engineering roles need a SELECT policy here.
--
-- Clients NEVER touch this bucket directly — the client portal download of a
-- signed report (US18) is added in S009. Mirrors the evidencias pattern (0012):
-- private bucket, eng-only object policies, no DELETE policy (lifetime retention,
-- SPEC §7.1). `public.current_role_name()` is schema-qualified because storage
-- policies do not run with `public` on the search_path. Idempotent.
-- =====================================================================

-- ---------- Private bucket ----------
insert into storage.buckets (id, name, public)
values ('laudos', 'laudos', false)
on conflict (id) do update set public = false;

-- ---------- storage.objects policies (eng_lab / eng_escritorio only) ----------
drop policy if exists laudos_eng_select on storage.objects;
create policy laudos_eng_select on storage.objects for select
  using (
    bucket_id = 'laudos'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  );

drop policy if exists laudos_eng_insert on storage.objects;
create policy laudos_eng_insert on storage.objects for insert
  with check (
    bucket_id = 'laudos'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  );

-- Allow re-upload (upsert) of the same object by the internal roles (regenerating
-- the original PDF, or replacing a signed one on correction); no DELETE policy is
-- created, so removals stay denied (lifetime retention, SPEC §7.1).
drop policy if exists laudos_eng_update on storage.objects;
create policy laudos_eng_update on storage.objects for update
  using (
    bucket_id = 'laudos'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  )
  with check (
    bucket_id = 'laudos'
    and public.current_role_name() in ('eng_lab', 'eng_escritorio')
  );
