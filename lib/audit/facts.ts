// Static "did you know" facts shown while a free audit is running.
// Kept short and factual — no hype, no superlatives.
// Phase 3 may swap this for a CMS-backed list, but a static array is plenty
// for the polling page in 2.3 and the mock report flow in 2.4.

export type AuditFact = {
  id: string;
  title: string;
  body: string;
};

export const AUDIT_FACTS: readonly AuditFact[] = [
  {
    id: "engines-disagree",
    title: "Each engine has its own index.",
    body:
      "ChatGPT, Perplexity, Google AI Overviews, and Claude don't share a backend. Ranking on one doesn't mean ranking on the others — most domains show up on two of the four at best.",
  },
  {
    id: "ai-overviews-coverage",
    title: "AI Overviews now sit on top of a meaningful slice of search.",
    body:
      "Google has been expanding AI Overviews steadily across informational and commercial queries. When they appear, they push the first organic result well below the fold.",
  },
  {
    id: "citation-signals",
    title: "Citations follow trust signals, not keyword density.",
    body:
      "Pages that get cited tend to share a few traits: clear authorship, a visible publish date, links to primary sources, and a domain with a track record on the topic.",
  },
  {
    id: "answers-are-volatile",
    title: "Answers re-rank with every prompt.",
    body:
      "AI engines retrieve and re-rank on the fly. A page that shows up in this morning's answer may quietly drop out by the afternoon. Single snapshots aren't enough — you need to watch over time.",
  },
];
