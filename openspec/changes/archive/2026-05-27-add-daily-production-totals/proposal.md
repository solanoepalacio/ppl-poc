## Why

The manager needs to forward the day's production to the bakery line, but the back office only lists orders one by one — there is no rolled-up view of how many of each item must be produced. Today the manager has to mentally sum quantities across every order, which is error-prone and slow precisely when it matters (at any point during the day, as orders keep arriving).

## What Changes

- Add a **per-item production total** for a given day (defaulting to today): for each product, the summed quantity to produce.
- Totals aggregate order items across orders whose status is `pending`, `issued`, or `finished` — the statuses that represent real demand to fulfill. Orders that are `denied` (customer left for WhatsApp) or `ignored` (link expired unused) are excluded.
- Expose the totals via a new read-only back-office API endpoint, scoped by day the same way the existing day view is (`createdAt`, server-local).
- Show the day's production totals in the back-office orders page alongside the existing order list, reflecting the current state whenever the manager views it.
- New shared DTO/types for the production-totals response.
- No database schema change: totals are computed by reading existing `Order` / `OrderItem` / `Product` rows.

## Capabilities

### New Capabilities

- `production-totals`: per-item production quantities for a day, aggregated over orders in production-relevant statuses (`pending`, `issued`, `finished`), exposed as a back-office read endpoint and surfaced in the back-office UI.

### Modified Capabilities

<!-- No existing spec's requirements change. order-management still owns the lifecycle, persistence, and per-order day listing; production-totals is a separate read/aggregation concern that consumes that data. -->

(none)

## Impact

- **Backend**: new `GET` route in `orders.controller.ts`; new aggregation method in `orders.service.ts` (reuses the existing `dayBounds` day-scoping logic).
- **Shared**: new response types in `packages/shared/src/dtos.ts`.
- **Frontend**: new production-totals display on `packages/frontend/src/app/orders/page.tsx` (+ supporting component) and an API call in `packages/frontend/src/lib/api.ts`.
- **Data**: read-only over existing `Order`/`OrderItem`/`Product`; supported by the existing `@@index([createdAt])` and `@@index([status])`. No migration.
