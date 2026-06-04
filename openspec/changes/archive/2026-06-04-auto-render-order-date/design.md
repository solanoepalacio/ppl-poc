## Context

The back-office orders view (`packages/frontend/src/app/(backoffice)/orders/page.tsx`) is a Next.js **server component**. It reads the selected day from `searchParams.day`, fetches orders server-side via `getOrdersByDay(day)`, and renders them. The date-picker is a native HTML form:

```tsx
<form className="card" method="get">
  <label htmlFor="day">Día </label>
  <input id="day" name="day" type="date" defaultValue={view.day} />
  <button className="btn-secondary">Ver</button>
</form>
```

The URL (`/orders?day=YYYY-MM-DD`) is the single source of truth — there is no client state, no react-query/SWR, just a GET form submit that re-renders the server component. The "Ver" button exists only to submit that form.

## Goals / Non-Goals

**Goals:**
- Selecting a date immediately navigates to that day's view (re-renders orders) with no extra click.
- Remove the "Ver" button from the orders date-picker.
- Preserve the existing `?day=` URL contract and server-side data fetch (URL stays shareable/bookmarkable, default-to-today behavior intact).

**Non-Goals:**
- No backend, API, or `dayBounds` changes.
- No change to the production-totals date-picker (`production/page.tsx`), despite its identical pattern.
- No client-side data fetching / loading-spinner architecture — navigation-driven server re-render is retained.

## Decisions

**Decision: Extract a small `"use client"` date-picker component that pushes the URL on change.**
The `<input type="date">` needs an `onChange` handler, which a server component cannot provide. A minimal client component renders the input and, on change, updates the `day` query param via `next/navigation`'s `useRouter().push()` (or `replace()`), causing the server component to re-render with the new day.

- *Rationale:* Smallest viable change. Keeps the server component as the data-fetching authority and the URL as the source of truth; only the trigger moves from a button click to the input's change event.
- *Alternatives considered:*
  - *Keep the `<form method="get">` and auto-submit via `onChange` requestSubmit():* still needs a client component for the handler and is less idiomatic than router navigation; offers no benefit.
  - *Move to fully client-side fetching (react-query/SWR):* over-engineered for a PoC; discards the simple server-render model and URL-as-state.

**Decision: Use `router.push` (new history entry) on date change.**
- *Rationale:* Each viewed day is a distinct destination; back-button returning to the prior day matches expectation. `replace` is the alternative if history clutter becomes a concern — minor, deferrable.

**Decision: Default value and empty selection.** The picker keeps `defaultValue`/`value` bound to the current `view.day`. If the user clears the input (empty value), navigate to `/orders` with no `day` param so the server falls back to today, preserving current behavior.

## Risks / Trade-offs

- [Native date input UX differs across browsers — some fire `change` only on full date commit, not per keystroke] → Acceptable; commit-on-complete is exactly the desired trigger. No debounce needed.
- [Losing the explicit submit could feel abrupt if navigation is slow] → Server fetch is a single indexed SQLite query; latency is negligible for the PoC. Next.js navigation gives standard pending feedback.
- [Client component is now a hydration boundary on an otherwise-static page] → Trivial; the component is tiny and self-contained.

## Migration Plan

Pure frontend swap, no data migration. Replace the form+button markup in `orders/page.tsx` with the new client date-picker component. Rollback = revert the commit.

## Open Questions

- None blocking. (`push` vs `replace` is a minor UX preference, defaulting to `push`.)
