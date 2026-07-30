## Context

The production view (`packages/frontend/src/app/(backoffice)/production/page.tsx`) is an async server component that reads `searchParams.day` and calls `getProductionTotals(day)`. Today its date picker is a GET `<form>` with a native date input and a **"Ver"** submit button — the user must click "Ver" to push the new `?day=` param and re-render.

The orders-by-day view already solves this with a small client component, `DayPicker` (`packages/frontend/src/app/(backoffice)/orders/DayPicker.tsx`), that calls `router.push('/orders?day=...')` on the input's `onChange` inside a `useTransition`. The production view should mirror this exactly.

## Goals / Non-Goals

**Goals:**
- Selecting a date on the production view immediately loads that day's totals — no extra click.
- Remove the "Ver" button.
- Keep the selected day in the URL (`?day=YYYY-MM-DD`) so the view stays linkable/refreshable and the server component remains the source of truth.

**Non-Goals:**
- No changes to the backend, the `/orders/production` endpoint, `getProductionTotals`, or the totals aggregation logic.
- No shared/generalized day-picker abstraction — out of scope for this PoC change.

## Decisions

- **Mirror the orders `DayPicker` pattern rather than abstract it.** Add a client `DayPicker` for production that navigates to `/production?day=...` on change. The existing orders `DayPicker` hardcodes the `/orders` path, so it cannot be reused as-is. A dedicated production picker keeps the change minimal and the two views independent; extracting a shared, route-parameterized picker is deferred (a PoC with two call sites doesn't warrant the indirection yet).
- **Keep the server component + URL-param architecture.** The day stays in `?day=`; navigation re-runs the server fetch. This preserves linkability and avoids introducing client-side data fetching for the totals.
- **Use `useTransition` and disable the input while pending**, exactly as orders does, to prevent double-navigation on rapid changes.

## Risks / Trade-offs

- [Native date input behavior varies across browsers — `onChange` may fire on partial/keyboard entry, causing extra navigations] → Acceptable for the PoC; `useTransition` + disabled-while-pending bounds the effect, matching the already-shipped orders view.
- [Duplicated picker logic across two files] → Accepted intentionally (see Decisions); low cost, easy to consolidate later if a third call site appears.

## Migration Plan

Pure UI swap, no data migration. Rollback is reverting the production page to the GET-form variant.

## Open Questions

None.
