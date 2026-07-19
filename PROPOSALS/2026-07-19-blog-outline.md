---
type: blog-outline
drafted_by: olokas-strategic-drafts cron
drafted_at: 2026-07-19 09:00 UTC
status: AWAITING_REVIEW
---

# Blog outline — July 2026

**Keyword selection rationale:** One prior blog-outline proposal exists (2026-05-24), which covered "AI Overviews ranking" — the lead keyword of cluster 3 in bible §5. Cycling clusters alphabetically by lead keyword, the next cluster is "AI search visibility" / "AI search tracking" (cluster 4). Within that cluster, alphabetizing the two keywords ("AI search tracking" vs. "AI search visibility"), "tracking" precedes "visibility." Selected: **AI search tracking**.

---

## Title (working)

**How to Track AI Search Visibility: A Practical Guide to Monitoring Your Brand in ChatGPT, Perplexity, and AI Overviews**

*(Alt: "AI Search Tracking 101: What to Measure When Google Analytics Can't See It")*

---

## Target keyword + secondary keywords

- **Primary:** `AI search tracking`
- **Secondary:** `AI search visibility`, `monitor brand in ChatGPT`, `track brand mentions AI search`, `AI visibility tracking tools`

---

## Reader intent

Someone searching "AI search tracking" already suspects their brand shows up (or should show up) in AI-generated answers and wants to know how to actually measure it — not why it matters (they're past that). They're asking: what do I track, how do I track it without paying for an enterprise platform, and what does "good" look like. They likely tried checking Google Analytics and found nothing, which is often what sends them searching in the first place.

---

## 5-section outline

1. **Why AI search tracking isn't rank tracking** — About 68% of Google searches in early 2026 ended with no click, and only ~20% of ChatGPT brand mentions carry a clickable citation link that GA4 can see — the other 80% (comparisons, recommendations, descriptions) are invisible to standard analytics. This section reframes the problem: you're not tracking a position, you're tracking whether you get named at all.

2. **Mentions vs. citations — two different signals** — A mention is your brand named in the answer text; a citation is your URL used as a source. ChatGPT cites a source 87% of the time but names a brand in only ~21% of answers (closer to a footnoted paper), while Gemini mentions brands in ~84% of responses but links a source only ~21% of the time (closer to a conversationalist). This section explains why tracking only one signal gives a distorted picture, and which one matters more for which business type.

3. **The concentration problem: a few brands capture most of the visibility** — The top-cited brand in a given category wins roughly 31% of all citations, and the top three combined capture roughly 65%. This section explains "visibility rate" (percentage of relevant prompts where you're mentioned, tracked across a prompt set — e.g., 40% across 200 prompts) as the metric to actually watch, instead of chasing a single flashy mention.

4. **Why single-engine tracking misses most of the picture** — Only about 2% of cited URLs show up across AI Overviews, ChatGPT, and Perplexity at once; 91% of citations appear in just one engine. This section makes the case for tracking across engines, not just the one your team happens to check, and briefly covers the DIY manual-prompt-testing method vs. the current landscape of monitoring tools (roughly $29–80/month at the entry tier) — framed as a buyer's checklist, not a product pitch.

5. **A weekly tracking routine that takes under an hour** — Concrete and sequenced: Week 1, build a 15–20 prompt list covering your core categories; Week 2, run it manually across ChatGPT, Perplexity, and Google AI Overviews and log mention/citation/no-show; Week 3, calculate visibility rate and compare to your top competitor; Week 4, decide whether manual tracking is sustainable or whether volume justifies a tool. Ends with a simple tracking template the reader can copy.

---

## Opening 150 words (written out)

> If you've searched your brand name alongside "ChatGPT" or "AI Overview" and come up empty-handed in Google Analytics, that's not because you're not being mentioned — it's because you're not measuring the right thing.
>
> Roughly 80% of ChatGPT's brand mentions never produce a clickable citation link, which means the tool that shows you your website traffic has no idea they happened. Your brand can be recommended, compared, and described inside an AI answer, and your analytics dashboard will show nothing.
>
> This is the gap AI search tracking is meant to close: not rank position, but whether you get named at all, how often, and against which competitors. The good news is that tracking this doesn't require enterprise tooling to start — it requires knowing what to measure and a repeatable way to check it.
>
> This is a practical guide to doing that, starting today.

---

## Estimated word count

**1,700–1,900 words.** Sections 2 and 3 carry the conceptual weight (mentions vs. citations, visibility rate) and need the most explanation; section 5 is a checklist and should stay tight.

---

## Sources used in this outline

- [AI Search Monitoring Tool: Track ChatGPT, Perplexity & Google AIO — Otterly.AI](https://otterly.ai/)
- [How to Monitor Your Brand in ChatGPT, Perplexity & AI Search (2026 Guide) — Passionfruit](https://www.getpassionfruit.com/blog/how-to-monitor-your-brand-across-chatgpt-perplexity-and-ai-search)
- [8 Best AI Visibility Tools Tested & Ranked [2026] — Visiblie](https://www.visiblie.com/blog/best-ai-visibility-tools)
- [AI Search Visibility Statistics 2026: 8,400-Prompt Brand Tracker](https://visionary-marketing.co.uk/blog/ai-search-visibility-statistics-2026)
- [AI Search Statistics (2025-2026): 55+ Data Points on GEO, Buyer Behavior, and Citation Rates — Omnibound](https://www.omnibound.ai/blog/ai-search-statistics)
- [Generative Engine Optimization Statistics (2026) — Omnibound](https://www.omnibound.ai/blog/generative-engine-optimization-statistics)

---

Proposed action: write the full post manually, ask the build cron to draft it, or reject.
