/**
 * Phase 6.3 — MDX competitor-comparison loader.
 *
 * Reads `content/comparisons/*.mdx` from disk, parses frontmatter with
 * gray-matter, validates with zod, and exposes `getAllComparisons()` +
 * `getComparisonBySlug()`. The MDX body is left as a raw string here;
 * rendering happens in `app/(marketing)/vs/[competitor]/page.tsx` via
 * `next-mdx-remote/rsc`.
 *
 * Mirrors the shape of `lib/posts.ts` so the build + caching story is
 * identical: malformed frontmatter fails the build loudly via zod, and
 * results are cached for the lifetime of the process.
 *
 * Frontmatter contract — the comparison page renders an intro + a structured
 * feature table + the MDX body. Table data lives here, not in MDX, so the
 * page can render it consistently without bespoke MDX components.
 */

import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const COMPARISONS_DIR = path.join(process.cwd(), "content", "comparisons");

/**
 * One row of the side-by-side feature table.
 *
 * `olokas` and `competitor` are short status strings — typically "Yes",
 * "No", "Partial", or a one-line qualifier like "1 domain on Starter".
 * Keep them short; long prose belongs in the MDX body.
 */
const FeatureRowSchema = z.object({
  feature: z.string().min(1),
  olokas: z.string().min(1),
  competitor: z.string().min(1),
  /** Optional one-line clarifier shown beneath the row in muted text. */
  note: z.string().optional(),
});

export type FeatureRow = z.infer<typeof FeatureRowSchema>;

const FrontmatterSchema = z.object({
  /** Must match the filename and the URL `/vs/<slug>`. */
  slug: z.string().min(1).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: "slug must be kebab-case ASCII",
  }),
  /** Display name of the competitor (e.g., "Semrush"). */
  competitor: z.string().min(1),
  /** Optional canonical site URL — surfaced in the page header for context. */
  competitorUrl: z.string().url().optional(),
  /** Page title; usually the H1 the page uses. */
  title: z.string().min(1),
  /** One-line summary used as meta description and intro paragraph. */
  excerpt: z.string().min(1),
  /** ISO date the comparison was last meaningfully edited. */
  updatedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "updatedAt must be YYYY-MM-DD"),
  /** Side-by-side table rows. */
  features: z.array(FeatureRowSchema).min(1),
});

export type ComparisonFrontmatter = z.infer<typeof FrontmatterSchema>;

export type Comparison = ComparisonFrontmatter & {
  /** Raw MDX body (no frontmatter). Rendered with next-mdx-remote/rsc. */
  content: string;
};

async function readComparisonFile(filePath: string): Promise<Comparison> {
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const fm = FrontmatterSchema.parse(data);
  return { ...fm, content };
}

let cache: Comparison[] | null = null;

/**
 * Reads every `*.mdx` file under `content/comparisons/`. Returns the list
 * sorted by slug ascending so route enumeration is deterministic. Caches
 * the result for the lifetime of the process; dev rebuilds bust the module.
 */
export async function getAllComparisons(): Promise<Comparison[]> {
  if (cache) return cache;
  let entries: string[];
  try {
    entries = await fs.readdir(COMPARISONS_DIR);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      cache = [];
      return cache;
    }
    throw err;
  }
  const mdxFiles = entries.filter((name) => name.endsWith(".mdx"));
  const comparisons = await Promise.all(
    mdxFiles.map((name) => readComparisonFile(path.join(COMPARISONS_DIR, name))),
  );
  comparisons.sort((a, b) => (a.slug < b.slug ? -1 : 1));
  cache = comparisons;
  return cache;
}

export async function getComparisonBySlug(
  slug: string,
): Promise<Comparison | null> {
  const all = await getAllComparisons();
  return all.find((c) => c.slug === slug) ?? null;
}

/** Format YYYY-MM-DD → "May 8, 2026". UTC, deterministic, no locale wobble. */
export function formatUpdatedDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}
