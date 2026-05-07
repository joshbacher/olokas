"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRICING_TIERS,
  type BillingCycle,
  type PricingTier,
  formatUsd,
} from "@/lib/pricing/tiers";

// Phase 6.1 — pricing tier cards with a monthly / annual toggle.
//
// CTA on every tier currently routes to /audit (the free one-time
// audit) because Stripe isn't wired end-to-end yet — Phase 3.10
// implements /api/checkout. Once the price IDs land in env we'll swap
// the CTAs to call createCheckoutSession(priceId).
//
// Annual prices show the per-month equivalent (the figure most people
// scan first), with the annual total + savings spelled out below the
// price so the discount is legible without doing arithmetic.

export function PricingTiers() {
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Billing cycle"
        className="mb-8 inline-flex items-center gap-1 rounded-md border border-border bg-secondary p-1 text-sm"
      >
        <CycleButton
          active={cycle === "monthly"}
          onClick={() => setCycle("monthly")}
          label="Monthly"
        />
        <CycleButton
          active={cycle === "annual"}
          onClick={() => setCycle("annual")}
          label="Annual"
          hint="Save ~16%"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <TierCard key={tier.id} tier={tier} cycle={cycle} />
        ))}
      </div>
    </div>
  );
}

function CycleButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "rounded-sm px-3 py-1.5 transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="font-medium">{label}</span>
      {hint && (
        <span className="ml-2 text-xs text-muted-foreground">{hint}</span>
      )}
    </button>
  );
}

function TierCard({
  tier,
  cycle,
}: {
  tier: PricingTier;
  cycle: BillingCycle;
}) {
  const monthlyDisplay =
    cycle === "monthly" ? tier.monthly.price : tier.annual.pricePerMonth;

  const subline =
    cycle === "monthly" ? (
      <span>Billed monthly. Cancel anytime.</span>
    ) : (
      <span>
        Billed annually as {formatUsd(tier.annual.yearlyTotal)}. Save{" "}
        {formatUsd(tier.annual.yearlySavings)}/yr.
      </span>
    );

  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        tier.highlighted && "border-accent ring-1 ring-accent"
      )}
    >
      <CardHeader>
        <div className="mb-2 flex items-center justify-between">
          <CardTitle>{tier.name}</CardTitle>
          {tier.highlighted && <Badge variant="accent">Most popular</Badge>}
        </div>
        <CardDescription className="leading-snug">{tier.blurb}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-3xl font-semibold tracking-tight">
            {formatUsd(monthlyDisplay)}
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        <p className="mb-5 text-xs text-muted-foreground">{subline}</p>

        <ul className="space-y-2 text-sm">
          {tier.features.map((feature) => (
            <li key={feature} className="flex gap-2 leading-snug">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          asChild
          variant={tier.highlighted ? "accent" : "default"}
          className="w-full"
        >
          <Link href={tier.ctaHref}>{tier.ctaLabel}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
