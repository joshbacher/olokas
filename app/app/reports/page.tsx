import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder — full implementation lands in Phase 3 (or Phase 5 for reports).
      </p>
    </div>
  );
}
