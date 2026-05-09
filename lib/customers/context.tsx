"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CustomerRecord } from "./types";

// Client-side React context for the authed user's customers row.
//
// The /app/* server-component layout calls ensureCustomerRecord() during its
// render, then wraps its children in <CustomerProvider customer={...}>. Any
// downstream client component (top nav badges, plan-aware UI) can read the
// record via useCustomer() without re-fetching.
//
// Server-component children inside the same request can keep calling
// ensureCustomerRecord() directly — React's cache() dedupes the round-trip,
// so there's no extra database hit.

const CustomerContext = createContext<CustomerRecord | null>(null);

export function CustomerProvider({
  customer,
  children,
}: {
  customer: CustomerRecord;
  children: ReactNode;
}) {
  return (
    <CustomerContext.Provider value={customer}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer(): CustomerRecord {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    throw new Error(
      "useCustomer must be used within <CustomerProvider> — render this client component inside the /app/* layout.",
    );
  }
  return ctx;
}

export function useOptionalCustomer(): CustomerRecord | null {
  return useContext(CustomerContext);
}
