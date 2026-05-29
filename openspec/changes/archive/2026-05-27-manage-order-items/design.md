## Context

Orders are persisted as an `Order` row with a unique single-use `token`, a non-null `expiresAt`, a `status` string, and a cascade-linked set of `OrderItem` rows referencing `Product` (the seeded catalog). Items are currently written only by the customer `confirm()` flow, which validates each `productId` against the active catalog inside a transaction. The back office (`OrdersController` / `OrdersService`) can list orders by day, compute production totals, and update an order's status free-form, but it cannot create an order, change its items, or remove it.

This change adds manager-facing create / edit-items / delete operations, reusing the existing catalog-validation pattern. Status changes already exist and are out of scope here.

## Goals / Non-Goals

**Goals:**
- Let the manager create an order directly from order details received off-channel (phone/WhatsApp/in-person).
- Let the manager replace the item list on any order, validated against the active catalog, without touching status.
- Let the manager delete an order (and its items).
- Reuse the existing item-validation logic so out-of-catalog items remain structurally impossible.
- No Prisma schema migration.

**Non-Goals:**
- Changing the status model or the existing status-update action.
- A product/catalog management UI (catalog stays seed-only).
- Editing an order's phone number or created time after creation.
- Soft-delete / audit history of edits and deletions.

## Decisions

### Manual create generates a token and sets status directly
`Order.token` is unique and non-null and `expiresAt` is non-null, so a manually created order must still supply both. **Decision:** generate a token and `expiresAt` exactly as the link flow does, but set the status directly (default `issued`, since the order is already real and received) and record items immediately, rather than going through the customer confirm flow.

*Alternative considered:* make `token`/`expiresAt` nullable for manual orders. Rejected — it forces a migration and weakens the "one token per order" invariant for no PoC benefit. The generated token simply goes unused.

### Item edit replaces the whole list atomically
`PATCH /orders/:id/items` accepts the complete desired item list and, in one transaction, deletes the order's existing `OrderItem` rows and `createMany` the new ones after validating each against the active catalog. **Decision:** full replacement rather than per-item add/remove/patch operations.

*Alternative considered:* granular add/remove/update-quantity endpoints. Rejected as more surface area and more round-trips for a UI that already holds the full list; replacement matches how the edit form works.

### Validation reuses the confirm-path catalog check
Both create and edit-items validate items the same way `confirm()` does: fetch active products for the submitted `productId` set and reject if any is missing or inactive. **Decision:** extract this into a shared private helper in `OrdersService` so the three call sites stay consistent.

### Delete is a hard delete
`DELETE /orders/:id` removes the order; `OrderItem` rows cascade via the existing relation. **Decision:** hard delete, accepting that the order leaves placed/ignored and production metrics. This is intended for corrections (duplicates, mistaken entries); cancellations that should remain counted use the existing status change to `denied`.

*Alternative considered:* soft-delete flag. Rejected for the PoC — adds a schema field and filtering across every query for little gain.

### Item edit is status-independent
Editing items never mutates `status` or `confirmedAt`, and is allowed regardless of current status, mirroring the free-form nature of the existing status-update action.

## Risks / Trade-offs

- **Hard delete drops an order from metrics** → Documented as intended; status-based cancellation (`denied`) remains for orders that must still count. Restrict delete to the back office.
- **Generated-but-unused token on manual orders** → Harmless: the token is never shared; uniqueness still holds. Keeps the schema and "one token per order" invariant intact.
- **Editing items on a `finished`/`issued` order can desync production totals already forwarded to the line** → Accepted for the PoC; the manager owns this judgement, the same way free-form status changes are already trusted.
- **Replace-all edit could clear items if the UI submits an empty list unintentionally** → Empty list is a defined, intentional "clear items" operation; the UI confirms destructive saves.

## Migration Plan

No data migration. Deploy backend (new endpoints + service methods + DTOs) and frontend (API client methods + UI) together. Rollback is removal of the new endpoints/UI; no schema change to revert.

## Open Questions

- Should a manually created order default to `issued`, or should the manager pick the initial status at creation? (Leaning `issued` with the existing status control available afterward.)
