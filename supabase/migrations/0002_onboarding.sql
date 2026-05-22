-- =====================================================================
-- Migration 0002 — onboarding tracking
-- =====================================================================
-- Adds a nullable timestamp column to `customers` that records when
-- the onboarding wizard was completed. NULL = not yet completed.
-- The onboarding page guards on this column: if it's set, the user is
-- redirected to /app/dashboard immediately so they don't re-run the
-- wizard on every login.
-- =====================================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
