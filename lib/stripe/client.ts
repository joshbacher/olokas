import Stripe from "stripe";

// Pin to the API version the installed Stripe package expects.
// When upgrading the stripe package, update this constant to match.
const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  stripeInstance = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
  return stripeInstance;
}

export const STRIPE_WEBHOOK_SECRET = () => {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  return s;
};
