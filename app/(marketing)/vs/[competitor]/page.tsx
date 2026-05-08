import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { BrandMark } from "@/components/brand-mark";
import { ComparisonTable } from "@/components/comparison-table";
import { SiteFooter } from "@/components/site-footer";
import {
  formatUpdatedDate,
  getAllComparisons,
  getComparisonBySlug,
} from "@/lib/comparisons";

// Phase 6.3 — competitor comparison pages.
//
// Slugs come from `content/comparisons/*.mdx` files. The frontmatter
// supplies the page title, intro excerpt, last-updated date, and the
// structured side-by-side feature table. The MDX body holds the prose
// (intro context + "When to choose Olokas" + "When to choose them"
// sections). Tone is neutral and stub-flagged — these pages are meant to
// be edited by a human once they've used both products in earnest.

type Params = { competitor: string };

export async function generateStaticParams(): Promise<Params[]> {
  const all = await getAllComparisons();
  return all.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const slug = params.competitor.toLowerCase();
  const comp = await getComparisonBySlug(slug);
  if (!comp) {
    return { title: "Comparison not found" };
  }
  const url = `https://olokas.com/vs/${comp.slug}`;
  return {
    title: comp.title,
    description: comp.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: comp.title,
      description: comp.excerpt,
    },
    twitter: {
      card: "summary",
      title: comp.title,
      description: comp.excerpt,
    },
  };
}

// MDX body component overrides — match the blog page styles so prose feels
// consistent across the marketing site.
const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      {...props}
      className="mb-3 mt-10 text-xl font-semibold tracking-tight"
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      {...props}
      className="mb-2 mt-8 text-[17px] font-semibold tracking-tight"
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      {...props}
      className="mb-5 text-[16px] leading-[1.65] text-foreground"
    />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      className="text-accent underline underline-offset-2 hover:text-accent/80"
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      {...props}
      className="mb-5 ml-5 list-disc space-y-1.5 text-[16px] leading-[1.65]"
    />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      {...props}
      className="mb-5 ml-5 list-decimal space-y-1.5 text-[16px] leading-[1.65]"
    />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold text-foreground" />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr {...props} className="my-8 border-border" />
  ),
};

export default async function VsCompetitorPage({
  params,
}: {
  params: Params;
}) {
  const slug = params.competitor.toLowerCase();
  const comp = await getComparisonBySlug(slug);
  if (!comp) notFound();

  const url = `https://olokas.com/vs/${comp.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: comp.title,
    description: comp.excerpt,
    dateModified: comp.updatedAt,
    author: { "@type": "Organization", name: "Olokas" },
    publisher: { "@id": "https://olokas.com/#organization" },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[760px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <header className="mb-[6vh]">
        <BrandMark />
      </header>

      <p className="mb-6 text-[13px]">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground"
        >
          ← Olokas home
        </Link>
      </p>

      <article>
        <header className="mb-8 border-b border-border pb-6">
          <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground/80">
            Comparison
          </p>
          <h1 className="mb-3 text-[clamp(26px,4vw,34px)] font-semibold leading-[1.2] tracking-tight">
            {comp.title}
          </h1>
          <p className="mb-4 text-[16px] leading-[1.55] text-muted-foreground">
            {comp.excerpt}
          </p>
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground/80">
            <span>Updated </span>
            <time dateTime={comp.updatedAt}>
              {formatUpdatedDate(comp.updatedAt)}
            </time>
            {comp.competitorUrl ? (
              <>
                <span aria-hidden="true"> · </span>
                <a
                  href={comp.competitorUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="hover:text-foreground"
                >
                  {comp.competitor} site ↗
                </a>
              </>
            ) : null}
          </p>
        </header>

        <section aria-label="Feature comparison" className="mb-10">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Feature-by-feature
          </h2>
          <ComparisonTable
            features={comp.features}
            competitorLabel={comp.competitor}
          />
          <p className="mt-3 text-[12px] leading-[1.55] text-muted-foreground">
            Stub data — will be replaced with human-edited research after
            hands-on use of both products. Verify pricing and capability
            details on each vendor&apos;s site.
          </p>
        </section>

        <div>
          <MDXRemote source={comp.content} components={mdxComponents} />
        </div>
      </article>

      <aside className="mt-12 border-t border-border pt-8">
        <h2 className="mb-3 text-[15px] font-semibold">Try Olokas yourself</h2>
        <p className="mb-4 text-[14px] leading-[1.55] text-muted-foreground">
          Run a free audit against your own domain — no signup, no card. You
          get a one-page report showing how the four engines answer about
          your business right now.
        </p>
        <p className="text-[14px]">
          <Link
            href="/audit"
            className="text-accent underline underline-offset-2 hover:text-accent/80"
          >
            Start a free audit →
          </Link>
        </p>
      </aside>

      <SiteFooter />
    </main>
  );
}
