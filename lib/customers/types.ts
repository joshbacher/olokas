// Shared `customers` row types — kept in a runtime-free module so both
// server code (lib/customers/ensure.ts) and client code (CustomerProvider /
// useCustomer in lib/customers/context.tsx) can import without dragging the
// service-role Supabase client into a client bundle.

export type CustomerPlan = "free" | "starter" | "pro" | "agency";
export type CustomerStatus = "active" | "past_due" | "paused" | "cancelled";

export interface CustomerRecord {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: CustomerPlan;
  status: CustomerStatus;
  query_limit: number;
  domain_limit: number;
  created_at: string;
  updated_at: string;
}
