/**
 * Phase 6.2 — MDX blog post loader.
 *
 * Reads `content/posts/*.mdx` from disk, parses frontmatter with gray-matter,
 * exposes `getAllPosts()` + `getPostBySlug()` and helpers for reading time and
 * tag-overlap related-posts. The MDX body is left as a raw string here; rendering
 * happens in the post page via `next-mdx-remote/rsc`.
 *
 * The frontmatter shape is enforced at runtime with zod so a malformed post
 * fails the build loudly rather than silently dropping fields.
 */

import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

const FrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: "slug must be kebab-case ASCII",
  }),
  excerpt: z.string().min(1),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "publishedAt must be YYYY-MM-DD"),
  author: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  coverImage: z.string().optional(),
});

export type PostFrontmatter = z.infer<typeof FrontmatterSchema>;

export type Post = PostFrontmatter & {
  /** Raw MDX body (no frontmatter). */
  content: string;
  /** Estimated reading time in minutes (rounded up, minimum 1). */
  readingTimeMinutes: number;
  /** Plain-text word count of the body — useful for tests + diagnostics. */
  wordCount: number;
};

const WORDS_PER_MINUTE = 220;

/** Cheap word count: strips MDX/JSX-ish tags + code fences and counts space-delimited tokens. */
export function countWords(body: string): number {
  const stripped = body
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/<[^>]+>/g, " ") // jsx tags
    .replace(/[#*_>~`\-]+/g, " ") // markdown punctuation
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // markdown links
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return 0;
  return stripped.split(" ").length;
}

export function readingTimeMinutes(body: string): number {
  const words = countWords(body);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Format YYYY-MM-DD → "May 7, 2026". UTC, deterministic, no locale wobble. */
export function formatPublishedDate(isoDate: string): string {
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

async function readPostFile(filePath: string): Promise<Post> {
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const fm = FrontmatterSchema.parse(data);
  return {
    ...fm,
    content,
    readingTimeMinutes: readingTimeMinutes(content),
    wordCount: countWords(content),
  };
}

let cache: Post[] | null = null;

/**
 * Reads every `*.mdx` file under `content/posts/`, returns posts sorted by
 * publishedAt descending. Results are cached for the lifetime of the process
 * (fine for a Next.js server build; dev rebuilds bust the module).
 */
export async function getAllPosts(): Promise<Post[]> {
  if (cache) return cache;
  let entries: string[];
  try {
    entries = await fs.readdir(POSTS_DIR);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      cache = [];
      return cache;
    }
    throw err;
  }
  const mdxFiles = entries.filter((name) => name.endsWith(".mdx"));
  const posts = await Promise.all(
    mdxFiles.map((name) => readPostFile(path.join(POSTS_DIR, name))),
  );
  posts.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  cache = posts;
  return cache;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

/**
 * Returns up to `limit` posts that share at least one tag with `post`,
 * sorted by overlap count desc, then by publishedAt desc. The post itself is
 * excluded. Empty array if no overlaps exist.
 */
export function relatedPosts(post: Post, all: Post[], limit = 3): Post[] {
  const tagSet = new Set(post.tags);
  if (tagSet.size === 0) return [];
  const scored = all
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      const overlap = p.tags.reduce(
        (n, t) => n + (tagSet.has(t) ? 1 : 0),
        0,
      );
      return { post: p, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return a.post.publishedAt < b.post.publishedAt ? 1 : -1;
    });
  return scored.slice(0, limit).map((x) => x.post);
}

export const POSTS_PER_PAGE = 10;

/** Page-of-posts slice for the blog index. `page` is 1-indexed. */
export function paginatePosts(
  all: Post[],
  page: number,
  perPage = POSTS_PER_PAGE,
): { posts: Post[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    posts: all.slice(start, start + perPage),
    totalPages,
    page: safePage,
  };
}
