// Phase 6.1 — pricing data, kept in a plain module so it can be
// imported from both server components (the /pricing page, JSON-LD
// builder) and the client tier-cards component without tripping
// Next.js's "client reference" treatment of values imported from a
// `"use client"` module.

export type BillingCycle = "monthly" | "annual";

export type PricingTier = {
  id: "starter" | "pro" | "agency";
  name: string;
  blurb: string;
  highlighted?: boolean;
  monthly: {
    /** Display price per month, e.g. 39. */
    price: number;
  };
  annual: {
    /** Per-month equivalent when paying annually, e.g. 33. */
    pricePerMonth: number;
    /** Annual total billed once, e.g. 390. */
    yearlyTotal: number;
    /** Difference vs paying monthly for 12 months, e.g. 78. */
    yearlySavings: number;
  };
  features: string[];
  ctaLabel: string;
  ctaHref: string;
};

export const PRICING_TIERS: ReadonlyArray<PricingTier> = [
  {
    id: "starter",
    name: "Starter",
    blurb: "For one site, watching the queries that matter.",
    monthly: { price: 39 },
    annual: { pricePerMonth: 33, yearlyTotal: 390, yearlySavings: 78 },
    features: [
      "1 domain",
      "10 target queries",
      "Weekly scans across ChatGPT, Perplexity, Google AI Overviews, and Claude",
      "Monday email report",
      "Shareable audit links",
      "Email support",
    ],
    ctaLabel: "Start free audit",
    ctaHref: "/audit",
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "Track competitors and pull data into your own tools.",
    highlighted: true,
    monthly: { price: 99 },
    annual: { pricePerMonth: 83, yearlyTotal: 990, yearlySavings: 198 },
    features: [
      "5 domains",
      "50 target queries",
      "Daily scans, with delta alerts when scores move",
      "Up to 5 competitor domains tracked per query",
      "API access for raw scan data",
      "Priority email support",
    ],
    ctaLabel: "Start free audit",
    ctaHref: "/audit",
  },
  {
    id: "agency",
    name: "Agency",
    blurb: "Multiple clients, white-label reports, more seats.",
    monthly: { price: 299 },
    annual: { pricePerMonth: 249, yearlyTotal: 2990, yearlySavings: 598 },
    features: [
      "25 domains",
      "250 target queries",
      "White-label PDF reports",
      "Up to 5 team seats",
      "Slack and Microsoft Teams notifications",
      "Dedicated onboarding call",
    ],
    ctaLabel: "Start free audit",
    ctaHref: "/audit",
  },
];

export function formatUsd(value: number): string {
  // Whole dollars throughout — no tier price has cents.
  return `$${value.toLocaleString("en-US")}`;
}
