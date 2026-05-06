// Deterministic mock report generation for the free audit flow.
//
// Phase 2.4 only — the polling page hands the same domain + queries the user
// submitted to `generateMockReport`, which produces realistic-looking but
// entirely fabricated data for the report UI. The numbers and citations are
// derived from a hash of the inputs so the same domain always produces the
// same report (no flicker if the user reloads). Phase 4 replaces this with
// real LLM scan results.
//
// Nothing here calls a network or mutates state. The function is pure and
// safe to run in any environment.

export type EnginePerf = {
  /** 0–100 GEO score for this engine. */
  score: number;
  /** Top citations the engine returned, top-of-list first. */
  citations: string[];
  /** Whether the audited domain itself appeared in the citations. */
  targetAppeared: boolean;
};

export type AuditReport = {
  /** Cleaned hostname, e.g. "example.com". */
  domain: string;
  /** Queries this report was generated from (post-trim, non-empty). */
  queries: string[];
  /** Average GEO score across all four engines (0–100). */
  geoScore: number;
  perEngine: {
    chatgpt: EnginePerf;
    perplexity: EnginePerf;
    googleAio: EnginePerf;
    claude: EnginePerf;
  };
  topIssues: string[];
  topWins: string[];
};

type SeedRef = { v: number };

/** FNV-1a 32-bit hash. Stable across Node and browser. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. Mutates seedRef for the next call. */
function rng(seedRef: SeedRef): number {
  seedRef.v = (seedRef.v + 0x6d2b79f5) >>> 0;
  let t = seedRef.v;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function rangeInt(seedRef: SeedRef, lo: number, hi: number): number {
  return Math.floor(rng(seedRef) * (hi - lo + 1)) + lo;
}

function pickN<T>(seedRef: SeedRef, arr: readonly T[], n: number): T[] {
  const copy = arr.slice();
  const out: T[] = [];
  const limit = Math.min(n, copy.length);
  while (out.length < limit) {
    const idx = Math.floor(rng(seedRef) * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Strip protocol, path, and a leading `www.` so the report shows a clean
 * hostname. Mirrors what the form normalizes for submission, but defensive
 * in case the data was stored loosely.
 */
function cleanDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "yourdomain.com";
  const noProtocol = trimmed.replace(/^https?:\/\//, "");
  const noPath = noProtocol.replace(/\/.*$/, "");
  const noWww = noPath.replace(/^www\./, "");
  return noWww || "yourdomain.com";
}

const COMPETITOR_DOMAINS: readonly string[] = [
  "wikipedia.org",
  "reddit.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "forbes.com",
  "techcrunch.com",
  "hubspot.com",
  "zapier.com",
  "shopify.com",
  "stripe.com",
  "ycombinator.com",
  "medium.com",
  "hbr.org",
  "producthunt.com",
  "saasworthy.com",
];

const TOP_ISSUES: readonly string[] = [
  "ChatGPT cites a Reddit thread instead of your own pages on the highest-priority query.",
  "Perplexity quotes outdated pricing. Your /pricing page has not been re-crawled in 90+ days.",
  "Google AI Overviews names two competitors and omits you on three of five queries.",
  "Claude points users to G2 reviews. Your case studies are not surfacing as primary sources.",
  "Your homepage title tag is generic — engines cannot tell what category you sit in.",
  "Key product pages are missing JSON-LD structured data; engines fall back to scraping.",
  "Your About page lacks clear authorship signals (no team, no founding year, no location).",
  "Your blog feed is blocked in robots.txt — fresh content isn't reaching crawlers.",
  "Long-form pages exceed 12,000 words without anchor links; engines extract only the intro.",
  "Two competitor domains are cited 3x more often than yours across the test set.",
];

const TOP_WINS: readonly string[] = [
  "ChatGPT consistently lists your domain among the top three options on the highest-volume query.",
  "Perplexity cites your documentation as a primary source on integration questions.",
  "Claude correctly summarizes your value proposition in a single sentence.",
  "Google AI Overviews surfaces your support article when users ask 'how do I' questions.",
  "Your founder's interviews and podcast appearances show up as supporting citations.",
  "Your pricing page ranks ahead of comparison sites when users ask about cost.",
  "Engines correctly attribute your category-defining vocabulary to your domain.",
];

const FALLBACK_QUERIES: readonly string[] = [
  "what does this company do",
  "is it any good",
  "alternatives",
  "pricing",
  "vs competitor",
];

/**
 * Build a single engine's mock performance. `appearProb` lets the caller
 * tune how often this engine cites the audited domain — different engines
 * have different baselines so the report doesn't look uniform.
 */
function buildEnginePerf(
  seedRef: SeedRef,
  targetDomain: string,
  appearProb: number
): EnginePerf {
  const targetAppeared = rng(seedRef) < appearProb;
  const numCitations = rangeInt(seedRef, 3, 5);
  const citations = pickN(seedRef, COMPETITOR_DOMAINS, numCitations);
  if (targetAppeared) {
    // Drop the target into a slot — not always first, so it looks plausible.
    const slot = Math.floor(rng(seedRef) * (citations.length + 1));
    citations.splice(slot, 0, targetDomain);
  }
  // Score correlates with whether the target actually showed up, with some
  // jitter so the four engines don't all land on the same number.
  const score = targetAppeared
    ? rangeInt(seedRef, 55, 88)
    : rangeInt(seedRef, 18, 48);
  return { score, citations, targetAppeared };
}

export function generateMockReport(
  domain: string,
  queries: string[]
): AuditReport {
  const cleanedDomain = cleanDomain(domain);
  const cleanedQueries = queries
    .map((q) => q.trim())
    .filter((q): q is string => q.length > 0);
  const effectiveQueries =
    cleanedQueries.length > 0 ? cleanedQueries : [...FALLBACK_QUERIES];

  const seed = hash32(cleanedDomain + "|" + effectiveQueries.join("|"));
  const seedRef: SeedRef = { v: seed };

  const chatgpt = buildEnginePerf(seedRef, cleanedDomain, 0.55);
  const perplexity = buildEnginePerf(seedRef, cleanedDomain, 0.4);
  const googleAio = buildEnginePerf(seedRef, cleanedDomain, 0.35);
  const claude = buildEnginePerf(seedRef, cleanedDomain, 0.5);

  const geoScore = Math.round(
    (chatgpt.score + perplexity.score + googleAio.score + claude.score) / 4
  );

  const numIssues = rangeInt(seedRef, 3, 4);
  const numWins = rangeInt(seedRef, 2, 3);
  const topIssues = pickN(seedRef, TOP_ISSUES, numIssues);
  const topWins = pickN(seedRef, TOP_WINS, numWins);

  return {
    domain: cleanedDomain,
    queries: effectiveQueries,
    geoScore,
    perEngine: { chatgpt, perplexity, googleAio, claude },
    topIssues,
    topWins,
  };
}
