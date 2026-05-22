import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

// Phase 3.13 — /app/onboarding — 4-step post-checkout wizard.
//
// Server component that:
//   1. Confirms the user is authed (the /app/* layout already guards this;
//      the check here is a TS-narrowing belt).
//   2. Reads the customer record. If onboarding_completed_at is set, the user
//      has already finished — redirect to /app/dashboard immediately.
//   3. Fetches existing domains so step 1 can offer them as pre-filled options.
//   4. Renders the <OnboardingFlow> client component with initial data.
//
// The wizard itself is client-side state (no URL routing per step — per spec).

export const metadata: Metadata = { title: "Set up Olokas" };
export const dynamic = "force-dynamic";

interface DomainRow {
  id: string;
  domain: string;
}

// The customers row shape from Supabase includes onboarding_completed_at
// after migration 0002. We cast via an intersection to avoid editing the
// shared CustomerRecord type (which doesn't know about this column yet).
interface CustomerWithOnboarding {
  id: string;
  email: string;
  query_limit: number;
  domain_limit: number;
  onboarding_completed_at: string | null;
}

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login?next=/app/onboarding");
  }

  // Fetch customer row directly (with the new column) rather than via
  // ensureCustomerRecord so we can read onboarding_completed_at.
  // Still call ensureCustomerRecord for the upsert backstop.
  await ensureCustomerRecord(user.id, user.email);

  const { data: customerRow } = await supabase
    .from("customers")
    .select("id, email, query_limit, domain_limit, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle<CustomerWithOnboarding>();

  // Already completed — nothing to do here.
  if (customerRow?.onboarding_completed_at) {
    redirect("/app/dashboard");
  }

  const queryLimit = customerRow?.query_limit ?? 1;

  // Fetch existing domains so step 1 can show them as options.
  const { data: domainsData } = await supabase
    .from("domains")
    .select("id, domain")
    .order("created_at", { ascending: true })
    .limit(20);

  const existingDomains: DomainRow[] = (domainsData ?? []) as DomainRow[];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up Olokas
        </h1>
        <p className="text-sm text-muted-foreground">
          A few quick steps to get your first scan running.
        </p>
      </header>

      <OnboardingFlow
        existingDomains={existingDomains}
        queryLimit={queryLimit}
      />
    </div>
  );
}
