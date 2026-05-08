import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import {
  formatPublishedDate,
  getAllPosts,
  getPostBySlug,
  relatedPosts,
  type Post,
} from "@/lib/posts";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) {
    return { title: "Post not found" };
  }
  const url = `https://olokas.com/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: post.coverImage ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

// MDX component overrides — keep prose tight and on-brand. The defaults
// inherit Tailwind preflight, so we re-style headings, paragraphs, and lists
// here rather than adding a global prose stylesheet.
const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      {...props}
      className="mb-4 mt-10 text-2xl font-semibold tracking-tight"
    />
  ),
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
    <p {...props} className="mb-5 text-[16px] leading-[1.65] text-foreground" />
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
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      {...props}
      className="my-6 border-l-2 border-accent pl-4 text-[16px] italic leading-[1.65] text-muted-foreground"
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      {...props}
      className="rounded bg-muted px-1.5 py-0.5 text-[14px] font-mono text-foreground"
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      {...props}
      className="my-5 overflow-x-auto rounded border border-border bg-muted p-4 text-[13px] leading-[1.55]"
    />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr {...props} className="my-8 border-border" />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold text-foreground" />
  ),
};

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const all = await getAllPosts();
  const related = relatedPosts(post, all, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@id": "https://olokas.com/#organization" },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://olokas.com/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <header className="mb-[6vh]">
        <BrandMark />
      </header>

      <p className="mb-6 text-[13px]">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-foreground"
        >
          ← All posts
        </Link>
      </p>

      <article>
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="mb-3 text-[clamp(26px,4vw,34px)] font-semibold leading-[1.2] tracking-tight">
            {post.title}
          </h1>
          <p className="mb-4 text-[16px] leading-[1.55] text-muted-foreground">
            {post.excerpt}
          </p>
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground/80">
            <span>{post.author}</span>
            <span aria-hidden="true"> · </span>
            <time dateTime={post.publishedAt}>
              {formatPublishedDate(post.publishedAt)}
            </time>
            <span aria-hidden="true"> · </span>
            <span>{post.readingTimeMinutes} min read</span>
          </p>
        </header>

        <div>
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>
      </article>

      {related.length > 0 ? (
        <RelatedPosts related={related} />
      ) : null}

      <SiteFooter />
    </main>
  );
}

function RelatedPosts({ related }: { related: Post[] }) {
  return (
    <aside className="mt-12 border-t border-border pt-8">
      <h2 className="mb-4 text-[15px] font-semibold">Related posts</h2>
      <ul className="flex flex-col divide-y divide-border">
        {related.map((post) => (
          <li key={post.slug} className="py-3 first:pt-0 last:pb-0">
            <Link
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-0.5"
            >
              <span className="text-[15px] font-medium tracking-tight group-hover:text-accent">
                {post.title}
              </span>
              <span className="text-[12px] uppercase tracking-wide text-muted-foreground/80">
                <time dateTime={post.publishedAt}>
                  {formatPublishedDate(post.publishedAt)}
                </time>
                <span aria-hidden="true"> · </span>
                <span>{post.readingTimeMinutes} min</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
