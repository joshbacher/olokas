# Olokas worker

Long-running Node process that polls the `jobs` table and runs scan work
against the four AI search engines. Deployed as a `systemd` service on a
Hetzner CPX21 VPS (€5/mo) — Vercel serverless can't host the multi-minute
Playwright-based scrapes some engines need.

Real implementation lands in **Phase 4**. This directory currently holds
only this README and the planned structure:

```
worker/
├── index.ts                Polling loop
├── engines/
│   ├── chatgpt.ts          ChatGPT search
│   ├── perplexity.ts       Perplexity API (sonar-online)
│   ├── google_aio.ts       SerpAPI google_ai_overview
│   └── claude.ts           Anthropic API + web_search tool
├── deploy.sh               Pull + build + restart (idempotent)
└── systemd/
    └── olokas-worker.service
```

The worker reads its secrets from `/etc/olokas-worker/.env` (NOT from
Vercel env vars). See `.env.example` in the repo root for the full list of
worker variables (`WORKER_*` prefix).
