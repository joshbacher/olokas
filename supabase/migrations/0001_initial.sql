-- =====================================================================
-- Olokas — Initial schema migration
-- See code-scaffold.md and business-bible.md for product context.
-- =====================================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector for scan embeddings

-- =====================================================================
-- customers — 1:1 with Supabase auth.users
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT UNIQUE NOT NULL,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT,
  plan                    TEXT NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'paused', 'cancelled')),
  query_limit             INT NOT NULL DEFAULT 1,
  domain_limit            INT NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer
  ON public.customers(stripe_customer_id);

-- =====================================================================
-- domains — websites a customer monitors
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.domains (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  domain       TEXT NOT NULL,
  verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_domains_customer ON public.domains(customer_id);

-- =====================================================================
-- customer_queries — the queries we scan against AI engines
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customer_queries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  domain_id           UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  query               TEXT NOT NULL,
  is_priority         BOOLEAN NOT NULL DEFAULT FALSE,
  scan_interval_hours INT NOT NULL DEFAULT 168,  -- weekly default
  last_scanned_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_queries_customer
  ON public.customer_queries(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_queries_domain
  ON public.customer_queries(domain_id);
CREATE INDEX IF NOT EXISTS idx_customer_queries_due
  ON public.customer_queries(last_scanned_at, scan_interval_hours);

-- =====================================================================
-- query_competitors — competitor domains tracked per query
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.query_competitors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id           UUID NOT NULL REFERENCES public.customer_queries(id) ON DELETE CASCADE,
  competitor_domain  TEXT NOT NULL,
  UNIQUE (query_id, competitor_domain)
);

-- =====================================================================
-- jobs — async work queue (scans, reports, etc.)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL,             -- 'scan' | 'report' | etc.
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  retry_count   INT NOT NULL DEFAULT 0,
  worker_id     TEXT,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_queued
  ON public.jobs(status, created_at)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_jobs_running
  ON public.jobs(status, started_at)
  WHERE status = 'running';

-- =====================================================================
-- scan_results — the actual AI-search measurement records
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.scan_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  query_id            UUID NOT NULL REFERENCES public.customer_queries(id) ON DELETE CASCADE,
  engine              TEXT NOT NULL
                        CHECK (engine IN ('chatgpt', 'perplexity', 'google_aio', 'claude')),
  raw_response        TEXT,
  citations           JSONB,                  -- [{url, title, snippet}, ...]
  target_appeared     BOOLEAN,
  target_position     INT,
  competitors_found   JSONB,                  -- [{domain, position}, ...]
  geo_score           INT,                    -- 0-100 composite metric
  embedding           VECTOR(1536),           -- for change detection
  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_query_engine_time
  ON public.scan_results(query_id, engine, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_customer_time
  ON public.scan_results(customer_id, scanned_at DESC);

-- =====================================================================
-- free_audits — lead-magnet rate-limit and storage
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.free_audits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                    TEXT NOT NULL,
  domain                   TEXT NOT NULL,
  results                  JSONB,
  shareable_token          TEXT UNIQUE,
  converted_to_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_audits_email_time
  ON public.free_audits(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_free_audits_token
  ON public.free_audits(shareable_token)
  WHERE shareable_token IS NOT NULL;

-- =====================================================================
-- reports — weekly customer reports
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  content_html    TEXT,
  content_pdf_url TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'ready', 'sent', 'failed')),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_reports_customer_time
  ON public.reports(customer_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status
  ON public.reports(status, created_at);

-- =====================================================================
-- daily_metrics — daily rollup for the operator briefing
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  date              DATE PRIMARY KEY,
  active_customers  INT NOT NULL DEFAULT 0,
  mrr_cents         BIGINT NOT NULL DEFAULT 0,
  scans_completed   INT NOT NULL DEFAULT 0,
  scans_failed      INT NOT NULL DEFAULT 0,
  free_audits_run   INT NOT NULL DEFAULT 0,
  new_signups       INT NOT NULL DEFAULT 0,
  churned           INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- updated_at maintenance
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_set_updated_at ON public.customers;
CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- RLS — every customer-data table is locked down by default.
-- The service-role key bypasses these for cron / webhook / admin work.
-- =====================================================================
ALTER TABLE public.customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_queries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_competitors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports            ENABLE ROW LEVEL SECURITY;
-- jobs, free_audits, daily_metrics are operator-only — no RLS policies
-- means no anon/authenticated access at all (only service role).
ALTER TABLE public.jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_audits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics      ENABLE ROW LEVEL SECURITY;

-- customers: only the user can read/update their own row
DROP POLICY IF EXISTS "customers_self_select" ON public.customers;
CREATE POLICY "customers_self_select" ON public.customers
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "customers_self_update" ON public.customers;
CREATE POLICY "customers_self_update" ON public.customers
  FOR UPDATE USING (auth.uid() = id);
-- INSERT/DELETE happen only via service role (Stripe webhook).

-- domains: customer owns their rows, full CRUD
DROP POLICY IF EXISTS "domains_owner_all" ON public.domains;
CREATE POLICY "domains_owner_all" ON public.domains
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- customer_queries: customer owns their rows
DROP POLICY IF EXISTS "customer_queries_owner_all" ON public.customer_queries;
CREATE POLICY "customer_queries_owner_all" ON public.customer_queries
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- query_competitors: scoped through the parent query
DROP POLICY IF EXISTS "query_competitors_owner_all" ON public.query_competitors;
CREATE POLICY "query_competitors_owner_all" ON public.query_competitors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_queries q
      WHERE q.id = query_competitors.query_id
        AND q.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_queries q
      WHERE q.id = query_competitors.query_id
        AND q.customer_id = auth.uid()
    )
  );

-- scan_results: read-only for customers, writes via service role
DROP POLICY IF EXISTS "scan_results_owner_select" ON public.scan_results;
CREATE POLICY "scan_results_owner_select" ON public.scan_results
  FOR SELECT USING (auth.uid() = customer_id);

-- reports: read-only for customers
DROP POLICY IF EXISTS "reports_owner_select" ON public.reports;
CREATE POLICY "reports_owner_select" ON public.reports
  FOR SELECT USING (auth.uid() = customer_id);

-- =====================================================================
-- New-user provisioning: when a user signs up via Supabase Auth, create
-- a corresponding customers row at the free tier. The Stripe webhook
-- promotes them to a paid plan after Checkout.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
