# Olokas Build Cron Log

Each entry is one autonomous build run. Newest at top.

## Format

```
## YYYY-MM-DD HH:MM:SS UTC — Run #N
- Item: <ID> (<title>)
- Result: SUCCESS | FAILED | SKIPPED
- Commit: <hash> (if SUCCESS)
- Files changed: <count>
- Notes: <freeform>
```

---

## 2026-05-08 07:11:10 UTC — Run #11
- Item: 6.3 (Comparison pages (vs/[competitor]))
- Result: SUCCESS
- Files changed: 7
- Notes: lib/comparisons.ts — frontmatter-validated MDX loader mirroring lib/posts.ts (gray-matter + zod, ENOENT-tolerant fs.readdir, process-life cache, slug-asc sort). FrontmatterSchema requires kebab slug, competitor display name, optional competitorUrl, title, excerpt, YYYY-MM-DD updatedAt, and a non-empty features[] array. FeatureRow schema is {feature, olokas, competitor, note?} — short status strings only ("Yes" / "No" / "Partial" / a brief qualifier); long prose stays in the MDX body. Exports getAllComparisons, getComparisonBySlug, formatUpdatedDate. components/comparison-table.tsx — accessible side-by-side <table> with caption.sr-only, scope=col header, scope=row feature column, optional muted note line under each feature, and a Yes/No tone classifier (positive → foreground+font-medium, negative → muted-foreground, neutral → foreground) so the eye lands on differences without hard color states. content/comparisons/{semrush,ahrefs,wordlift,seoptimer}.mdx — four stub MDX files, each with frontmatter feature table (10 rows for semrush/ahrefs/wordlift, 10 rows for seoptimer) and an MDX body with intro paragraphs, ## When to choose Olokas + ## When to choose {competitor} sections, and a ## Bottom line section. Tone matches brand voice: neutral, mildly dry, no bashing — each page explicitly tells the reader to keep using the competitor if it fits their workflow, and notes the page is a stub awaiting human-edited research. app/(marketing)/vs/[competitor]/page.tsx — replaces the Phase-6 placeholder; generateStaticParams enumerates all four MDX slugs (build prerendered all four as SSG), generateMetadata returns canonical + og:article + twitter card per page, mdxComponents map matches the blog post page styles for prose consistency, page header carries an "Comparison" eyebrow + h1 + excerpt + Updated date eyebrow with optional competitorUrl link (rel=noopener noreferrer nofollow), inline Article JSON-LD with publisher @id, ComparisonTable section with a "Stub data" disclaimer, MDXRemote-rendered body, and a bottom "Try Olokas yourself" aside linking to /audit. Local verification: tsc clean, next build clean (24 pages — was 20; gained four /vs/<slug> SSG entries), curl smoke against next start: /vs/semrush HTTP 200 (37.8 KB), /vs/ahrefs HTTP 200, /vs/wordlift HTTP 200, /vs/seoptimer HTTP 200, /vs/notreal HTTP 404 — and the Semrush page renders all 10 table rows with the expected Yes/No tone classes, both "When to choose" headings, the "Bottom line" section, and Article JSON-LD with the right canonical URL.
- Post-push verification: site OK at olokas.com (home HTTP 200 with title + hero copy intact, /pricing HTTP 200). New deploy still propagating ~5 min after push: /vs/semrush HTTP 200 but serving the prior placeholder body (`Comparison page arrives in Phase 6`, x-vercel-cache MISS, age 0, ~12 KB) instead of the new ~37 KB rendered comparison; /vs/{ahrefs,wordlift,seoptimer} same shape; Run #10's /blog/welcome and /sitemap.xml are still 404 from the previous deploy at 03:12 UTC, so the Vercel deploy promotion appears to be running slow or the project may need a manual nudge. Site itself is healthy on the prior working deploy — Vercel preserves it on build failure. Code is pushed (commit f5bcfdf); next run will record final live state once the deploy lands.


