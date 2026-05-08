import * as React from "react";
import { cn } from "@/lib/utils";
import type { FeatureRow } from "@/lib/comparisons";

// Phase 6.3 — side-by-side feature comparison table.
//
// Two-column comparison rendered as a real <table> for accessibility +
// crawler-friendliness. Each row is a single feature with Olokas's status
// in the left value column and the competitor's in the right. Optional
// `note` lines render in muted text under the feature name.
//
// Status strings are intentionally short ("Yes" / "No" / "Partial" / a
// brief qualifier). Long prose belongs in the MDX body.

const STATUS_KEYWORDS_POSITIVE = new Set([
  "yes",
  "y",
  "supported",
  "included",
  "native",
  "built-in",
  "built in",
]);

const STATUS_KEYWORDS_NEGATIVE = new Set([
  "no",
  "n",
  "none",
  "not supported",
  "n/a",
  "na",
]);

type StatusTone = "positive" | "negative" | "neutral";

function statusTone(value: string): StatusTone {
  const k = value.trim().toLowerCase();
  if (STATUS_KEYWORDS_POSITIVE.has(k)) return "positive";
  if (STATUS_KEYWORDS_NEGATIVE.has(k)) return "negative";
  return "neutral";
}

const TONE_CLASS: Readonly<Record<StatusTone, string>> = {
  positive: "text-foreground font-medium",
  negative: "text-muted-foreground",
  neutral: "text-foreground",
};

export function ComparisonTable({
  features,
  competitorLabel,
  className,
}: {
  features: FeatureRow[];
  competitorLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-md border border-border",
        className,
      )}
    >
      <table className="w-full border-collapse text-left text-[14px]">
        <caption className="sr-only">
          Feature comparison: Olokas vs. {competitorLabel}
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th
              scope="col"
              className="w-[44%] px-4 py-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Feature
            </th>
            <th
              scope="col"
              className="w-[28%] px-4 py-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Olokas
            </th>
            <th
              scope="col"
              className="w-[28%] px-4 py-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {competitorLabel}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {features.map((row, idx) => {
            const olokasTone = statusTone(row.olokas);
            const competitorTone = statusTone(row.competitor);
            return (
              <tr
                key={`${row.feature}-${idx}`}
                className="align-top hover:bg-muted/20"
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-normal"
                >
                  <span className="block text-[14px] text-foreground">
                    {row.feature}
                  </span>
                  {row.note ? (
                    <span className="mt-0.5 block text-[12px] leading-[1.5] text-muted-foreground">
                      {row.note}
                    </span>
                  ) : null}
                </th>
                <td
                  className={cn(
                    "px-4 py-3 text-[14px] leading-[1.5]",
                    TONE_CLASS[olokasTone],
                  )}
                >
                  {row.olokas}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-[14px] leading-[1.5]",
                    TONE_CLASS[competitorTone],
                  )}
                >
                  {row.competitor}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
