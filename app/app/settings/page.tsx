import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { createClient } from "@/lib/supabase/server";
import type {
  CustomerPlan,
  CustomerRecord,
  CustomerStatus,
} from "@/lib/customers/types";

import { DeleteAccountForm } from "./delete-account-form";
import { ManageBillingButton } from "./manage-billing-button";

// Phase 3.8 — /app/settings.
//
// Server component. The /app/* layout has already verified the auth
// session and ensured a customers row exists; we re-call those helpers
// here only because the React.cache() wrapper makes the second call free,
// and it keeps the page self-contained for the (admittedly rare) case of
// someone routing directly to it from a server-side fetch.
//
// Sections, top to bottom:
//   1. Account — email, plan, status. Read-only — plan changes happen
//      through Checkout / the Stripe portal, not via a form here.
//   2. Billing — wires up the "Manage subscription" button. Disabled with
//      "No subscription yet" when stripe_customer_id is null, so users on
//      the free tier (or who haven't completed Checkout yet) get a clear
//      signal instead of a portal error.
//   3. API access (Pro+ only) — stubbed with a "Phase 4" message. Free /
//      Starter accounts see the section but with a different note so they
//      know the feature exists at higher tiers.
//   4. Danger zone — account deletion via the type-to-confirm form
//      (DeleteAccountForm). Wrapped in destructive styling so it
//      visually reads as the last-resort action it is.

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The layout has already gated /app/*; this is defensive narrowing so
  // TS knows user / user.email are defined for the rest of the function.
  if (!user || !user.email) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your account.
        </p>
      </div>
    );
  }
  // Free dedupe — layout already populated this in the same request.
  const customer = await ensureCustomerRecord(user.id, user.email);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, billing, and access.
        </p>
      </header>

      <AccountSection customer={customer} />
      <BillingSection customer={customer} />
      <ApiAccessSection plan={customer.plan} />
      <DangerZone accountEmail={customer.email} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function SectionShell({
  title,
  description,
  variant = "default",
  children,
}: {
  title: string;
  description?: string;
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  const isDanger = variant === "danger";
  return (
    <section
      aria-label={title}
      className={
        isDanger
          ? "rounded-lg border border-destructive/40 bg-destructive/[0.04] p-6"
          : "rounded-lg border bg-card p-6"
      }
    >
      <header className="mb-5 flex flex-col gap-1">
        <h2
          className={
            "text-base font-semibold tracking-tight " +
            (isDanger ? "text-destructive" : "text-foreground")
          }
        >
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function AccountSection({ customer }: { customer: CustomerRecord }) {
  return (
    <SectionShell title="Account" description="Read-only account details.">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Email" value={customer.email} />
        <Field
          label="Plan"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="text-sm text-foreground">
                {formatPlan(customer.plan)}
              </span>
              {customer.plan === "free" ? (
                <Link
                  href="/pricing"
                  className="text-xs font-medium text-accent underline underline-offset-2 hover:no-underline"
                >
                  Upgrade →
                </Link>
              ) : null}
            </span>
          }
        />
        <Field
          label="Status"
          value={<StatusBadge status={customer.status} />}
        />
      </dl>
    </SectionShell>
  );
}

function BillingSection({ customer }: { customer: CustomerRecord }) {
  const hasStripeCustomer = Boolean(customer.stripe_customer_id);
  return (
    <SectionShell
      title="Billing"
      description="Update card, view invoices, or cancel from the Stripe customer portal."
    >
      <ManageBillingButton
        disabled={!hasStripeCustomer}
        disabledLabel={
          customer.plan === "free"
            ? "You're on the free plan — start a subscription from Pricing."
            : "No subscription yet."
        }
      />
    </SectionShell>
  );
}

function ApiAccessSection({ plan }: { plan: CustomerPlan }) {
  const gated = plan !== "pro" && plan !== "agency";
  return (
    <SectionShell
      title="API access"
      description="Programmatic access to your data. Available on Pro and Agency plans."
    >
      {gated ? (
        <p className="text-sm text-muted-foreground">
          API keys unlock on Pro and Agency plans.{" "}
          <Link
            href="/pricing"
            className="font-medium text-accent underline underline-offset-2 hover:no-underline"
          >
            See plans →
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            API key generation arrives in Phase 4. You&apos;ll be able to mint
            scoped read-only keys here once the API ships.
          </p>
          <span className="inline-flex w-fit items-center rounded-md border border-dashed bg-background px-2.5 py-1 text-xs text-muted-foreground">
            Coming in Phase 4
          </span>
        </div>
      )}
    </SectionShell>
  );
}

function DangerZone({ accountEmail }: { accountEmail: string }) {
  return (
    <SectionShell
      title="Danger zone"
      description="Irreversible actions. Read carefully."
      variant="danger"
    >
      <DeleteAccountForm accountEmail={accountEmail} />
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Small presentation helpers
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatPlan(plan: CustomerPlan): string {
  switch (plan) {
    case "free":
      return "Free";
    case "starter":
      return "Starter";
    case "pro":
      return "Pro";
    case "agency":
      return "Agency";
    default:
      return plan;
  }
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "accent";

function StatusBadge({ status }: { status: CustomerStatus }) {
  const { label, variant } = describeStatus(status);
  return (
    <Badge
      variant={variant}
      className="uppercase tracking-wider text-[10px]"
    >
      {label}
    </Badge>
  );
}

function describeStatus(status: CustomerStatus): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "active":
      return { label: "Active", variant: "accent" };
    case "past_due":
      return { label: "Past due", variant: "destructive" };
    case "paused":
      return { label: "Paused", variant: "secondary" };
    case "cancelled":
      return { label: "Cancelled", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}