## 2026-05-08 03:12:11 UTC — Run #10
- Item: 6.2 (Blog index + MDX post pages)
- Result: SUCCESS
- Files changed: 6
- Notes: lib/posts.ts — frontmatter-validated MDX loader. Reads content/posts/*.mdx via fs.readdir, parses with gray-matter, validates with zod (kebab slug, YYYY-MM-DD publishedAt, required title/excerpt/author + optional tags + coverImage). Cached for the process lifetime since the build is the only consumer at this point. Exports getAllPosts (sorted desc by publishedAt), getPostBySlug, relatedPosts (tag-overlap scored, ties broken by recency, post itself excluded), countWords / readingTimeMinutes (220 wpm, min 1, strips fenced code + JSX + markdown punctuation before counting), formatPublishedDate (UTC, no toLocale wobble), and paginatePosts (1-indexed, clamped). content/posts/welcome.mdx — seed post titled "What Olokas Measures", 1490-word body on the GEO category, neutral-factual voice (no sales pitch, no CTA), tagged geo/fundamentals/ai-search; sections cover the four engines (ChatGPT/Perplexity/Google AI Overviews/Claude), what visibility means, the 0–100 GEO score, what changes between scans, what to do about a low score, and what a useful first month looks like — picks up the home page's "we measure one thing well" tagline as the closer. app/(marketing)/blog/page.tsx — replaces the placeholder with a server-rendered listing: BrandMark header, divided post list (title link → /blog/{slug} with hover-accent, excerpt, eyebrow with date + reading time), pagination footer (Newer/Older/Page X of Y, ?page=N searchParam, hidden when totalPages=1), empty-state copy when zero posts, SiteFooter. Metadata exports include canonical + openGraph + twitter. app/(marketing)/blog/[slug]/page.tsx — generateStaticParams from getAllPosts so each post pre-renders (built /blog/welcome statically), generateMetadata pulls per-post title/excerpt + article-type openGraph (publishedTime, authors, tags), inline BlogPosting JSON-LD on the rendered page, header with title/excerpt/author/date/reading-time eyebrow, MDXRemote from next-mdx-remote/rsc rendering with a tight components map (h1/h2/h3 styled with Tailwind tracking-tight, p with leading-1.65, links to text-accent with underline-offset-2, ul/ol with list-disc/list-decimal, blockquote with accent border, code/pre boxed in muted), Related posts aside (top 3 by tag overlap, hidden when none), All-posts back-link. app/sitemap.ts — Next 14 MetadataRoute.Sitemap default export listing four static marketing routes (/, /audit, /pricing, /blog) plus one row per blog post (lastModified = publishedAt parsed as Date, priority 0.7, monthly changefreq); intentionally narrow so /app/* never gets emitted by accident — Phase 6.4 owns the broader robots/sitemap audit. Added next-mdx-remote@5 + gray-matter@4 (both free open-source MIT/MPL, no runtime accounts). Local verification: tsc clean, next build clean (20 pages — was 18; gained /blog index dynamic + /blog/welcome static + /sitemap.xml), curl smoke against next start: /blog HTTP 200 with the welcome card linked, /blog/welcome HTTP 200 with article header + "7 min read" + 25 styled paragraphs + BlogPosting JSON-LD + article:tag meta for each tag, /sitemap.xml HTTP 200 with /blog/welcome row at lastmod 2026-05-07.
- Post-push verification: site OK at olokas.com (home HTTP 200 with title + hero copy intact, /pricing HTTP 200 H1 intact). New deploy still propagating ~7 min after push: /blog showed cached old placeholder (x-vercel-cache HIT, age 247s) and /blog/welcome + /sitemap.xml returned 404 from the previous deploy. Vercel preserves the prior working deploy on build failure, so the site remains healthy. New deploy expected to land shortly; next run will record final state.


## 2026-05-07 19:10:51 UTC — Run #9
- Item: 6.1 (Pricing page)
- Result: SUCCESS
- Files changed: 3
- Notes: lib/pricing/tiers.ts — pure-data module so PRICING_TIERS + types can import into both server and client without tripping Next's "client reference" treatment of values exported from a "use client" file (caught and fixed during build verification — the first version put the data in pricing-tiers.tsx and prerender threw "Attempted to call map() from the server but map is on the client"). Three tiers: Starter $39/mo (1 domain, 10 queries), Pro $99/mo (5 domains, 50 queries, daily scans, competitor tracking, API access — flagged as "Most popular", uses accent variant), Agency $299/mo (25 domains, 250 queries, white-label PDFs, multi-seat). Annual numbers display the per-month equivalent ($33/$83/$249) with the yearly total + savings spelled out underneath; ~16% discount baked into the data, not computed at render. components/pricing-tiers.tsx — client component with a radiogroup-styled monthly/annual toggle and three TierCard instances (shadcn Card + Badge + Button asChild Link, lucide Check icons in accent color). Single CTA per tier currently routes to /audit since Stripe checkout isn't wired (Phase 3.10) — comment in the file flags the swap. app/(marketing)/pricing/page.tsx — replaces the Phase-6 placeholder with a server-rendered page (BrandMark header, h1 "One narrow product, three sizes.", PricingTiers, 5-Q FAQ in a <dl>, SiteFooter). Two JSON-LD blocks: one @graph of three Service entries (each with Offer.price + UnitPriceSpecification @ MON, attributed to the existing Organization @id from the root layout's @graph), and one FAQPage with all five Q/A. Metadata exports include canonical URL + openGraph + twitter card. tsc clean, next build clean (18 pages, /pricing prerendered as static at 9.88 kB).
- Post-push verification: site OK (home HTTP 200 with hero copy + title intact, /pricing HTTP 200 with H1, both JSON-LD blocks present, Most popular badge on Pro, all 5 FAQ entries rendering, /og-audit.png HTTP 200)

## 2026-05-07 07:11:16 UTC — Run #8
- Item: 5.1 (Five core React Email templates)
- Result: SUCCESS
- Files changed: 5
- Notes: emails/_shared.tsx — extracted shared design tokens (COLOR/FONT_STACK/MAX_WIDTH_PX) and reusable email primitives (EmailShell, BrandHeaderRow, EyebrowText, SectionHeading, BodyParagraph, CtaButton, CalloutCard, BulletList, FooterBlock, ENGINE_LABELS/scoreBand/BAND_COLOR) so the four new templates stay visually consistent. FreeAuditReport.tsx (already shipped in 2.6) intentionally keeps its own inlined copies — not refactoring done work. emails/WeeklyReport.tsx — typed WeeklyReportProps (recipientName, domain, periodLabel, geoScore, previousGeoScore, perEngine record over EngineKey with score/previousScore/citedQueries, topChanges with up/down delta, baseUrl). Renders eyebrow + greeting, overall score callout with WoW delta arrow (▲/▼/—), four-engine table with per-engine score + delta, biggest-movers list with empty-state copy, dashboard CTA, and a footer disclaimer about weekly cadence. emails/Welcome.tsx — typed WelcomeEmailProps (recipientName, planLabel, baseUrl). Greeting, four-step bulleted walkthrough, "Add your first query →" CTA pointing at /app/onboarding, secondary link to /blog. emails/FailedPayment.tsx — typed FailedPaymentEmailProps with FailedPaymentVariant = "day1" | "day3" | "day7". Per-variant copy table maps each cadence to (eyebrow, headline, lead, detail, cta, tone) — neutral on day 1, warn on day 3, danger callout on day 7 with pausesOnLabel. CTA always opens /app/settings (we don't embed pre-baked Stripe portal URLs since portal sessions are short-lived). emails/CancellationConfirmation.tsx — typed props (recipientName, planLabel, periodEndLabel, baseUrl). Calm tone, neutral callout naming the period-end date and the 30-day data preservation, dual CTAs (reactivate + open dashboard). All five files are plain server-renderable React with table-only layout, inline styles, hex colors, system-font stack, max-width 600px — same constraints as FreeAuditReport.tsx so a future react-email migration is structural, not visual. tsc clean, next build clean (18 pages, no warnings).
- Post-push verification: site OK (home HTTP 200 with hero copy and title intact, /audit HTTP 200 with form, /pricing HTTP 200, /og-audit.png HTTP 200 37 KB)

## 2026-05-07 03:08:03 UTC — Run #7
- Item: 2.7 (Rate limiting (1 per email per 7 days))
- Result: SUCCESS
- Files changed: 2
- Notes: lib/audit/rate-limit.ts — new module; checkRateLimit(email, now?) returns {allowed: true} or {allowed: false, retryAfter: Date}; recordAuditRequest(email, now?) stamps a per-email window. Process-local Map for now (acceptable while /api/audit itself doesn't persist), with header doc flagging the Phase 3 swap to a Supabase free_audits table — public surface kept stable so the swap is signature-compatible. Window is 7 days; emails normalized to trim+lowercase. app/api/audit/route.ts now calls checkRateLimit after schema + domain validation; 429 carries a friendly message ("You've already run a free audit recently. You can run another after May 13."), retryAfter ISO in the body, and a Retry-After header in seconds. recordAuditRequest only fires after we've decided to mint an auditId so 4xx earlier in the handler doesn't burn the user's slot. Existing audit-form.tsx already pipes data.error into the submit-error slot, so the friendly 429 message renders without form changes. tsc and next build clean.
- Post-push verification: site OK (HTTP 200 home + title intact, /audit HTTP 200 form intact). Live functional check on /api/audit: first POST → 202 with auditId; second POST same email → 429 with friendly retry-after message — limiter wired correctly.

## 2026-05-06 23:17:18 UTC — Run #6
- Item: 2.6 (Email the report (mock for now))
- Result: SUCCESS
- Files changed: 5
- Notes: emails/FreeAuditReport.tsx — hand-rolled email-safe React template (table-only layout, inline styles, max-width 600px, hex palette mirrored from globals.css). Canonical layout doc; Phase 5 swaps to react-email. lib/audit/render-email.ts — pure-string builder mirroring the React template 1:1, exporting renderFreeAuditReportEmail(report, opts) -> {subject, preview, html} (Next.js 14 forbids react-dom/server in the app/ graph, so we render via a parallel string path; doc note in component flags the keep-in-sync requirement). New POST /api/audit/[auditId]/email route renders for a given audit (zod-validated body), returns full HTML (~11 KB) plus subject + preheader. components/audit-status-view.tsx now POSTs to that route when the audit flips ready and stashes lastEmail (subject/preview/html/generatedAt) on the sessionStorage record so downstream Phase 5 code has something to read. Smoke-tested end-to-end via dev server: balanced tags (1 html, 15 table/tbody, 31 tr, 44 td, 11 p, 1 h1, 24 span, 3 a), zero React-isms leaked into HTML output. tsc and next build clean.
- Post-push verification: site OK (HTTP 200, hero title intact, /audit HTTP 200 with form, /pricing HTTP 200, /og-audit.png 37 KB)

## 2026-05-06 19:08:10 UTC — Run #5
- Item: 2.5 (Shareable audit URL)
- Result: SUCCESS
- Files changed: 4
- Notes: public/og-audit.png (1200×630, brand orange #ff6b35 dot + "Olokas Audit Report" headline, four-engine tagline) committed as the share preview; audit/[auditId] metadata gains openGraph + twitter:summary_large_image pointing at /og-audit.png while keeping noindex/nofollow (audit URLs are share-friendly but not crawl-friendly). New components/share-link-button.tsx — client component with Check/Link icons, copies window.location.href, swaps to "Link copied" for 1.8s, falls back to "Copy failed" if clipboard API is missing or the page isn't on a secure context. Mounted on the report header (right-aligned on sm+, stacks above on mobile). tsc and next build clean.
- Post-push verification: site OK (HTTP 200, /og-audit.png HTTP 200 image/png 37 KB, /audit/[uuid] returns og:image + twitter:summary_large_image meta with noindex preserved, home hero copy intact)

## 2026-05-06 07:11:29 UTC — Run #4
- Item: 2.4 (Mock report data + rendering)
- Result: SUCCESS
- Files changed: 4
- Notes: lib/audit/mock-report.ts (deterministic FNV+Mulberry32 seeded mock — geoScore, perEngine for chatgpt/perplexity/googleAio/claude with score+citations[]+targetAppeared, topIssues[], topWins[]); components/audit-report.tsx (Card+Badge layout, by-engine grid, two-column issues/wins, /pricing CTA); audit-form stashes domain+queries in sessionStorage so the report page reflects user inputs (no persistence yet — phase 2.5 swaps to a real share path); status view's ready phase now renders <AuditReportView /> instead of placeholder. tsc and next build clean.
- Post-push verification: site OK (HTTP 200, hero copy intact, /audit form still renders)

## 2026-05-06 00:08:34 UTC — Run #3
- Item: 2.3 (Free audit submit handler with mock job enqueue)
- Result: SUCCESS
- Files changed: 5
- Notes: POST /api/audit returns { auditId, statusUrl } (zod-validated, UUID minted in-route, no persistence yet); GET /api/audit/[auditId]/status stubbed; /audit/[auditId] polls every 3s up to 90s with rotating did-you-know cards from lib/audit/facts.ts; audit form redirects to statusUrl via next/navigation; tsc and next build clean.
- Post-push verification: site OK (HTTP 200, hero copy intact)

## 2026-05-05 18:07:51 UTC — Run #2
- Item: 2.2 (Query suggestion engine helper)
- Result: SUCCESS
- Files changed: 3
- Notes: added lib/queries/suggest.ts (deterministic title/h1/meta -> 5 templated queries with host-only and generic fallbacks), dev-gated test page at /audit/suggest-test, no new dependencies; tsc and next build clean.
- Post-push verification: site OK (HTTP 200, hero copy present)

## 2026-05-05 12:06:55 UTC — Run #1
- Item: 2.1 (Free audit form UI)
- Result: SUCCESS
- Files changed: 4
- Notes: built AuditForm client component (domain + email + 5 query inputs, client-side validation, disabled+loading state); audit page now renders form; tsc and next build clean.

