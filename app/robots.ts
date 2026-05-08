import type { MetadataRoute } from "next";

const BASE_URL = "https://olokas.com";

/**
 * Phase 6.4 — robots.txt.
 *
 * Crawlers are welcome on every public marketing surface (home, /audit,
 * /pricing, /blog/*, /vs/*). The signed-in product (`/app/*`) and the
 * server-only API surface (`/api/*`) are explicitly disallowed: nothing
 * useful for ranking, plus authenticated views are noindexed at the page
 * level too.
 *
 * The dev-only suggestion-engine smoke page is also disallowed so it never
 * leaks into search results if it accidentally ships enabled.
 *
 * Sitemap reference points at `app/sitemap.ts`, which Next emits at
 * `/sitemap.xml`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/", "/audit/suggest-test"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
