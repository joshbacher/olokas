# Olokas GitHub Actions Cron Workflows

These workflows fire scheduled HTTP POST requests to the `/api/cron/*` routes on
`olokas.com`. Each route authenticates the caller via a shared `CRON_SECRET`
bearer token.

## Operator setup (required before workflows are active)

Add `CRON_SECRET` to **GitHub Actions secrets**:

1. In GitHub → repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `CRON_SECRET`
4. Value: any long random string (e.g. `openssl rand -hex 32`)

Set the **same value** as a Vercel environment variable (`CRON_SECRET`, Production
environment) so the `/api/cron/*` routes can verify the token.

Until `CRON_SECRET` is set in both places, every scheduled run will return HTTP
401 and the workflow step will fail.

## Workflows

| Workflow file | Route | Schedule | Timeout |
|---|---|---|---|
| `dispatch-scans.yml` | `/api/cron/dispatch-scans` | Every 15 minutes | 5 min |
| `recover-stuck-jobs.yml` | `/api/cron/recover-stuck-jobs` | Every 30 minutes | 5 min |
| `daily-rollup.yml` | `/api/cron/daily-rollup` | Daily at 23:55 UTC | 10 min |
| `payment-recovery.yml` | `/api/cron/payment-recovery` | Daily at 09:00 UTC | 10 min |
| `generate-reports.yml` | `/api/cron/generate-reports` | Mondays at 05:00 UTC | 15 min |
| `send-reports.yml` | `/api/cron/send-reports` | Mondays at 06:00 UTC | 15 min |

Each workflow also has a `workflow_dispatch` trigger so you can run it manually
from the Actions tab for testing.

## Notes

- All workflows use `concurrency: cancel-in-progress: false` — an in-flight run
  is never interrupted by a newer trigger; the newer trigger simply waits.
- The `/api/cron/*` routes are stubs today. Real implementations arrive in
  Phase 4 (scan dispatch, stuck-job recovery, daily rollup) and Phase 5
  (report generation and delivery, payment recovery emails).
- `dispatch-scans` and `recover-stuck-jobs` run frequently and have a 30s
  `--max-time` on the curl request, matching the expected stub response time.
  When real work lands in Phase 4, increase the timeout if needed.
