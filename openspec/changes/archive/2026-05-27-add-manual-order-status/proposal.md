## Why

The manager needs to track an order's progress after the customer confirms it — which orders have been passed to the production line and which are done — but today an order's status only changes automatically (via customer actions or token expiry) and there is no terminal "completed" state. Without a way to advance status by hand, the back office cannot reflect real-world fulfillment progress.

## What Changes

- Add a new `finished` order status representing a completed order, extending the lifecycle to `pending`, `issued`, `denied`, `ignored`, `finished`.
- Add the ability for the manager to manually set an order's status to any of the valid statuses from the back-office UI, so they can record fulfillment progress and correct mistakes.
- Expose a back-office action/endpoint that persists a manually chosen status on an order.

## Capabilities

### New Capabilities

<!-- None: this extends existing back-office behavior. -->

### Modified Capabilities

- `order-management`: The status set gains a `finished` value, and a new requirement allows the manager to manually update an order's status from the back office to any valid status (free-form transitions).

## Impact

- **Data model**: Order status field/enum in the Prisma schema gains `finished`; a migration is required.
- **Backend (NestJS)**: New endpoint to update an order's status; validation that the target status is one of the allowed values.
- **Frontend (Next.js)**: Back-office orders view gains a control to change an order's status.
- **Shared package**: Status type/enum updated to include `finished`.
- No change to the customer-facing intake flow or the automatic `ignored` mechanism.
