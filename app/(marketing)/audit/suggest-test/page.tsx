// Dev-only smoke-test page for the query suggestion engine.
// Returns 404 in production. Hit /audit/suggest-test?url=https://example.com
// while running `next dev` to see what the parser extracted and what queries
// it built.

import { notFound } from "next/navigation";
import { debugSuggestFromUrl } from "@/lib/queries/suggest";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function SuggestTestPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const rawParam = searchParams.url;
  const rawUrl = typeof rawParam === "string" ? rawParam : "";
  const result = rawUrl ? await debugSuggestFromUrl(rawUrl) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Query suggestion test
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Dev-only. Pass <code>?url=…</code> to see the deterministic suggestions
        for that page.
      </p>

      <form method="GET" className="mb-8 flex flex-col gap-2">
        <label htmlFor="url" className="text-sm font-medium">
          URL
        </label>
        <input
          id="url"
          name="url"
          type="text"
          defaultValue={rawUrl}
          placeholder="https://example.com"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="self-start rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
        >
          Suggest queries
        </button>
      </form>

      {result && (
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="mb-2 text-sm font-medium">Parsed signals</h2>
            <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1 text-xs leading-[1.6]">
              <dt className="text-muted-foreground">URL</dt>
              <dd className="break-all">
                {result.signals?.url ?? <em>invalid</em>}
              </dd>
              <dt className="text-muted-foreground">Title</dt>
              <dd>{result.signals?.title ?? <em>—</em>}</dd>
              <dt className="text-muted-foreground">H1</dt>
              <dd>{result.signals?.h1 ?? <em>—</em>}</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd>{result.signals?.description ?? <em>—</em>}</dd>
              <dt className="text-muted-foreground">Brand</dt>
              <dd>{result.signals?.brand ?? <em>—</em>}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd>{result.signals?.category ?? <em>—</em>}</dd>
            </dl>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium">Suggested queries</h2>
            <ol className="ml-5 list-decimal text-sm leading-[1.7]">
              {result.queries.map((q, i) => (
                <li key={`${i}-${q}`}>{q}</li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </main>
  );
}
