// Shared types for the /app/queries server actions.
//
// These live in a regular TypeScript module rather than alongside the
// "use server" actions file because Next 14's server-actions semantics
// require every export of a "use server" file to be an async function —
// types and constants would be rejected at build time. Keeping them here
// lets both the actions and the client-side useFormState consumers import
// without a runtime cost.

export type QueriesActionResult =
  | { ok: true }
  | { ok: false; error: string };

// Initial state for useFormState — `error: ""` reads as "no message yet"
// in the JSX guards (we render the destructive-text paragraph only when
// `state.error` is non-empty), so the form starts with a clean slate.
export const QUERIES_INITIAL_STATE: QueriesActionResult = {
  ok: false,
  error: "",
};
