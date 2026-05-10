"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

import { deleteDomainAction } from "@/app/app/queries/actions";
import { QUERIES_INITIAL_STATE } from "@/app/app/queries/action-types";
import { Button } from "@/components/ui/button";

// DomainsList — renders the customer's domains with a delete button per
// row. Deleting a domain cascades to its customer_queries (and therefore
// to scan_results), so we surface a confirm() prompt before submitting
// the form. We use one useFormState per row so a delete failure on row A
// doesn't blank out a success state on row B.

export interface DomainListItem {
  id: string;
  domain: string;
  query_count: number;
}

export function DomainsList({ domains }: { domains: DomainListItem[] }) {
  if (domains.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No domains yet. Add your first one below to start tracking queries.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border bg-card">
      {domains.map((d) => (
        <DomainItem key={d.id} domain={d} />
      ))}
    </ul>
  );
}

function queryCountLabel(n: number): string {
  if (n === 0) return "No queries yet";
  if (n === 1) return "1 query";
  return `${n} queries`;
}

function DomainItem({ domain }: { domain: DomainListItem }) {
  const [state, formAction] = useFormState(
    deleteDomainAction,
    QUERIES_INITIAL_STATE,
  );
  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{domain.domain}</p>
        <p className="text-xs text-muted-foreground">
          {queryCountLabel(domain.query_count)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <form action={formAction}>
          <input type="hidden" name="id" value={domain.id} />
          <DeleteDomainSubmit
            label={domain.domain}
            hasQueries={domain.query_count > 0}
          />
        </form>
        {!state.ok && state.error ? (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function DeleteDomainSubmit({
  label,
  hasQueries,
}: {
  label: string;
  hasQueries: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Remove domain ${label}`}
      onClick={(e) => {
        const message = hasQueries
          ? `Remove ${label}? Its queries and historical scan results will also be removed.`
          : `Remove ${label}?`;
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}
