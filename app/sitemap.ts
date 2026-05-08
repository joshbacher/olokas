import type { MetadataRoute } from "next";
import { getAllComparisons } from "@/lib/comparisons";
import { getAllPosts } from "@/lib/posts";

const BASE_URL = "https://olokas.com";

/**
 * Phase 6.4 — full sitemap.xml.
 *
 * Lists every public marketing route plus per-content rows for blog posts
 * and competitor comparison pages. Authenticated `/app/*` routes and the
 * `/api/*` surface are intentionally excluded — those are also blocked by
 * `app/robots.ts`. Dev-only `/audit/suggest-test` is omitted as well.
 *
 * Per-audit URLs (`/audit/[auditId]`) are noindex/nofollow at the page
 * level (see metadata in that route) — they're meant to be shareable but
 * not crawl-indexed — so they don't appear here either.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/audit`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const posts = await getAllPosts();
  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const comparisons = await getAllComparisons();
  const comparisonRoutes: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${BASE_URL}/vs/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...comparisonRoutes];
}
