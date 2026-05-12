// Olokas Stripe setup script.
//
// Idempotently creates products + prices in Stripe from the source-of-truth
// definitions in `lib/stripe/products.ts`, then prints the resulting price IDs
// so the operator can paste them into Vercel env vars (STRIPE_PRICE_*_MONTHLY
// and STRIPE_PRICE_*_ANNUAL — already listed in `.env.example`).
//
// Usage (local, after exporting a Stripe API key):
//   STRIPE_SECRET_KEY=sk_test_...  npm run stripe:setup
//   STRIPE_SECRET_KEY=sk_live_...  npm run stripe:setup    # production
//
// Safe to re-run: existing products are matched by `metadata.olokas_tier`;
// existing prices are matched by their `lookup_key`. Nothing is ever deleted.
//
// Notes:
// - Stripe prices are immutable once created. If the unit amount or interval
//   here ever drifts from what's already in Stripe, this script creates a NEW
//   price with the same lookup_key — Stripe automatically transfers the
//   lookup_key off the old price — and prints the new price ID. The operator
//   then updates the env var.
// - Products are mutable; we update name/description in place if they drift,
//   so the Stripe dashboard stays in sync with marketing copy.

import Stripe from "stripe";
import {
  METADATA_TIER_KEY,
  STRIPE_PRODUCTS,
  type StripePriceDef,
  type StripeProductDef,
} from "../lib/stripe/products.ts";

// Pinned to match `lib/stripe/client.ts`. Bump both together.
const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

type SetupResult = {
  tier: StripeProductDef["tier"];
  productId: string;
  prices: Array<{ envVar: string; priceId: string; lookupKey: string }>;
};

async function findProductByTier(
  stripe: Stripe,
  tier: StripeProductDef["tier"],
): Promise<Stripe.Product | null> {
  // Paginate through active products. We expect <10 Olokas tier products
  // in this account; the autoPagingEach handles >100 cleanly.
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.metadata?.[METADATA_TIER_KEY] === tier) return product;
  }
  return null;
}

async function upsertProduct(
  stripe: Stripe,
  def: StripeProductDef,
): Promise<Stripe.Product> {
  const existing = await findProductByTier(stripe, def.tier);
  if (existing) {
    const driftedName = existing.name !== def.name;
    const driftedDescription = existing.description !== def.description;
    if (!driftedName && !driftedDescription) {
      console.log(`  ✓ product ${def.tier}: up to date (${existing.id})`);
      return existing;
    }
    console.log(`  ↻ product ${def.tier}: updating name/description (${existing.id})`);
    return stripe.products.update(existing.id, {
      name: def.name,
      description: def.description,
    });
  }
  console.log(`  + product ${def.tier}: creating`);
  return stripe.products.create({
    name: def.name,
    description: def.description,
    metadata: { [METADATA_TIER_KEY]: def.tier },
  });
}

async function findPriceByLookupKey(
  stripe: Stripe,
  lookupKey: string,
): Promise<Stripe.Price | null> {
  const result = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  return result.data[0] ?? null;
}

async function upsertPrice(
  stripe: Stripe,
  productId: string,
  priceDef: StripePriceDef,
): Promise<Stripe.Price> {
  const existing = await findPriceByLookupKey(stripe, priceDef.lookupKey);
  if (existing) {
    const drift =
      existing.unit_amount !== priceDef.unitAmountCents ||
      existing.currency !== "usd" ||
      existing.recurring?.interval !== priceDef.interval ||
      existing.product !== productId;
    if (!drift) {
      console.log(`    ✓ price ${priceDef.lookupKey}: up to date (${existing.id})`);
      return existing;
    }
    console.log(
      `    ↻ price ${priceDef.lookupKey}: amount/interval drift — creating replacement`,
    );
    // Reusing a lookup_key on a new price implicitly detaches it from the
    // old one (Stripe's transfer_lookup_key behavior on create).
    return stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: priceDef.unitAmountCents,
      recurring: { interval: priceDef.interval },
      lookup_key: priceDef.lookupKey,
      transfer_lookup_key: true,
    });
  }
  console.log(`    + price ${priceDef.lookupKey}: creating`);
  return stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: priceDef.unitAmountCents,
    recurring: { interval: priceDef.interval },
    lookup_key: priceDef.lookupKey,
  });
}

async function setupProduct(
  stripe: Stripe,
  def: StripeProductDef,
): Promise<SetupResult> {
  console.log(`\n— ${def.name} (${def.tier})`);
  const product = await upsertProduct(stripe, def);
  const prices: SetupResult["prices"] = [];
  for (const priceDef of def.prices) {
    const price = await upsertPrice(stripe, product.id, priceDef);
    prices.push({
      envVar: priceDef.envVar,
      priceId: price.id,
      lookupKey: priceDef.lookupKey,
    });
  }
  return { tier: def.tier, productId: product.id, prices };
}

function printEnvSummary(results: SetupResult[]): void {
  console.log("\n=================================================================");
  console.log("Stripe price IDs — paste into Vercel env vars (Production +");
  console.log("Preview), then redeploy:");
  console.log("=================================================================");
  for (const r of results) {
    for (const p of r.prices) {
      console.log(`${p.envVar}=${p.priceId}`);
    }
  }
  console.log("");
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      [
        "✗ Missing STRIPE_SECRET_KEY.",
        "",
        "  Set it before running this script. From the Stripe dashboard:",
        "    Developers → API keys → Secret key (use test mode while developing)",
        "",
        "  Then run:",
        "    STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup",
      ].join("\n"),
    );
    process.exit(1);
  }
  if (!/^sk_(test|live)_/.test(key)) {
    console.error(
      "✗ STRIPE_SECRET_KEY doesn't look like a Stripe secret key (expected sk_test_… or sk_live_…).",
    );
    process.exit(1);
  }

  const mode: "live" | "test" = key.startsWith("sk_live_") ? "live" : "test";
  console.log(`Running Olokas Stripe setup in ${mode.toUpperCase()} mode.`);
  if (mode === "live") {
    console.log(
      "⚠ This will create/update LIVE products. Existing test-mode resources are not touched.",
    );
  }

  const stripe = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });

  const results: SetupResult[] = [];
  for (const def of STRIPE_PRODUCTS) {
    results.push(await setupProduct(stripe, def));
  }

  printEnvSummary(results);
  console.log("✓ Stripe setup complete.");
}

main().catch((err: unknown) => {
  console.error("\n✗ Stripe setup failed:");
  if (err instanceof Error) {
    console.error(`  ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
