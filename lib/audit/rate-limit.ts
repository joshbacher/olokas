// Free-audit rate limiter.
//
// PHASE 2 STUB: this module keeps state in a process-local `Map`. That means
// the limit is best-effort under serverless (each cold instance starts empty)
// and is lost across deploys. That's acceptable for the current flow because
// the audit endpoint itself doesn't persist anything yet — both layers are
// stubbed to the same level.
//
// Phase 3 must replace this with a Supabase `free_audits` table keyed by
// lower-cased email, with `last_requested_at timestamptz`. The public surface
// (`checkRateLimit`, `recordAuditRequest`) is shaped to swap straight in:
// signatures stay the same, they just become async-backed by the database.
//
// One audit per email per 7 days, per spec WORK-QUEUE.md item 2.7.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type Entry = {
  lastRequestedAt: number;
};

// Module-scoped store. Lives as long as the Node process does.
const store: Map<string, Entry> = new Map();

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: Date };

/**
 * Return whether `email` is allowed to start a new free audit right now.
 *
 * `now` is injectable for tests; production callers should leave it default.
 */
export function checkRateLimit(
  email: string,
  now: Date = new Date()
): RateLimitResult {
  const key = normalize(email);
  if (!key) {
    // Don't block on empty input — the route validates this separately and
    // returns a 400. We just say "allowed" so the rate-limit check isn't the
    // thing that errors out on a request that was already going to 400.
    return { allowed: true };
  }

  const entry = store.get(key);
  if (!entry) return { allowed: true };

  const elapsed = now.getTime() - entry.lastRequestedAt;
  if (elapsed >= SEVEN_DAYS_MS) return { allowed: true };

  return {
    allowed: false,
    retryAfter: new Date(entry.lastRequestedAt + SEVEN_DAYS_MS),
  };
}

/**
 * Record that `email` just kicked off a free audit. Call this only after the
 * request has otherwise been accepted — it sets the 7-day window.
 *
 * Idempotent in the sense that calling twice in the same instant just sets
 * the same timestamp twice.
 */
export function recordAuditRequest(
  email: string,
  now: Date = new Date()
): void {
  const key = normalize(email);
  if (!key) return;
  store.set(key, { lastRequestedAt: now.getTime() });
}
