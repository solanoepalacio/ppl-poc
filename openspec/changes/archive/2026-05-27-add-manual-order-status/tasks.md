## 1. Shared status contract

- [x] 1.1 Add `finished` to the `OrderStatus` union, the `ORDER_STATUSES` array, and the doc comment in `packages/shared/src/order-status.ts`

## 2. Backend status-update endpoint

- [x] 2.1 Add an `UpdateOrderStatusDto` (carrying a `status` field) under `packages/backend/src/orders/dto/`
- [x] 2.2 Add `updateStatus(orderId, status)` to `OrdersService`: validate with `isOrderStatus` (400 on invalid value), 404 if the order does not exist, persist only `status`
- [x] 2.3 Add `PATCH /orders/:id/status` to `OrdersController` (no `TokenGuard`), returning the updated order id and status

## 3. Frontend back-office control

- [x] 3.1 Add `updateOrderStatus(orderId, status)` to `packages/frontend/src/lib/api.ts`
- [x] 3.2 Add an `OrderStatusControl` client component: a `<select>` of `ORDER_STATUSES` that calls `updateOrderStatus` on change and refreshes the view via `router.refresh()`
- [x] 3.3 Use `OrderStatusControl` in `packages/frontend/src/app/orders/page.tsx` in place of the read-only status badge, and add a `status-finished` style alongside the existing status classes

## 4. Tests

- [x] 4.1 Add `OrdersService.updateStatus` tests to `orders.service.spec.ts`: marks an order `finished`, allows free-form transitions, rejects an invalid status (order unchanged), 404 for a missing order
