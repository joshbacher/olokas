// Source of truth for the Olokas Stripe products + prices that back the
// pricing page. Used by `scripts/stripe-setup.ts` to idempotently create
// products + prices in Stripe and emit the price IDs the operator must
// paste into Vercel env vars (STRIPE_PRICE_*_MONTHLY / *_ANNUAL).
//
// The dollar amounts here are derived from `lib/pricing/tiers.ts` so the
// marketing copy and the actual Stripe charge stay locked together.
// Stripe wants amounts in the smallest currency unit (cents for USD), so
// we convert at the boundary.

import { PRICING_TIERS, type PricingTier } from "../pricing/tiers.ts";

export type StripeInterval = "month" | "year";

export type StripePriceDef = {
  /** Stripe lookup_key — unique across the account; used for idempotent finds. */
  lookupKey: string;
  /** Stripe recurring interval. */
  interval: StripeInterval;
  /** Amount charged per interval, in USD cents. */
  unitAmountCents: number;
  /** The env var name on Vercel that receives this price ID. */
  envVar: string;
};

export type StripeProductDef = {
  /** Olokas tier identifier, persisted on the Stripe product as metadata.olokas_tier. */
  tier: PricingTier["id"];
  /** Display name on the Stripe dashboard + on invoices. */
  name: string;
  /** Stripe product description — also shown on invoices. */
  description: string;
  prices: StripePriceDef[];
};

/** Stripe product metadata key used to look up Olokas tier products idempotently. */
export const METADATA_TIER_KEY = "olokas_tier" as const;

function buildProductDef(tier: PricingTier): StripeProductDef {
  const tierEnv = tier.id.toUpperCase();
  return {
    tier: tier.id,
    name: `Olokas ${tier.name}`,
    description: tier.blurb,
    prices: [
      {
        lookupKey: `olokas_${tier.id}_monthly`,
        interval: "month",
        unitAmountCents: tier.monthly.price * 100,
        envVar: `STRIPE_PRICE_${tierEnv}_MONTHLY`,
      },
      {
        lookupKey: `olokas_${tier.id}_annual`,
        interval: "year",
        // The annual variant is charged once as a single yearly total
        // (not month × 12). PRICING_TIERS holds the operator-facing
        // figures; yearlyTotal is what hits the customer's card.
        unitAmountCents: tier.annual.yearlyTotal * 100,
        envVar: `STRIPE_PRICE_${tierEnv}_ANNUAL`,
      },
    ],
  };
}

export const STRIPE_PRODUCTS: ReadonlyArray<StripeProductDef> =
  PRICING_TIERS.map(buildProductDef);
