## Why

Order creation is currently split across two back-office views — link generation lives on the "Crear link" view, while direct order entry is a "+ New order" modal on the orders view. This forces the manager to remember which view does what for a single conceptual task ("create an order"). Consolidating both paths into one "Crear orden" view makes order creation a single, obvious destination. Separately, when the manager transcribes an order by hand they currently discard the original WhatsApp message; capturing that raw message alongside the structured order gives us paired (message → order) training data for the future order-taking agent.

## What Changes

- Rename the back-office "Crear link" view/navigation entry to **"Crear orden"**.
- The "Crear orden" view hosts **both** order-creation paths in one place: generating a shareable customer link (as today) and entering an order directly by adding catalog items.
- Remove the standalone "+ New order" modal entry point from the orders view; direct order entry now lives on the "Crear orden" view. (The orders view keeps editing/status/delete actions on existing orders.)
- Add an **optional free-text `message` field** to direct (manual) order entry where the manager can paste the WhatsApp message that generated the order. The message is persisted on the order. Link-generated orders and customer-submitted items are unaffected.

## Capabilities

### New Capabilities
<!-- None: this change reshapes existing capabilities rather than introducing new ones. -->

### Modified Capabilities
- `back-office-navigation`: the persistent navigation's link is renamed from **Crear link** to **Crear orden**, and that view's responsibility expands from link generation only to hosting both order-creation paths.
- `order-management`: the manual order-creation requirement gains an optional `message` field that is persisted on the created order.

## Impact

- **Frontend**: rename/relocate `links/page.tsx` content into a "Crear orden" view that also renders the direct order-entry form (currently `orders/CreateOrderForm.tsx`); remove the "+ New order" trigger from `orders/page.tsx`; update `BackofficeNav.tsx` label and route.
- **Backend**: extend `CreateOrderDto` / `CreateOrderRequest` with an optional `message` string; persist it in the orders service.
- **Data**: add a nullable `message` column to the `Order` model in Prisma (new migration). No backfill needed.
- **Shared**: add optional `message` to the create-order request type.
