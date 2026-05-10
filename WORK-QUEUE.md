# Olokas Build Queue

This file is the source of truth for the autonomous build cron (see `.claude/build-cron.md` description).

## How to read this file

- The cron picks the **first item with status `PENDING`** and works on it.
- Items are processed in order, top to bottom.
- Each item is sized to fit in a single ~30-60 minute autonomous session and produce one commit.
- The cron updates the status field after each run.
- A human can mark an item as `BLOCKED` (with a reason) to skip it.
- A human can re-add detail to the spec at any time.

## Statuses

- `PENDING` — not yet started
- `IN_PROGRESS` — claimed by a current run (rare; runs should be atomic)
- `DONE` — completed and shipped (commit hash recorded)
- `FAILED` — last attempt failed; will be retried on next run unless marked `BLOCKED`
- `BLOCKED` — human-deferred; cron will skip

---

## Phase 2: Free audit tool

### 2.1 — Free audit form UI
- **Status:** DONE (commit 87e114e)
- **Files:** `app/(marketing)/audit/page.tsx`, possibly new `components/audit-form.tsx`
- **Spec:**
  - Replace placeholder `app/(marketing)/audit/page.tsx` with a full form UI.
  - Fields: domain (required, basic URL validation), email (required), 5 query inputs (text, label "Query 1" … "Query 5", at least 1 required).
  - Visual style matches home page voice: clean, no gradients, dense info-per-pixel.
  - Submit handler calls `POST /api/audit` (which is currently a 501 stub — that's fine; this PR only does the form).
  - Use shadcn `Input` and `Button` components, brand mark at top.
  - Show client-side validation errors inline.
  - On submit, disable the button and show "Starting your audit…" — actual flow lives in 2.3.
- **DoD:** `/audit` page renders the form, form validates client-side, submit hits `/api/audit` (which still returns 501), build clean.

### 2.2 — Query suggestion engine (helper, no UI yet)
- **Status:** DONE (commit 87e114e)
- **Files:** `lib/queries/suggest.ts`, plus a tiny test page `app/(marketing)/audit/suggest-test/page.tsx` (gated to dev only via `process.env.NODE_ENV`)
- **Spec:**
  - Implement `suggestQueriesFromUrl(url: string): Promise<string[]>` that:
    - Fetches the URL with a 10s timeout
    - Parses the HTML to extract `<title>`, first `<h1>`, and `<meta name="description">`
    - Builds 5 plausible customer-style queries from those signals using deterministic templates (no LLM call yet — that's Phase 4)
    - Examples of templates: "what is {brand}", "how does {brand} compare to {competitor}", "is {brand} worth it", "best {category} for small business"
  - Returns an array of 5 strings.
  - Falls back to generic queries if fetch fails.
- **DoD:** Function exists, has unit-test-ready shape, the dev test page calls it and shows output, build clean.

### 2.3 — Free audit submit handler with mock job enqueue
- **Status:** DONE (commit 87e114e)
- **Files:** `app/api/audit/route.ts`, `app/(marketing)/audit/[auditId]/page.tsx`
- **Spec:**
  - `POST /api/audit` accepts `{ domain, email, queries[] }`.
  - Generates a UUID `auditId`, stores nothing yet (Supabase wiring is Phase 3 prep), returns `{ auditId, statusUrl: "/audit/${auditId}" }`.
  - Form on `/audit` redirects to `/audit/${auditId}` on success.
  - `/audit/[auditId]` page polls `GET /api/audit/${auditId}/status` (also stubbed) every 3s for up to 90s.
  - During polling, displays "did you know" cards (3-4 facts about AI search visibility — pull from a static array in `lib/audit/facts.ts`).
  - After 90s, simulates completion and renders mock report (real rendering in 2.5).
- **DoD:** Submit → redirect → 90s polling page with rotating facts → mock completion message. Build clean.

### 2.4 — Mock report data + rendering
- **Status:** DONE (commit 87e114e)
- **Files:** `lib/audit/mock-report.ts`, `components/audit-report.tsx`, integrate into `app/(marketing)/audit/[auditId]/page.tsx`
- **Spec:**
  - `mock-report.ts` exports `generateMockReport(domain: string, queries: string[]): AuditReport` returning realistic-looking data.
  - `AuditReport` type: `{ geoScore: number, perEngine: { chatgpt, perplexity, googleAio, claude: { score, citations[], targetAppeared } }, topIssues: string[], topWins: string[] }`.
  - `<AuditReport />` component renders this nicely using shadcn `Card`, `Badge` for scores.
  - Big CTA at the bottom: "Monitor this domain weekly for $39/mo →" linking to `/pricing`.
- **DoD:** Polling page transitions to the report after 90s, report renders with realistic-looking mock data.

### 2.5 — Shareable audit URL
- **Status:** DONE (commit 87e114e)
- **Files:** Update the audit flow to generate a slug-based shareable URL pattern.
- **Spec:**
  - The audit ID is a UUID; the share URL is `/audit/${auditId}` and is publicly accessible (no auth).
  - Add an `<og:image>` meta tag with a generated preview image (a static placeholder for now in `public/og-audit.png` — create a simple one with the brand color and "Olokas Audit Report").
  - Add a "Copy share link" button on the report page.
- **DoD:** Report URL is shareable, copy button works, OG preview shows brand image when shared on X/LinkedIn.

### 2.6 — Email the report (mock for now)
- **Status:** DONE (commit 87e114e)
- **Files:** `emails/FreeAuditReport.tsx`, integrate into report flow
- **Spec:**
  - React Email template `FreeAuditReport.tsx` that takes `AuditReport` props and renders email-friendly HTML.
  - Use plain `<table>` layout (email-safe), inline styles only.
  - Use `react-email` package? Skip the package for now and write hand-rolled email-safe React. We'll add `react-email` in Phase 5.
  - For now, just save the rendered HTML to a `lastEmail` field in the audit data — actual sending requires Resend env vars (Phase 0 dependency).
- **DoD:** The email template exists and produces valid HTML when called with mock data. No actual sending yet.

### 2.7 — Rate limiting (1 per email per 7 days)
- **Status:** DONE (commit 87e114e)
- **Files:** `lib/audit/rate-limit.ts`, integrate into `/api/audit` route
- **Spec:**
  - Implement `checkRateLimit(email: string): Promise<{ allowed: boolean, retryAfter?: Date }>`.
  - For now, store rate-limit state in an in-memory Map (acceptable for a stubbed flow) — clear note in code that this needs to move to Supabase `free_audits` table in Phase 3.
  - If rate limit hit, `/api/audit` returns 429 with the retry-after timestamp.
  - The form shows a friendly error when rate-limited.
- **DoD:** Submitting twice from same email within 7 days returns 429.

---

## Phase 5: Email templates (drafts; no real sending)

### 5.1 — Five core React Email templates
- **Status:** DONE (commit 87e114e)
- **Files:** `emails/WeeklyReport.tsx`, `emails/Welcome.tsx`, `emails/FailedPayment.tsx`, `emails/CancellationConfirmation.tsx`, `emails/FreeAuditReport.tsx` (already in 2.6)
- **Spec:**
  - Plain hand-rolled email-safe React using inline styles. Mobile-friendly (max-width 600px, fluid).
  - Each template takes typed props (no real data fetch — props are passed in).
  - WeeklyReport: greeting, MRR-status-style summary of last week's GEO score per engine, top changes, footer.
  - Welcome: "thanks for signing up, here's how to add your first query" — links to /app/onboarding.
  - FailedPayment: 3 variants (day 1, 3, 7) — escalating tone, with "update payment" button to Stripe Customer Portal.
  - CancellationConfirmation: "we're sorry to see you go, your account stays active until {periodEnd}".
  - All templates render to valid HTML when given mock props.
- **DoD:** All 5 templates exist, render without errors when test-called with mock data, build clean.

---

## Phase 6: Marketing site

### 6.1 — Pricing page
- **Status:** DONE (commit 87e114e)
- **Files:** `app/(marketing)/pricing/page.tsx`
- **Spec:**
  - Three tier cards (Starter $39, Pro $99, Agency $299).
  - Monthly/annual toggle (annual = 16% off — show "save $X/yr").
  - Each card: tier name, price, key features (5-7 bullets), CTA button "Start free audit" (link to /audit) or "Coming soon" (since Stripe isn't wired).
  - FAQ section at bottom (5 Q&A) — pull questions from typical SaaS pricing FAQ patterns.
  - JSON-LD: add a `Service` for each tier with `Offer` price.
- **DoD:** Pricing page renders all three tiers with toggle, FAQ visible, JSON-LD valid.

### 6.2 — Blog index + MDX post pages
- **Status:** DONE (commit 87e114e)
- **Files:** `app/(marketing)/blog/page.tsx`, `app/(marketing)/blog/[slug]/page.tsx`, `content/posts/*.mdx`, `lib/posts.ts`
- **Spec:**
  - Add `next-mdx-remote` for MDX rendering (or similar lightweight option).
  - Implement `getAllPosts()` and `getPostBySlug(slug)` reading from `content/posts/*.mdx`.
  - Frontmatter schema: `{ title, slug, excerpt, publishedAt, author, tags, coverImage? }`.
  - Blog index lists all posts sorted by date desc, paginated to 10/page.
  - Post page shows title, author, date, reading time, content, related posts (last 3 by tag overlap).
  - Auto-generate `/sitemap.xml` including all posts.
  - Create ONE seed post at `content/posts/welcome.mdx` titled "What Olokas Measures" (~1,500 words) on the GEO category — neutral, factual, no sales pitch.
- **DoD:** /blog lists the seed post, /blog/welcome renders MDX, sitemap.xml lists it.

### 6.3 — Comparison pages (vs/[competitor])
- **Status:** DONE (commit 87e114e)
- **Files:** Update `app/(marketing)/vs/[competitor]/page.tsx`, add `content/comparisons/*.mdx`
- **Spec:**
  - For each known competitor (semrush, ahrefs, wordlift, seoptimer), generate a comparison page from MDX.
  - Page structure: intro, side-by-side feature table (data lives in MDX frontmatter), "when to choose Olokas" section, "when to choose them" section.
  - Honest tone — no bashing.
  - Competitors as stubs initially; real comparison content can be human-edited later.
- **DoD:** All four comparison pages render with placeholder content and the table component works.

### 6.4 — SEO basics
- **Status:** DONE (commit 87e114e)
- **Files:** `app/sitemap.ts`, `app/robots.ts`, audit metadata exports across all pages
- **Spec:**
  - `app/sitemap.ts` returns dynamic sitemap including all routes + posts.
  - `app/robots.ts` allows everything except `/app/*`, points to sitemap.
  - Audit every page for proper `metadata` exports including `openGraph` and `twitter`.
  - Add `og:image` for each marketing page (use a generated default if none specified).
- **DoD:** /sitemap.xml lists all routes, /robots.txt allows crawl, every page has metadata.

---

## Phase 3: Auth + Dashboard + Billing

These items assume the Supabase migration has been run (it has — see commit notes on the migration step). Items marked **(needs Stripe creds)** can have their code written but won't function end-to-end until `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in Vercel env vars. Code still ships; functionality activates when creds land.

### 3.1 — Supabase Auth UI (sign-in / sign-up with magic link)
- **Status:** DONE (commit 87e114e)
- **Files:** `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/auth/callback/route.ts`, `components/auth/magic-link-form.tsx`
- **Spec:**
  - Replace the placeholder login/signup pages with real magic-link flows using `@supabase/ssr`.
  - Login page: single email input + "Send magic link" button. On submit, calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: ... } })`. Show success state ("Check your email") after sending.
  - Signup page: same form (Supabase auth does sign-up + sign-in via magic link uniformly), but copy framed for new accounts.
  - `app/(auth)/auth/callback/route.ts` handles the magic-link redirect: exchanges the code for a session, then redirects to `/app/dashboard` (or `/app/onboarding` if it's the user's first login — check by querying customers table for an existing row).
  - Both pages: BrandMark at top, simple layout, uses shadcn Input + Button.
- **DoD:** /login and /signup both render the magic-link form, callback route exchanges code for session and redirects, build clean.

### 3.2 — Auth middleware (session refresh on every request)
- **Status:** DONE (commit 87e114e)
- **Files:** new `middleware.ts` at repo root, possibly update `lib/supabase/middleware.ts` helper
- **Spec:**
  - Per `@supabase/ssr` docs, add a `middleware.ts` that calls `supabase.auth.getUser()` on every request to refresh the session cookie.
  - Matcher: skip static assets and Next.js internals (`/_next/*`, favicon, etc.) — only match real routes.
  - The middleware runs ahead of layouts, ensuring `createClient()` in server components has fresh auth state.
  - Don't redirect from middleware — that's the layout's job. Middleware just refreshes.
- **DoD:** middleware.ts exists, build is clean, after a magic-link sign-in cookies persist across reloads.

### 3.3 — Real /app/* auth guard
- **Status:** DONE (commit 2ede631)
- **Files:** `app/app/layout.tsx`
- **Spec:**
  - Replace the existing stub layout (which has a try/catch fallback to "allow through") with a real auth guard.
  - At top of layout: `const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();` — if no user, `redirect('/login?next=' + currentPath)`.
  - Keep a top nav inside the authed shell: brand on left, links to /app/dashboard, /app/queries, /app/reports, /app/settings, "Sign out" on right.
  - Sign out: server action that calls `supabase.auth.signOut()` and redirects to `/`.
  - Remove the "Dashboard scaffold" yellow notice banner that's there now.
- **DoD:** Unauthenticated users hitting /app/* get redirected to /login. Authenticated users see the nav. Sign-out works.

### 3.4 — Customer record provisioning fallback
- **Status:** DONE (commit 948a187)
- **Files:** `lib/customers/ensure.ts`, integrated into `app/app/layout.tsx`
- **Spec:**
  - The Supabase migration includes a `handle_new_user` trigger that creates a `customers` row on auth.users insert. But triggers can fail silently in edge cases.
  - `ensureCustomerRecord(userId, email)` checks if a customers row exists; if not, creates one (using service-role client, since RLS could block it via anon).
  - Called from `/app/layout.tsx` right after auth check. Idempotent — safe to call every request.
  - Returns the customer record so the layout can pass it to children via context.
- **DoD:** New users (sign-up flow) reliably get a customers row even if the trigger fails. Existing users get their row fetched. Build clean.

### 3.5 — Dashboard overview page
- **Status:** DONE (commit d88cea7)
- **Files:** `app/app/dashboard/page.tsx`, `components/dashboard/overview-cards.tsx`
- **Spec:**
  - Fetches the customer's domains, query count, last scan timestamp, and latest GEO score per engine (from scan_results table — empty for new users).
  - Top section: 4 stat cards (Total domains, Active queries, Last scan, Avg GEO score across engines).
  - Section: "Recent activity" — last 10 scan results across all queries, table format using shadcn Table primitives (you may need to install: `components/ui/table.tsx` if missing — minimal shadcn version).
  - Empty state for fresh accounts: "Add your first domain in /app/queries" with link.
- **DoD:** Dashboard renders for any authed user, shows real data from Supabase or empty state. Build clean.

### 3.6 — Queries page (CRUD with plan limits)
- **Status:** DONE (commit <pending>)
- **Files:** `app/app/queries/page.tsx`, `app/app/queries/actions.ts`, `components/queries/queries-table.tsx`
- **Spec:**
  - Lists all customer_queries scoped to the current customer (RLS handles the scoping; just SELECT *).
  - Add Query: form with domain selector (from customer's domains), query text, optional priority flag.
  - Edit / Delete via server actions in `actions.ts`.
  - Enforce plan limits: count current queries vs `customers.query_limit` — if at limit, show upgrade CTA instead of Add form.
  - Add Domain: simple form to insert into domains table (also check `customers.domain_limit`).
- **DoD:** All CRUD operations work, RLS prevents seeing other users' data, plan limits enforced.

### 3.7 — Reports page (list view)
- **Status:** PENDING
- **Files:** `app/app/reports/page.tsx`
- **Spec:**
  - Lists historical reports from the reports table for the current customer.
  - Empty state: "Reports are generated weekly. You'll see your first report after your first scan completes."
  - Each row: period_end date, status badge, "View" link.
  - View links go to `/app/reports/[id]/page.tsx` — for now stub this with "Report viewer arrives in Phase 5.2".
- **DoD:** /app/reports renders for any authed user, table populates with real data when reports exist, empty state otherwise.

### 3.8 — Settings page (Stripe portal link + account info)
- **Status:** PENDING
- **Files:** `app/app/settings/page.tsx`, `app/app/settings/actions.ts`
- **Spec:**
  - Section: Account — shows email, plan, status. Read-only.
  - Section: Billing — button "Manage subscription" that calls `/api/portal` and redirects to Stripe Customer Portal. Disabled with "No subscription yet" if `customers.stripe_customer_id` is null.
  - Section: API access (Pro+ only) — "Generate API key" button. Stub with "Phase 4" message for now.
  - Section: Danger zone — "Delete account" with confirm dialog. Deletes auth.users (cascade through customers, etc.). Use a server action.
- **DoD:** Page renders all sections, manage-subscription button correctly enabled/disabled based on subscription state, account deletion works.

### 3.9 — Stripe setup script (creates products + prices)
- **Status:** PENDING
- **Files:** `scripts/stripe-setup.ts`, update `package.json` to add a "stripe:setup" npm script
- **Spec:**
  - **(needs Stripe creds)** — script will fail if STRIPE_SECRET_KEY env var is missing, with a helpful message.
  - Reads from a constants file `lib/stripe/products.ts` defining the three tiers (Starter $39/mo, Pro $99/mo, Agency $299/mo) plus annual variants (16% off each).
  - For each tier, idempotently: find product by metadata.olokas_tier, create if missing; find price for monthly + annual, create if missing.
  - Prints the resulting price IDs so the operator can paste them into Vercel env vars (STRIPE_PRICE_STARTER_MONTHLY etc., already in .env.example).
  - Designed to be run manually with `npm run stripe:setup` after Stripe API key is set locally.
- **DoD:** Script exists, exits cleanly when STRIPE_SECRET_KEY is missing (with help text), creates/updates products idempotently when run with credentials.

### 3.10 — Stripe Checkout session API route (real implementation)
- **Status:** PENDING
- **Files:** `app/api/checkout/route.ts`
- **Spec:**
  - **(needs Stripe creds at runtime)** — POST handler accepts `{ priceId }`, requires authenticated user.
  - Validates priceId against the allowlist (the price IDs from the env vars set up in 3.9).
  - Looks up customers row for the authed user; if no `stripe_customer_id`, creates a Stripe customer first.
  - Creates Checkout session with mode='subscription', line_items=[{ price: priceId, quantity: 1 }], success_url and cancel_url pointing back to /app/onboarding and /pricing.
  - Returns `{ url }`. Frontend redirects to it.
  - All errors return JSON with status code, never expose Stripe internals.
- **DoD:** Authenticated user can call /api/checkout with a valid priceId and get a session URL. Build clean. (E2E only works with real Stripe creds.)

### 3.11 — Stripe Customer Portal API route
- **Status:** PENDING
- **Files:** `app/api/portal/route.ts`
- **Spec:**
  - **(needs Stripe creds at runtime)** — POST handler, requires authenticated user.
  - Looks up `customers.stripe_customer_id` for the user; 404 if not set.
  - Creates `stripe.billingPortal.sessions.create({ customer, return_url: '/app/settings' })`.
  - Returns `{ url }`. Frontend redirects.
- **DoD:** Build clean, authenticated users with a stripe_customer_id can hit /api/portal.

### 3.12 — Stripe webhook handlers (real subscription lifecycle)
- **Status:** PENDING
- **Files:** `app/api/webhooks/stripe/route.ts`
- **Spec:**
  - Replace the existing stub (which only logs events) with real handlers for the events listed below.
  - Use the service-role Supabase client (createAdminClient) to bypass RLS.
  - `checkout.session.completed`: pull customer_id and subscription_id from session, update customers row with `stripe_customer_id`, `stripe_subscription_id`, set plan based on the price ID, set query_limit + domain_limit per plan.
  - `customer.subscription.updated`: re-derive plan from current price ID, update query_limit and domain_limit.
  - `customer.subscription.deleted`: set plan='free', status='cancelled', preserve data for 30 days (don't actually delete here; that's a separate cron).
  - `invoice.payment_failed`: set customers.status='past_due'. (Recovery email is Phase 5.)
  - `invoice.payment_succeeded`: set customers.status='active'.
  - All handlers idempotent — same event delivered twice produces same final state.
- **DoD:** Real subscription lifecycle is implemented. Build clean. (E2E test requires real Stripe webhook events.)

### 3.13 — Onboarding flow (4-step post-checkout)
- **Status:** PENDING
- **Files:** `app/app/onboarding/page.tsx`, `app/app/onboarding/actions.ts`, `components/onboarding/*`
- **Spec:**
  - 4 steps as separate components, switched via local state (no URL routing per step):
    1. Confirm primary domain (read from customers — if not set, ask)
    2. Suggest 10 starter queries based on the domain (use lib/queries/suggest.ts from item 2.2)
    3. Optional: add up to 5 competitor domains per query
    4. Schedule first scan (insert a job row with status='queued' for each query × engine combo) — when complete, redirect to /app/dashboard with toast "Your first scan is running."
  - Progress indicator at top showing current step.
  - "Skip for now" link on each step → /app/dashboard, but track that onboarding wasn't completed.
- **DoD:** New user post-Checkout flows through all 4 steps, ends with queued scan jobs, lands on dashboard.
