import { notFound } from "next/navigation";

const KNOWN = new Set(["semrush", "ahrefs", "wordlift", "seoptimer"]);

export default function VsPage({
  params,
}: {
  params: { competitor: string };
}) {
  const slug = params.competitor.toLowerCase();
  if (!KNOWN.has(slug)) notFound();
  // Placeholder — comparison pages arrive in Phase 6.
  return (
    <main className="mx-auto max-w-[720px] px-7 py-[8vh]">
      <h1 className="text-3xl font-semibold tracking-tight">
        Olokas vs. {slug.charAt(0).toUpperCase() + slug.slice(1)}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Comparison page arrives in Phase 6.
      </p>
    </main>
  );
}
