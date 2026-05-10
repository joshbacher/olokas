"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil, Save, Trash2, X } from "lucide-react";

import {
  deleteQueryAction,
  updateQueryAction,
} from "@/app/app/queries/actions";
import { QUERIES_INITIAL_STATE } from "@/app/app/queries/action-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// QueriesTable — list, inline-edit, and delete the customer's queries.
//
// Each row is either a ViewRow (display) or an EditRow (form). The
// parent table holds a single `editingId` state so only one row is in
// edit mode at a time. Each row owns its own useFormState calls for the
// delete + update actions, which keeps a transient error on row A from
// blanking out a successful inline-save state on row B.
//
// All mutations go through the server actions in app/app/queries/actions.ts;
// this component never touches Supabase directly.

export interface QueryRow {
  id: string;
  query: string;
  is_priority: boolean;
  created_at: string;
  domain: string | null;
}

export function QueriesTable({ queries }: { queries: QueryRow[] }) {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  if (queries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No queries yet. Add one below — each query is what we ask AI
          search engines to see whether your domain shows up.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Query</TableHead>
            <TableHead className="w-[20%]">Domain</TableHead>
            <TableHead className="w-[12%]">Priority</TableHead>
            <TableHead className="w-[12%]">Added</TableHead>
            <TableHead className="w-[16%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries.map((q) =>
            editingId === q.id ? (
              <EditRow
                key={q.id}
                query={q}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ViewRow
                key={q.id}
                query={q}
                onEdit={() => setEditingId(q.id)}
              />
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// formatAddedDate — UTC YYYY-MM-DD, deterministic across server/client to
// avoid the Intl-locale hydration wobble.
function formatAddedDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

function ViewRow({
  query,
  onEdit,
}: {
  query: QueryRow;
  onEdit: () => void;
}) {
  const [state, formAction] = useFormState(
    deleteQueryAction,
    QUERIES_INITIAL_STATE,
  );
  return (
    <TableRow>
      <TableCell className="font-medium">
        <span className="line-clamp-2 break-words">{query.query}</span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {query.domain ?? "—"}
      </TableCell>
      <TableCell>
        {query.is_priority ? (
          <Badge variant="accent">Priority</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {formatAddedDate(query.created_at)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={`Edit query: ${query.query}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Edit</span>
          </Button>
          <form action={formAction} className="inline">
            <input type="hidden" name="id" value={query.id} />
            <DeleteQuerySubmit label={query.query} />
          </form>
        </div>
        {!state.ok && state.error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {state.error}
          </p>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function DeleteQuerySubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Delete query: ${label}`}
      onClick={(e) => {
        if (
          !window.confirm(
            "Delete this query? Historical scan results for it will also be removed.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{pending ? "Deleting…" : "Delete"}</span>
    </Button>
  );
}

function EditRow({
  query,
  onCancel,
}: {
  query: QueryRow;
  onCancel: () => void;
}) {
  const [state, formAction] = useFormState(
    updateQueryAction,
    QUERIES_INITIAL_STATE,
  );

  // Close the editor as soon as the action reports success.
  React.useEffect(() => {
    if (state.ok) {
      onCancel();
    }
  }, [state, onCancel]);

  return (
    <TableRow>
      <TableCell colSpan={5} className="bg-muted/30">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={query.id} />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor={`edit-query-${query.id}`}
              >
                Query text
              </label>
              <Input
                id={`edit-query-${query.id}`}
                name="query"
                type="text"
                defaultValue={query.query}
                required
                maxLength={500}
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 whitespace-nowrap text-sm">
              <input
                type="checkbox"
                name="isPriority"
                defaultChecked={query.is_priority}
                className="h-4 w-4 rounded border border-input text-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <span>Priority</span>
            </label>
            <div className="flex items-center gap-2">
              <SaveSubmit />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                <X className="mr-1 h-4 w-4" aria-hidden="true" />
                Cancel
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Domain: <span className="text-foreground">{query.domain ?? "—"}</span>
            {" · "}
            To move a query to a different domain, delete it and re-add
            it on the new domain.
          </p>
          {!state.ok && state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </form>
      </TableCell>
    </TableRow>
  );
}

function SaveSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Save className="mr-1 h-4 w-4" aria-hidden="true" />
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}
