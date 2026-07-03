-- =====================================================================
-- Migration 0006 — Seed of global settings (F-S001-1)
-- =====================================================================
-- Projection factors and thresholds consumed by the domain core in later
-- sprints (estimateF28 defaults, OCR confidence/attempt limits). Kept in
-- `app_settings` so they are configurable without a deploy.
-- Idempotent: `on conflict (key) do nothing` preserves any operator edits.
-- =====================================================================

insert into app_settings (key, value) values
  ('projection_factor_7d',      '0.70'::jsonb),
  ('projection_factor_14d',     '0.90'::jsonb),
  ('projection_factor_7d_low',  '0.65'::jsonb),
  ('projection_factor_14d_low', '0.85'::jsonb),
  ('ocr_confidence_min',        '0.75'::jsonb),
  ('ocr_max_attempts',          '3'::jsonb)
on conflict (key) do nothing;
