# Strategic Proposals — Awaiting Review

This folder holds drafts produced by the strategic-drafts cron (Track B). Each file is a proposal for human review — never auto-applied.

## File naming
`YYYY-MM-DD-{type}.md`

## Types
- `bible-pressure-test` — review business-bible.md against current competitive landscape, propose revisions
- `blog-outline` — outline + opening for a new blog post
- `competitive-intel` — what competitors did this period, implications
- `pricing-experiment` — A/B test idea for pricing/packaging

## How the human reviews
1. Read the proposal
2. Decide: accept, reject, or revise
3. To accept: manually apply the changes (Claude won't do it for you)
4. To track: add `status: REVIEWED` and a date to the frontmatter, OR move to `PROPOSALS/archive/`

The cron NEVER modifies the actual application code or strategic docs based on these proposals. Human-in-the-loop on strategy by design.
