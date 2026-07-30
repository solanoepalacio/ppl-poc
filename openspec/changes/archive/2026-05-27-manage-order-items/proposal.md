## Why

Orders don't only arrive through the tokenized customer form — a manager also takes orders by phone, WhatsApp, or in person, and customers later ask to change or cancel what they ordered. Today the back office can only change an order's status; there's no way to record an order that never went through a link, fix the items on an existing order, or remove an order that should not exist. This leaves the manager re-creating links as a workaround and unable to honor change requests.

## What Changes

- Add a back-office action to **create an order manually**: the manager enters a phone number and the order's items directly, producing a recorded order without sending a customer link.
- Add a back-office action to **edit the list of items on any existing order**: add products, remove products, and change quantities, validated against the active catalog. This works regardless of the order's current status and is independent of the existing status-change action.
- Add a back-office action to **delete an order**, removing it and its items (used for duplicates or cancellations of manually-entered orders).
- Existing manual status changes are unaffected; cancellation via status (e.g. `denied`) remains available alongside deletion.

## Capabilities

### New Capabilities
<!-- None — this extends the existing back-office order capability. -->

### Modified Capabilities
- `order-management`: adds requirements for manager-initiated order creation, editing of an order's item list against the catalog, and order deletion.

## Impact

- **Backend (NestJS):** new endpoints `POST /orders` (manual create), `PATCH /orders/:id/items` (replace item list), and `DELETE /orders/:id`; new DTOs; new `OrdersService` methods reusing the existing catalog-validation logic from `confirm()`.
- **Prisma:** no schema change — `OrderItem` cascade-deletes with its order; manually-created orders still receive a generated unique token and `expiresAt` to satisfy existing columns.
- **Frontend (Next.js back office):** an item-editing UI on the orders page, a manual-create form, and a delete control, plus matching `lib/api.ts` client methods.
- **Tests (Jest):** new `OrdersService` specs for create, item replacement (including catalog rejection), and delete.
- **Metrics:** deletion removes an order from placed/ignored totals; documented as intended for corrections (status-based cancellation remains for orders that should still count).
