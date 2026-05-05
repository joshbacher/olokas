# Olokas

AI search visibility monitoring for small business websites. Weekly scans across ChatGPT, Perplexity, Google AI Overviews, and Claude. Email reports every Monday. **$39/month, launching soon.**

This repo contains the marketing site, the SaaS app, and the cron infrastructure. The async scan worker lives in `worker/` and deploys separately to a Hetzner VPS. Strategy and operating documents (business bible, Cowork tasks) live outside this repo.

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind, shadcn/ui) on Vercel
- **Supabase** (Postgres + Auth + RLS) for data and authentication
- **Stripe Checkout + Customer Portal** for self-serve billing
- **Resend** for transactional email
- **Anthropic Claude API** for report generation and analysis
- **SerpAPI + Perplexity API** for engine queries
- **GitHub Actions cron** for scheduled jobs (free tier covers our usage)
- **Hetzner CPX21** for the long-running scan worker (€5/mo)

## Repository layout

```
olokas/
├── app/                       Next.js 14 App Router
│   ├── (marketing)/           Public marketing pages
│   ├── (auth)/                Login, signup
│   ├── app/                   Authenticated dashboard (auth-guarded)
│   └── api/
│       ├── webhooks/stripe/   Stripe webhook (signature-verified)
│       └── cron/              GitHub Actions cron endpoints
├── components/                React components (shadcn/ui in components/ui)
├── lib/                       Service clients (Supabase, Stripe, Anthropic, Resend)
├── supabase/migrations/       SQL migrations (run via Supabase CLI or dashboard)
├── content/posts/             MDX blog posts (lands in Phase 6)
├── emails/                    React Email templates (lands in Phase 5)
└── worker/                    Long-running scan worker for Hetzner VPS
```

## Local development

```bash
# 1) Install dependencies
npm install

# 2) Copy env template and fill in real values
cp .env.example .env.local

# 3) Run dev server
npm run dev
```

Open http://localhost:3000 — the home page should serve the coming-soon landing.

For full functionality (auth, billing, scans), the env vars in `.env.example` need real values. Phase 1 ships with stub routes so the build succeeds without any external services configured.

## Deployment

`main` deploys automatically to **olokas.com** via Vercel. Every push triggers a build; if the build fails, Vercel keeps the previous deploy live.

Branch deploys (preview URLs) are available for any non-main push.

## Build phases

This codebase is being built in six phases (see strategy docs):

| Phase | Status | Description |
|---|---|---|
| Phase 0 | Operator | Account creation (Stripe, Supabase, Resend, Anthropic, SerpAPI, Perplexity, Hetzner) |
| **Phase 1** | **✅ Done** | **Scaffold: routes, schema, client wrappers, Stripe webhook stub, home page** |
| Phase 2 | Pending | Free single-domain audit tool (`/audit`) |
| Phase 3 | Pending | Stripe billing + authed dashboard |
| Phase 4 | Pending | Real scan engine implementations + worker |
| Phase 5 | Pending | Weekly report generator + email templates |
| Phase 6 | Pending | Marketing pages, blog, comparison pages, SEO |

## Environment variables

See `.env.example` for the complete list, including which service each one comes from.

## License

UNLICENSED — proprietary.
