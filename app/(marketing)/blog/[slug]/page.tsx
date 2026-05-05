import { notFound } from "next/navigation";

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  // Placeholder — MDX-based posts arrive in Phase 6.
  notFound();
}
