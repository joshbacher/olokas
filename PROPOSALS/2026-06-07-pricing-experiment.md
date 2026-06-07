---
type: pricing-experiment
drafted_by: olokas-strategic-drafts cron
drafted_at: 2026-06-07 09:00 UTC
status: AWAITING_REVIEW
---

# Pricing Experiment — June 2026

**No prior pricing-experiment proposals found in PROPOSALS/ history. This is the first.**

---

## Hypothesis

If we (a) switch the pricing page billing toggle default from monthly-first to annual-first, and (b) increase the annual discount from 16% to 20%, then the annual plan take-rate among new paid subscribers will increase from an estimated baseline of ~20% to ≥35%, because surfacing annual pricing as the default removes the active friction of choosing it, and 20% is the discount threshold above which annual savings become perceptually significant relative to a $39/mo outlay.

---

## Change

Two simultaneous changes — both require a code-level pricing page update, nothing in the database or Stripe:

**1. Flip the billing toggle default to annual.**

The pricing page currently shows monthly pricing by default, with an annual toggle. Change: load the page with the annual toggle active. Monthly remains accessible with one click; nothing is hidden. This is a presentation change, not a restriction.

**2. Increase the annual discount from 16% to 20% (the bible §3 hard cap).**

Current annual prices (2 months free = 10 × monthly):

| Tier | Monthly | Current Annual | New Annual (20% off) |
|------|---------|---------------|----------------------|
| Starter | $39/mo | $390/yr ($32.50/mo) | $374/yr ($31.17/mo) |
| Pro | $99/mo | $990/yr ($82.50/mo) | $950/yr ($79.17/mo) |
| Agency | $299/mo | $2,990/yr ($249.17/mo) | $2,870/yr ($239.17/mo) |

Note: The new annual Starter price ($374/yr) is slightly below LLMrefs' monthly Pro ($79/mo annualized) and well below Peec AI ($99/mo). This keeps us clearly in the budget-tier position while making the annual commitment materially more visible as a value.

Stripe product IDs will need to be updated for the three annual price points. No change to monthly prices.

---

## Measurement

- **Primary KPI:** Annual plan take-rate = (new annual subscribers) / (all new paid subscribers) in the experiment window
- **Target:** ≥35% annual take-rate (estimated current baseline: ~20%, consistent with SaaS industry default-monthly benchmarks)
- **Secondary KPI:** Net new MRR added per week (watch for direction, not just rate — annual converts at 1/12 of annual charge in Stripe's MRR accounting)
- **Tertiary KPI:** 14-day refund rate on annual plans (watch for spike, which would signal buyer regret from hidden monthly price)

Data source: Stripe dashboard (payment method + billing interval filter on new charges).

---

## Duration

**4 weeks** (June 9 – July 6, 2026). At current conversion volumes, 4 weeks should produce 20–50 new paid subscribers — a small but directionally readable sample for a binary (annual vs. monthly) split.

If fewer than 10 new paid subscribers in 4 weeks, extend by 2 weeks before reading results. Do not read results early.

---

## Decision rule

At end of 4-week window:

| Annual take-rate | Action |
|-----------------|--------|
| ≥35% | Keep both changes (toggle default + 20% discount) permanently |
| 25–34% | Keep toggle default only; revert discount to 16% (2 months free) |
| <25% | Revert both; run a separate experiment on messaging before revisiting defaults |

If 14-day refund rate on annual plans exceeds 8% (vs. assumed baseline <3%), pause experiment immediately and revert regardless of take-rate — it signals buyer regret, not conversion quality.

---

## Risks

1. **Discount headroom exhausted.** At 20%, we are at the §3 hard cap. If this experiment succeeds, there is no further annual-discount lever available without a bible amendment. That is fine — but it means the next pricing experiment will need to be a different type (e.g., price increase, tier restructuring, add-on), not a deeper discount.

2. **Annual-first default suppresses early MRR numbers.** Annual subscribers pay upfront, but Stripe recognizes MRR as annual/12. First-month MRR may look flat even if LTV is improving. Do not panic-revert based on a single week's MRR chart — use the 4-week window.

3. **Buyer regret risk on Starter annual ($374 upfront).** The 14-day refund policy is clean and should handle this, but watch the refund rate metric. A subscriber who clicks annual without realizing it is a $374 charge may refund within days. If this happens, the toggle default should include a more prominent annual-charge disclosure line ("Billed $374 today, renews annually") before checkout.

---

Proposed action: run, modify, or reject.
