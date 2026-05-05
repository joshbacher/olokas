// Deterministic query suggestion engine.
//
// Given a URL, fetch the page, extract a few signals (<title>, first <h1>,
// <meta name="description">), and synthesize five plausible customer-style
// queries using fixed templates. No LLM call — Phase 4 will layer that on.
//
// Falls back to generic queries when the fetch or parse fails. The function is
// pure-ish: same URL → same output, modulo what the remote server returns.

const FETCH_TIMEOUT_MS = 10_000;
const SUGGESTION_COUNT = 5;

type SiteSignals = {
  brand: string;
  category: string | null;
};

const GENERIC_QUERIES: readonly string[] = [
  "best AI search visibility tool for small business",
  "how to monitor ChatGPT mentions of my brand",
  "what is generative engine optimization",
  "how to track Perplexity citations",
  "AI SEO tools comparison",
];

const TITLE_SEPARATORS: readonly string[] = [
  " — ",
  " – ",
  " | ",
  " - ",
  " :: ",
  ": ",
];

const CATEGORY_HINT_RE =
  /\b(?:best|simple|easy|fast|modern|free|automated|smart)\s+([a-z][a-z\s-]{2,40}?)(?:\s+(?:for|to)\b|\s*[.,—–|-])/i;

function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return new URL(candidate);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTagContent(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = html.match(re);
  if (!m || m[1] == null) return null;
  const cleaned = decodeHtmlEntities(stripTags(m[1])).trim();
  return cleaned.length > 0 ? cleaned : null;
}

function extractMetaDescription(html: string): string | null {
  const tagRe = /<meta\b[^>]+name\s*=\s*["']description["'][^>]*>/i;
  const tagMatch = html.match(tagRe);
  if (!tagMatch) return null;
  const contentMatch = tagMatch[0].match(/content\s*=\s*["']([^"']*)["']/i);
  if (!contentMatch || contentMatch[1] == null) return null;
  const cleaned = decodeHtmlEntities(contentMatch[1]).trim();
  return cleaned.length > 0 ? cleaned : null;
}

function deriveBrandFromHost(host: string): string {
  const stripped = host.replace(/^www\./i, "");
  const firstLabel = stripped.split(".")[0] ?? stripped;
  if (firstLabel.length === 0) return stripped;
  return firstLabel.charAt(0).toUpperCase() + firstLabel.slice(1);
}

function deriveBrandFromTitle(title: string | null, host: string): string {
  const hostBrand = deriveBrandFromHost(host);
  if (!title) return hostBrand;

  for (const sep of TITLE_SEPARATORS) {
    if (!title.includes(sep)) continue;
    const parts = title
      .split(sep)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length < 2) continue;
    const candidates = parts
      .filter((p) => p.length >= 2 && p.length <= 40)
      .sort((a, b) => a.length - b.length);
    if (candidates.length > 0 && candidates[0]) {
      return candidates[0];
    }
  }

  if (title.length <= 40) return title;
  return hostBrand;
}

function deriveCategory(
  title: string | null,
  h1: string | null,
  description: string | null,
): string | null {
  const haystacks = [h1, description, title].filter(
    (s): s is string => s != null && s.length > 0,
  );
  for (const text of haystacks) {
    const match = text.match(CATEGORY_HINT_RE);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  }
  if (h1) {
    const cleaned = h1
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim();
    if (cleaned.length > 0 && cleaned.split(/\s+/).length <= 6) {
      return cleaned;
    }
  }
  return null;
}

function buildTemplatedQueries(signals: SiteSignals): string[] {
  const { brand, category } = signals;
  const out: string[] = [
    `what is ${brand}`,
    `is ${brand} worth it`,
    `${brand} reviews`,
    `${brand} alternatives`,
    category ? `best ${category} for small business` : `how does ${brand} work`,
  ];
  return dedupe(out);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function padToCount(items: string[], count: number): string[] {
  const seen = new Set(items.map((s) => s.toLowerCase()));
  const result = items.slice();
  for (const generic of GENERIC_QUERIES) {
    if (result.length >= count) break;
    if (!seen.has(generic.toLowerCase())) {
      seen.add(generic.toLowerCase());
      result.push(generic);
    }
  }
  return result.slice(0, count);
}

async function fetchHtml(
  url: URL,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "OlokasBot/0.1 (+https://olokas.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html|xhtml/i.test(contentType)) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Suggest five customer-style queries to test against AI search engines,
 * derived from a URL's title / h1 / meta description.
 *
 * Always returns exactly five strings. On bad input or fetch failure, falls
 * back to host-only or fully generic suggestions so callers never have to
 * special-case errors.
 */
export async function suggestQueriesFromUrl(rawUrl: string): Promise<string[]> {
  let parsed: URL;
  try {
    parsed = normalizeUrl(rawUrl);
  } catch {
    return GENERIC_QUERIES.slice(0, SUGGESTION_COUNT);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return GENERIC_QUERIES.slice(0, SUGGESTION_COUNT);
  }

  const html = await fetchHtml(parsed, FETCH_TIMEOUT_MS);
  if (!html) {
    const hostOnly = buildTemplatedQueries({
      brand: deriveBrandFromHost(parsed.hostname),
      category: null,
    });
    return padToCount(hostOnly, SUGGESTION_COUNT);
  }

  const title = extractTagContent(html, "title");
  const h1 = extractTagContent(html, "h1");
  const description = extractMetaDescription(html);
  const brand = deriveBrandFromTitle(title, parsed.hostname);
  const category = deriveCategory(title, h1, description);

  const queries = buildTemplatedQueries({ brand, category });
  return padToCount(queries, SUGGESTION_COUNT);
}

// Exposed for the dev-only test page so it can show what was actually parsed.
export type ParsedSiteSignals = {
  url: string;
  title: string | null;
  h1: string | null;
  description: string | null;
  brand: string;
  category: string | null;
};

export async function debugSuggestFromUrl(
  rawUrl: string,
): Promise<{ signals: ParsedSiteSignals | null; queries: string[] }> {
  let parsed: URL;
  try {
    parsed = normalizeUrl(rawUrl);
  } catch {
    return {
      signals: null,
      queries: GENERIC_QUERIES.slice(0, SUGGESTION_COUNT),
    };
  }

  const html = await fetchHtml(parsed, FETCH_TIMEOUT_MS);
  const title = html ? extractTagContent(html, "title") : null;
  const h1 = html ? extractTagContent(html, "h1") : null;
  const description = html ? extractMetaDescription(html) : null;
  const brand = deriveBrandFromTitle(title, parsed.hostname);
  const category = deriveCategory(title, h1, description);

  const queries = padToCount(
    buildTemplatedQueries({ brand, category }),
    SUGGESTION_COUNT,
  );

  return {
    signals: {
      url: parsed.toString(),
      title,
      h1,
      description,
      brand,
      category,
    },
    queries,
  };
}
