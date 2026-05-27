## Context

The back office already serves a per-order day view (`GET /orders?day=`), grouping orders by `createdAt` in server-local time via a `dayBounds()` helper in `orders.service.ts`. Items live on `OrderItem` (referencing `Product`) and are written only at confirmation, when the order flips to `issued`. The shared `OrderStatus` union (`packages/shared/src/order-status.ts`) is the single source of truth for statuses.

This change adds a read-only aggregation on top of that data: for a given day, the summed quantity of each product to produce. The proposal scopes "production" to orders in `pending`, `issued`, or `finished` status, excluding `denied` (WhatsApp fallback) and `ignored` (expired link). No schema change is involved.

## Goals / Non-Goals

**Goals:**
- Per-product summed quantity for a day (default today), over production-relevant statuses.
- A single source of truth for which statuses count as "production".
- Reuse the existing day-scoping (`createdAt`, server-local) so the totals and the order list agree on what "today" means.
- Surface the totals in the back-office orders page next to the existing list.

**Non-Goals:**
- No live push / websocket updates; "at any given time" is satisfied by the value being current each time the manager loads or refreshes the view.
- No date-range or multi-day reporting — single day only, matching the day view.
- No persistence/caching of totals; computed on read.
- No catalog/product management changes.

## Decisions

**1. Status set lives in shared as `PRODUCTION_STATUSES`.**
Add `export const PRODUCTION_STATUSES: readonly OrderStatus[] = ['pending', 'issued', 'finished']` to `order-status.ts`. Both the backend query filter and any future consumer reference it, so "what counts as production" is defined once alongside the status union it draws from.
*Alternative:* inline the array in the service — rejected; it would silently drift from the status contract.

**2. Separate read endpoint `GET /orders/production?day=YYYY-MM-DD`, not folded into the day view.**
The day view is a per-order list; production totals are an aggregate. Keeping them distinct lets each evolve independently and keeps response shapes focused. Response: `{ day, items: [{ productId, name, quantity }] }`.
*Alternative:* embed a `production` field in `DayViewResponse` to save a round trip — rejected for the PoC; the extra fetch is cheap and the separation is clearer. Easy to revisit if the page needs a single payload.

**3. Aggregate over a single `findMany`, reduce in memory.**
Query orders for the day with `status: { in: PRODUCTION_STATUSES }`, `include: { items: { include: { product: true } } }`, then reduce to a `Map<productId, { name, quantity }>` summing quantities. This mirrors the existing `getOrdersByDay` query shape and avoids a `groupBy` + separate product-name lookup.
*Alternative:* `prisma.orderItem.groupBy` with a relation filter on the order, then resolve names — more queries and machinery for no gain at PoC scale.

**4. Return only products with a non-zero total, sorted by product name.**
A production sheet should list what to bake, not the whole catalog zero-filled. Sorting by name gives a stable, scannable order.
*Alternative:* zero-fill all active products — rejected as noise; can be added later if the manager wants an explicit "0" line.

**5. Reuse `dayBounds()`.**
Extract or share the existing helper rather than reimplement day math, guaranteeing the totals and the order list bucket orders identically.

## Risks / Trade-offs

- **Pending orders carry no items in the current model** → including `pending` in the filter is harmless (it contributes nothing today) and forward-compatible: it matches the manager's intent that pending = anticipated demand, and free-form status updates could leave items on a `pending` order. Documented so the manager understands pending typically adds zero.
- **In-memory aggregation scales with the day's order count** → acceptable for a single-bakery PoC; the `@@index([createdAt])` / `@@index([status])` keep the fetch cheap. Revisit with `groupBy` or SQL only if volume grows.
- **Server-local day boundary** → same trade-off the day view already makes; totals and list stay consistent because they share `dayBounds()`. No new timezone behavior introduced.
- **Snapshot, not live** → a total can be stale if orders arrive after load; mitigated by it being a plain re-fetchable read the manager refreshes when forwarding to the line.
