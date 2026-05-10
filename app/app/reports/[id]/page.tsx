import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// Phase 3.7 — /app/reports/[id] viewer stub.
//
// The list view in /app/reports links here. Full HTML report rendering lands
// in Phase 5.2 (the WeeklyReport email template ships in 5.1, and the
// in-app viewer reuses it). For now we render a small placeholder so the
// link doesn't 404 and the user gets a clear pointer back.

export const metadata: Metadata = { title: "Report" };
export const dynamic = "force-dynamic";

export default function ReportViewerStubPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/app/reports"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          ← All reports
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Report viewer
        </h1>
        <p className="text-sm text-muted-foreground">
          Full report rendering arrives in Phase 5.2.
        </p>
      </div>

      <section
        aria-labelledby="reports-viewer-stub-heading"
        className="rounded-lg border border-dashed bg-card px-6 py-10 text-center"
      >
        <h2
          id="reports-viewer-stub-heading"
          className="text-base font-semibold tracking-tight"
        >
          We&apos;re still building this view
        </h2>
        <p className="mx-auto mt-2 max-w-[480px] text-sm text-muted-foreground">
          The in-app report viewer is on the roadmap as Phase 5.2. Once a
          report is generated for your account, the weekly email contains the
          same data and is the canonical way to read it for now.
        </p>
        <div className="mt-5 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/app/reports">Back to all reports</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
