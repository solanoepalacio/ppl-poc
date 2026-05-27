## Context

Order status today changes only through automatic, system-driven paths: `pending` at link creation, `issued` on customer confirm, `denied` on WhatsApp fallback, and `ignored` by the expiry mechanism. There is no manager-driven transition and no terminal "completed" state, so the back office cannot reflect fulfillment progress.

Relevant current state:
- `status` is a **plain `String` column** on `Order` (SQLite has no native enums). The contract lives in `@pannico/shared`'s `OrderStatus` union + `ORDER_STATUSES` array + `isOrderStatus()` guard, and is validated in the service layer (`packages/shared/src/order-status.ts`, `packages/backend/src/orders/orders.service.ts`).
- Customer-facing order endpoints live under `/orders/by-token/:token` and are protected by `TokenGuard`. The back-office day view is `GET /orders` (no guard).
- The back-office page `packages/frontend/src/app/orders/page.tsx` is a server component with no client interactivity; it renders each order's status as a read-only badge (`status-${status}` CSS class).
- This is a PoC with **no authentication**; "manager" / "admin" is simply whoever reaches the back office.

## Goals / Non-Goals

**Goals:**
- Add `finished` to the order status contract.
- Let the manager set any order to any valid status from the back-office orders view.
- Validate status server-side and reject unknown values, leaving the order unchanged on rejection.

**Non-Goals:**
- No authentication / authorization (out of scope for the PoC; the endpoint is unguarded like the rest of the back office).
- No enforced transition rules or state machine — transitions are intentionally free-form (per product decision).
- No change to the customer intake flow, the `ignored` expiry mechanism, or order items.
- No separate "in production" state — `finished` is the only new status.

## Decisions

**1. No database migration — extend the shared union only.**
Because `status` is a free-form `String` column validated in application code, adding `finished` requires only updating `OrderStatus`, `ORDER_STATUSES`, and the doc comment in `@pannico/shared`. The existing `@@index([status])` covers the new value automatically. *Alternative considered:* introduce a native Prisma enum — rejected because SQLite doesn't support enums and the existing design deliberately keeps status as a validated string.

**2. Back-office endpoint keyed by order id: `PATCH /orders/:id/status`.**
The manager acts on a persisted order (not a token), so the endpoint is identified by `order.id` and is **not** behind `TokenGuard` (consistent with `GET /orders`). Body: `{ status: OrderStatus }`. Returns the updated order's id and status. *Alternatives considered:* `PUT /orders/:id` (full-resource replace — overkill, only status changes); a token-based route (wrong — back office has no token).

**3. Validate with the existing `isOrderStatus()` guard; reject via `BadRequestException` (400); 404 if the order doesn't exist.**
Reuses the single source of truth rather than duplicating the allowed set. A new `UpdateOrderStatusDto` carries the `status` field. On invalid value or missing order, no write occurs.

**4. Manual updates touch only `status`.**
`confirmedAt` and `items` are left untouched — they record customer confirmation, not manager bookkeeping. Setting status to `issued` manually does **not** synthesize a `confirmedAt` or items.

**5. Frontend: a small client component for the status control.**
`orders/page.tsx` stays a server component; extract the status badge into a new client component (e.g. `OrderStatusControl`) rendering a `<select>` populated from `ORDER_STATUSES`. On change it calls a new `updateOrderStatus(orderId, status)` in `lib/api.ts`, then `router.refresh()` to re-fetch the server-rendered list. *Alternative considered:* a Next.js server action — viable, but a client component + `lib/api.ts` call matches the existing pattern used by `OrderForm`.

## Risks / Trade-offs

- **Free-form transitions allow nonsensical states** (e.g. `finished` → `pending`, or setting a never-confirmed order to `issued`). → Accepted per product decision; lets the manager correct mistakes. Documented in the spec's scenarios.
- **A manually re-`pending`ed, expired order can be flipped to `ignored` by the expiry mechanism.** → Accepted; consistent with the rule that `ignored` derives from an expired pending order. Manager can re-set it.
- **Unguarded mutation endpoint.** → Accepted for the PoC; same trust model as the existing back office. Flagged so it's revisited if/when auth is added.
- **Stale UI after concurrent edits** (two tabs). → Low impact at PoC scale; `router.refresh()` reconciles on next interaction.

## Migration Plan

1. Update `@pannico/shared` status contract (add `finished`); no Prisma migration or data backfill needed — existing rows keep their current status.
2. Add backend DTO, service method, and controller route.
3. Add frontend API helper and status control; add a `status-finished` style alongside the existing status classes.
4. Rollback is code-only (revert the change); no schema or data to undo.

## Open Questions

- None blocking. Status label/styling for `finished` in the back office is a minor styling choice left to implementation.
