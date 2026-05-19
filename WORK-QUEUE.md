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
- **Status:** DONE (commit a180c16)
- **Files:** `app/app/queries/page.tsx`, `app/app/queries/actions.ts`, `components/queries/queries-table.tsx`
- **Spec:**
  - Lists all customer_queries scoped to the current customer (RLS handles the scoping; just SELECT *).
  - Add Query: form with domain selector (from customer's domains), query text, optional priority flag.
  - Edit / Delete via server actions in `actions.ts`.
  - Enforce plan limits: count current queries vs `customers.query_limit` — if at limit, show upgrade CTA instead of Add form.
  - Add Domain: simple form to insert into domains table (also check `customers.domain_limit`).
- **DoD:** All CRUD operations work, RLS prevents seeing other users' data, plan limits enforced.

### 3.7 — Reports page (list view)
- **Status:** DONE (commit fd78c16)
- **Files:** `app/app/reports/page.tsx`
- **Spec:**
  - Lists historical reports from the reports table for the current customer.
  - Empty state: "Reports are generated weekly. You'll see your first report after your first scan completes."
  - Each row: period_end date, status badge, "View" link.
  - View links go to `/app/reports/[id]/page.tsx` — for now stub this with "Report viewer arrives in Phase 5.2".
- **DoD:** /app/reports renders for any authed user, table populates with real data when reports exist, empty state otherwise.

### 3.8 — Settings page (Stripe portal link + account info)
- **Status:** DONE (commit 7e7bd35)
- **Files:** `app/app/settings/page.tsx`, `app/app/settings/actions.ts`
- **Spec:**
  - Section: Account — shows email, plan, status. Read-only.
  - Section: Billing — button "Manage subscription" that calls `/api/portal` and redirects to Stripe Customer Portal. Disabled with "No subscription yet" if `customers.stripe_customer_id` is null.
  - Section: API access (Pro+ only) — "Generate API key" button. Stub with "Phase 4" message for now.
  - Section: Danger zone — "Delete account" with confirm dialog. Deletes auth.users (cascade through customers, etc.). Use a server action.
- **DoD:** Page renders all sections, manage-subscription button correctly enabled/disabled based on subscription state, account deletion works.

### 3.9 — Stripe setup script (creates products + prices)
- **Status:** DONE (commit 3dc42a3)
- **Files:** `scripts/stripe-setup.ts`, update `package.json` to add a "stripe:setup" npm script
- **Spec:**
  - **(needs Stripe creds)** — script will fail if STRIPE_SECRET_KEY env var is missing, with a helpful message.
  - Reads from a constants file `lib/stripe/products.ts` defining the three tiers (Starter $39/mo, Pro $99/mo, Agency $299/mo) plus annual variants (16% off each).
  - For each tier, idempotently: find product by metadata.olokas_tier, create if missing; find price for monthly + annual, create if missing.
  - Prints the resulting price IDs so the operator can paste them into Vercel env vars (STRIPE_PRICE_STARTER_MONTHLY etc., already in .env.example).
  - Designed to be run manually with `npm run stripe:setup` after Stripe API key is set locally.
- **DoD:** Script exists, exits cleanly when STRIPE_SECRET_KEY is missing (with help text), creates/updates products idempotently when run with credentials.

### 3.10 — Stripe Checkout session API route (real implementation)
- **Status:** DONE (commit 8425254)
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
- **Status:** DONE (commit 7801e2968545cdfc4de414fa0dfbe5e668da504a)
- **Files:** `app/api/portal/route.ts`
- **Spec:**
  - **(needs Stripe creds at runtime)** — POST handler, requires authenticated user.
  - Looks up `customers.stripe_customer_id` for the user; 404 if not set.
  - Creates `stripe.billingPortal.sessions.create({ customer, return_url: '/app/settings' })`.
  - Returns `{ url }`. Frontend redirects.
- **DoD:** Build clean, authenticated users with a stripe_customer_id can hit /api/portal.

### 3.12 — Stripe webhook handlers (real subscription lifecycle)
- **Status:** DONE (commit fba14387a722388d710a2251c27c7b5467cb1f04)
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
- **Status:** FAILED — Last attempt: 2026-05-18 (Run #42, audit gate)
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

---

## Operator-initiated items (cron skips BLOCKED status)

### M.1 — Migrate to Next.js 15.x
- **Status:** BLOCKED  *(operator flips to PENDING when ready to invest in the migration)*
- **Why this isn't autonomous:** Next 14.2.x has been abandoned by the security advisory database. Per Run #23's audit output, 24 high/critical advisories on `next@14.2.13` are marked "No fix available." The cron's audit gate now treats unfixable advisories as warnings (so the queue keeps moving), but the underlying advisories are real and should be cleared with a proper migration.
- **Files that need changes:**
  - 6 dynamic-route files need async `params` migration:
    - `app/(marketing)/audit/[auditId]/page.tsx`
    - `app/(marketing)/blog/[slug]/page.tsx`
    - `app/(marketing)/vs/[competitor]/page.tsx`
    - `app/app/reports/[id]/page.tsx`
    - `app/api/audit/[auditId]/email/route.ts`
    - `app/api/audit/[auditId]/status/route.ts`
  - Pattern for each: type changes from `{ params: { key: string } }` to `{ params: Promise<{ key: string }> }`, function body adds `const { key } = await params;` (or rename destructure to `paramsPromise` + `const params = await paramsPromise;` to minimize body changes).
  - `package.json`: bump `next` to `^15.5.18` (latest stable 15.x as of 2026-05-11), `eslint-config-next` to matching major.
  - Decide on React: 15.5.x supports React 18 and 19. Staying on React 18 is simpler.
  - `middleware.ts`: smoke-test — Edge runtime API surface tightened in 15. Code currently uses the async pattern, should port cleanly.
  - `lib/supabase/server.ts` and `lib/supabase/middleware.ts`: `cookies()` is now async-only. Existing code awaits already so should be fine.
- **DoD:**
  - `npm audit --audit-level=high --omit=dev` exits 0 (the 24 next-related advisories clear)
  - `tsc --noEmit` and `next build` both clean
  - Local smoke against `next start`: every previously-200 route still 200
  - Deploy promotes successfully on Vercel
- **Estimated effort:** one focused operator session with adequate disk; not a single cron run.
- **Risk if deferred:** the high-severity advisories remain present. Notable ones include cross-site scripting in App Router with CSP nonces (GHSA-ffhc-5mcf-pf4q), SSRF via WebSocket upgrades (GHSA-c4j6-fc7j-m34r), cache poisoning in RSC responses (GHSA-wfc6-r584-vfw7), and Middleware/Proxy bypass (GHSA-4342-x723-ch2f). Most require specific exploit conditions that don't apply to Olokas's current surface (no Pages Router, no untrusted CSP-nonce-using scripts, no WebSocket upgrades), but the threat surface grows as Phase 3+ ships more endpoints.

---

## Phase 4 readiness — items the cron CAN ship without external accounts

### 4.0 — Marketing nav across all marketing pages
- **Status:** DONE (commit 226558b)
- **Files:** new `components/site-nav.tsx`; integrate into `app/(marketing)/audit/page.tsx`, `app/(marketing)/pricing/page.tsx`, `app/(marketing)/blog/page.tsx`, `app/(marketing)/blog/[slug]/page.tsx`, `app/(marketing)/vs/[competitor]/page.tsx`. The home page already has a Sign-in link beside the BrandMark — extract that pattern into a reusable component.
- **Spec:**
  - `SiteNav` is a server component: BrandMark on the left (links to `/`), simple horizontal nav center-right with `/pricing`, `/audit`, `/blog`, and a `Sign in` link rightmost. All `text-sm font-medium`, muted-foreground default with hover transition to foreground. On `<640px` viewport, collapse the center nav and keep only BrandMark + Sign in.
  - Update the home page (`app/(marketing)/page.tsx`) to import `SiteNav` so the home page header consolidates with the rest of the marketing surface.
  - Aria: `<nav aria-label="Primary">`, current-page state on active link via the `x-pathname` request header (same pattern the /app/* layout uses, see `app/app/layout.tsx`).
- **DoD:** All five marketing routes show the same nav; current-page styling lights up correctly; build + tsc clean; live verification shows /pricing, /audit, /blog, /vs/semrush, /vs/ahrefs, /vs/wordlift, /vs/seoptimer all returning 200 with the new nav.

### 4.1 — Privacy Policy + Terms of Service pages
- **Status:** DONE (commit 29d4043)
- **Files:** `app/(marketing)/privacy/page.tsx`, `app/(marketing)/terms/page.tsx`, footer link updates in `components/site-footer.tsx`
- **Spec:**
  - Two static server-component pages with reasonable boilerplate content (not legal-advice quality; clearly marked as placeholder copy operator must review with counsel before launch).
  - Privacy: GDPR/CCPA-style sections covering data collected (email, domain, queries, scan results), how it's used, third parties (Supabase, Stripe, Resend, SerpAPI, Perplexity, Anthropic), data deletion request flow.
  - Terms: standard SaaS boilerplate — service description, payment terms, acceptable use, termination, disclaimer, governing law placeholder.
  - Both pages use the new `SiteNav` from 4.0.
  - Footer gets links to both alongside the existing email link.
  - Add canonical + noindex:false metadata.
- **DoD:** Both pages render at HTTP 200, footer links to them, build clean. Operator reviews copy and updates if needed.

### 4.2 — Custom 404 / not-found page
- **Status:** DONE (commit <pending>)
- **Files:** `app/not-found.tsx`
- **Spec:**
  - Replace Next's default 404 with a branded page using `SiteNav` (from 4.0).
  - Headline "Page not found" with mildly dry copy ("That link goes somewhere we haven't built. Or it never existed. Hard to say."). Two CTAs: home link, audit link. Brand mark in the middle.
  - Match the home page's visual density.
- **DoD:** `next build` recognizes the new not-found file (visible in route table); /any-random-path returns 404 with the new page; build clean.

### 4.3 — First two real blog posts (1,500+ words each)
- **Status:** DONE (commit <pending>)
- **Files:** `content/posts/what-is-geo.mdx`, `content/posts/how-ai-search-picks-citations.mdx`
- **Spec:**
  - Post 1: "What is GEO? (Generative Engine Optimization in 2026)" — definitional, 1,500–2,000 words. Target keyword: "generative engine optimization". Audience: SMB owners and marketing managers who've heard the term but don't have working definitions yet. Cover: what GEO is, how it differs from SEO, the four engines that matter, what a "GEO score" means in practice, 3 quick wins anyone can do today.
  - Post 2: "How AI Search Engines Pick What to Cite" — technical-but-accessible, 1,500–2,000 words. Target keyword: "how chatgpt picks sources" or "AI search citations". Cover: how ChatGPT/Perplexity/AI Overviews/Claude select citations differently, the role of structured data (JSON-LD), why some sites get cited and others don't, what you can ship in 30 minutes to be more citable.
  - Frontmatter for each: title, slug, excerpt, publishedAt (today's date in UTC), author "Olokas", tags ["GEO", "AI search"] (varied), coverImage omitted (will fall back to og-default).
  - Voice: matches bible §4 — direct, mildly dry, never breathless. No "Revolutionize your AI presence!" energy.
- **DoD:** Both posts render at `/blog/what-is-geo` and `/blog/how-ai-search-picks-citations`. `/blog` index lists all 3 posts (with the original `welcome` post). Sitemap.xml includes them. tsc + next build clean.

### 4.4 — GitHub Actions cron workflows (wire up the existing /api/cron/* routes)
- **Status:** PENDING
- **Files:** `.github/workflows/dispatch-scans.yml`, `.github/workflows/recover-stuck-jobs.yml`, `.github/workflows/daily-rollup.yml`, `.github/workflows/payment-recovery.yml`, `.github/workflows/generate-reports.yml`, `.github/workflows/send-reports.yml`
- **Spec:**
  - Each workflow is a separate YAML file with `on.schedule` matching the cadence documented in `code-scaffold.md` cron table (dispatch-scans every 15 min, recover-stuck-jobs every 30 min, daily-rollup daily 23:55 UTC, payment-recovery daily 9am UTC, generate-reports Mondays 5am UTC, send-reports Mondays 6am UTC).
  - Each job is a single step: `curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" "https://olokas.com/api/cron/<name>"` with a request timeout and failure on non-2xx response.
  - `CRON_SECRET` comes from GitHub Actions secrets (operator sets this after the cron prompt confirms the workflows file exists — see operator todo at bottom of queue).
  - Each workflow includes a `workflow_dispatch:` trigger so the operator can run manually for testing.
  - Concurrency control: `concurrency: { group: cron-<name>, cancel-in-progress: false }` so overlapping invocations don't pile up.
- **DoD:** Six workflow files exist and pass `actionlint` if available. The workflows are documented (a `.github/workflows/README.md` lists each and what it does). Operator action item: add `CRON_SECRET` to GitHub Actions secrets — flagged in the commit body so operator notices.

---

## Operator-action items (the cron does not attempt these — they need accounts or external decisions)

### O.1 — Verify Resend domain and switch Supabase auth emails to use Resend
- **Status:** BLOCKED  *(operator unblocks by completing Resend domain verification)*
- **Why this isn't autonomous:** Resend domain verification requires adding DNS records to olokas.com's DNS provider (Cloudflare) and waiting for verification, then updating Supabase Auth → SMTP settings with the Resend credentials. None of which the cron can do.
- **What to do:**
  1. Resend dashboard → Domains → Add → enter `olokas.com` → copy the SPF, DKIM, and DMARC records.
  2. Cloudflare DNS for olokas.com → add the three records exactly as Resend shows them.
  3. Wait 5–60 minutes for propagation, click "Verify" in Resend.
  4. Once verified, in Supabase → Authentication → Email Templates → SMTP Settings, switch from "Supabase managed" to custom SMTP. Use Resend's SMTP endpoint (`smtp.resend.com:465`, your Resend API key as the password, `resend` as the username).
  5. Customize the Supabase auth email templates (Confirm signup, Magic link, Reset password) with branded Olokas copy.
- **DoD:** Sending a test magic link from olokas.com results in an email from `hello@olokas.com` (not noreply@mail.app.supabase.io), rendered with the new branded template.

### O.2 — Phase 4 prep: gather API credentials for real scan engines
- **Status:** BLOCKED  *(operator unblocks by creating accounts and saving credentials)*
- **Why this isn't autonomous:** Each provider requires account creation, sometimes billing setup, sometimes business verification. The cron cannot do any of these.
- **What to do, save credentials in `.secrets/`:**
  1. **Anthropic API key** — console.anthropic.com → API keys → create one. Save as `.secrets/anthropic-api-key.txt`. Set a $50/mo spend cap to start.
  2. **SerpAPI** — serpapi.com → free tier (250 searches/mo) for dev; upgrade to a paid plan when launching. Save as `.secrets/serpapi-key.txt`.
  3. **Perplexity API** — perplexity.ai/settings/api → create key. Save as `.secrets/perplexity-key.txt`.
  4. **Hetzner Cloud account** — hetzner.com/cloud → create account. Do NOT provision the CPX21 VPS yet; we'll do that during Phase 4 deployment.
  5. Add all corresponding env vars to Vercel (Settings → Environment Variables): `ANTHROPIC_API_KEY`, `SERPAPI_KEY`, `PERPLEXITY_API_KEY`. Production environment only for these.
- **DoD:** All three API key files exist in `.secrets/`. Vercel env vars set. A `phase-4-ready: yes` marker can then be added by the operator to unblock the Phase 4 queue items (which will land in a follow-up planning session).
