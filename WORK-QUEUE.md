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
- **Status:** DONE (commit 41cccde)
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
- **Status:** DONE (commit 06effe4)
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
- **Status:** DONE (commit 17f5a24)
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
- **Status:** PENDING
- **Files:** `lib/audit/mock-report.ts`, `components/audit-report.tsx`, integrate into `app/(marketing)/audit/[auditId]/page.tsx`
- **Spec:**
  - `mock-report.ts` exports `generateMockReport(domain: string, queries: string[]): AuditReport` returning realistic-looking data.
  - `AuditReport` type: `{ geoScore: number, perEngine: { chatgpt, perplexity, googleAio, claude: { score, citations[], targetAppeared } }, topIssues: string[], topWins: string[] }`.
  - `<AuditReport />` component renders this nicely using shadcn `Card`, `Badge` for scores.
  - Big CTA at the bottom: "Monitor this domain weekly for $39/mo →" linking to `/pricing`.
- **DoD:** Polling page transitions to the report after 90s, report renders with realistic-looking mock data.

### 2.5 — Shareable audit URL
- **Status:** PENDING
- **Files:** Update the audit flow to generate a slug-based shareable URL pattern.
- **Spec:**
  - The audit ID is a UUID; the share URL is `/audit/${auditId}` and is publicly accessible (no auth).
  - Add an `<og:image>` meta tag with a generated preview image (a static placeholder for now in `public/og-audit.png` — create a simple one with the brand color and "Olokas Audit Report").
  - Add a "Copy share link" button on the report page.
- **DoD:** Report URL is shareable, copy button works, OG preview shows brand image when shared on X/LinkedIn.

### 2.6 — Email the report (mock for now)
- **Status:** PENDING
- **Files:** `emails/FreeAuditReport.tsx`, integrate into report flow
- **Spec:**
  - React Email template `FreeAuditReport.tsx` that takes `AuditReport` props and renders email-friendly HTML.
  - Use plain `<table>` layout (email-safe), inline styles only.
  - Use `react-email` package? Skip the package for now and write hand-rolled email-safe React. We'll add `react-email` in Phase 5.
  - For now, just save the rendered HTML to a `lastEmail` field in the audit data — actual sending requires Resend env vars (Phase 0 dependency).
- **DoD:** The email template exists and produces valid HTML when called with mock data. No actual sending yet.

### 2.7 — Rate limiting (1 per email per 7 days)
- **Status:** PENDING
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
- **Status:** PENDING
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
- **Status:** PENDING
- **Files:** `app/(marketing)/pricing/page.tsx`
- **Spec:**
  - Three tier cards (Starter $39, Pro $99, Agency $299).
  - Monthly/annual toggle (annual = 16% off — show "save $X/yr").
  - Each card: tier name, price, key features (5-7 bullets), CTA button "Start free audit" (link to /audit) or "Coming soon" (since Stripe isn't wired).
  - FAQ section at bottom (5 Q&A) — pull questions from typical SaaS pricing FAQ patterns.
  - JSON-LD: add a `Service` for each tier with `Offer` price.
- **DoD:** Pricing page renders all three tiers with toggle, FAQ visible, JSON-LD valid.

### 6.2 — Blog index + MDX post pages
- **Status:** PENDING
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
- **Status:** PENDING
- **Files:** Update `app/(marketing)/vs/[competitor]/page.tsx`, add `content/comparisons/*.mdx`
- **Spec:**
  - For each known competitor (semrush, ahrefs, wordlift, seoptimer), generate a comparison page from MDX.
  - Page structure: intro, side-by-side feature table (data lives in MDX frontmatter), "when to choose Olokas" section, "when to choose them" section.
  - Honest tone — no bashing.
  - Competitors as stubs initially; real comparison content can be human-edited later.
- **DoD:** All four comparison pages render with placeholder content and the table component works.

### 6.4 — SEO basics
- **Status:** PENDING
- **Files:** `app/sitemap.ts`, `app/robots.ts`, audit metadata exports across all pages
- **Spec:**
  - `app/sitemap.ts` returns dynamic sitemap including all routes + posts.
  - `app/robots.ts` allows everything except `/app/*`, points to sitemap.
  - Audit every page for proper `metadata` exports including `openGraph` and `twitter`.
  - Add `og:image` for each marketing page (use a generated default if none specified).
- **DoD:** /sitemap.xml lists all routes, /robots.txt allows crawl, every page has metadata.
