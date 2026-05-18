import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  formatPublishedDate,
  getAllPosts,
  paginatePosts,
  POSTS_PER_PAGE,
  type Post,
} from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Plain-English notes on AI search visibility, GEO, and how ChatGPT, Perplexity, Google AI Overviews, and Claude pick what to cite.",
  alternates: { canonical: "https://olokas.com/blog" },
  openGraph: {
    title: "Olokas Blog",
    description:
      "Notes on AI search visibility — what the engines do at retrieval time, how to read a GEO report, what actually moves the needle.",
    url: "https://olokas.com/blog",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Olokas — AI search visibility, measured",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Olokas Blog",
    description:
      "Notes on AI search visibility, GEO, and how the engines pick what to cite.",
    images: ["/og-default.png"],
  },
};

type SearchParams = { page?: string };

function parsePage(raw: string | undefined): number {
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const all = await getAllPosts();
  const requested = parsePage(searchParams.page);
  const { posts, totalPages, page } = paginatePosts(
    all,
    requested,
    POSTS_PER_PAGE,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <SiteNav className="mb-[6vh]" />

      <section>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="mb-10 text-[15px] leading-[1.55] text-muted-foreground">
          Working notes on AI search visibility. How the engines retrieve,
          what a GEO report measures, what we&apos;ve seen move and what
          hasn&apos;t. No advice we wouldn&apos;t take ourselves.
        </p>

        {posts.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">
            No posts yet. The first ones land alongside Phase 6 of the build.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {posts.map((post) => (
              <PostListItem key={post.slug} post={post} />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <Pagination currentPage={page} totalPages={totalPages} />
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}

function PostListItem({ post }: { post: Post }) {
  return (
    <li className="py-6">
      <article>
        <Link
          href={`/blog/${post.slug}`}
          className="group block focus:outline-none"
        >
          <h2 className="mb-1.5 text-[20px] font-semibold tracking-tight group-hover:text-accent group-focus-visible:text-accent">
            {post.title}
          </h2>
          <p className="mb-2 text-[14px] leading-[1.55] text-muted-foreground">
            {post.excerpt}
          </p>
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground/80">
            <time dateTime={post.publishedAt}>
              {formatPublishedDate(post.publishedAt)}
            </time>
            <span aria-hidden="true"> · </span>
            <span>{post.readingTimeMinutes} min read</span>
          </p>
        </Link>
      </article>
    </li>
  );
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const prevHref = currentPage > 2 ? `/blog?page=${currentPage - 1}` : "/blog";
  const nextHref = `/blog?page=${currentPage + 1}`;
  return (
    <nav
      className="mt-8 flex items-center justify-between border-t border-border pt-6 text-[13px]"
      aria-label="Blog pagination"
    >
      {currentPage > 1 ? (
        <Link
          href={prevHref}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Newer posts
        </Link>
      ) : (
        <span className="text-muted-foreground/50">← Newer posts</span>
      )}
      <span className="text-muted-foreground/80">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link
          href={nextHref}
          className="text-muted-foreground hover:text-foreground"
        >
          Older posts →
        </Link>
      ) : (
        <span className="text-muted-foreground/50">Older posts →</span>
      )}
    </nav>
  );
}
