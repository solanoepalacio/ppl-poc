## Why

On the back-office orders view, the manager must select a date in the date-picker and then click a separate "Ver" (View) button before the orders for that day appear. That extra click is friction with no purpose: selecting a date already expresses the manager's intent to see that day.

## What Changes

- Selecting a date in the orders view date-picker SHALL immediately render the orders for that day — no confirmation step.
- The "Ver" (View) button SHALL be removed from the orders view date-picker.
- **BREAKING** (UX): there is no longer a manual submit action on the orders date-picker; date selection is the trigger.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `order-management`: the "Back office shows orders by day" requirement changes so that selecting a different day immediately shows that day's orders, rather than requiring a separate view/submit action.

## Impact

- Frontend only. Affected: `packages/frontend/src/app/(backoffice)/orders/page.tsx` (server component currently using a native `<form method="get">` with a `?day=` URL param and a "Ver" submit button).
- Requires a small client component to push the new `?day=` URL on date change (the input's `onChange` cannot live in a server component).
- No backend, API, or data-model changes. The `?day=` query param contract is unchanged.
- Out of scope: the visually identical production-totals date-picker (`production/page.tsx`) is not changed by this proposal.
