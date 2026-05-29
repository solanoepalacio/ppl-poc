## 1. Backend — service layer

- [x] 1.1 Extract the catalog-validation logic from `OrdersService.confirm()` into a shared private helper (e.g. `validateItemsAgainstCatalog(items)`) that throws `BadRequestException` if any `productId` is missing or inactive, and have `confirm()` use it.
- [x] 1.2 Add `OrdersService.createOrder({ phone, items, status? })`: validate phone (reuse links phone validation), validate items against the catalog, generate a unique token + `expiresAt` like the link flow, default status to `issued`, and create the order with its items in one transaction. Return the created order id and status.
- [x] 1.3 Add `OrdersService.replaceItems(orderId, items)`: throw `NotFoundException` if the order is missing, validate items against the catalog, and in one transaction delete existing `OrderItem` rows and `createMany` the new list (empty list clears items). Do not touch `status` or `confirmedAt`. Return the updated order.
- [x] 1.4 Add `OrdersService.deleteOrder(orderId)`: throw `NotFoundException` if missing, otherwise delete the order (items cascade).

## 2. Backend — DTOs and controller

- [x] 2.1 Add `CreateOrderDto` (phone string; optional `items` array of `{ productId, quantity>=1 }`; optional `status` constrained to `ORDER_STATUSES`) and a reusable `OrderItemDto`.
- [x] 2.2 Add `ReplaceOrderItemsDto` (`items` array of `OrderItemDto`, allowed empty).
- [x] 2.3 Add controller routes: `POST /orders` → `createOrder`, `PATCH /orders/:id/items` → `replaceItems`, `DELETE /orders/:id` → `deleteOrder`, with matching response shapes in the shared package.

## 3. Shared types

- [x] 3.1 Add request/response interfaces for create-order, replace-items, and delete-order to the shared package, mirroring the existing `ConfirmOrder*` / `UpdateOrderStatus*` patterns.

## 4. Frontend — back office

- [x] 4.1 Add `createOrder`, `replaceOrderItems`, and `deleteOrder` methods to `frontend/src/lib/api.ts`.
- [x] 4.2 Add an item-editor UI on the orders page (catalog products with quantity inputs, prefilled from the order's current items) that calls `replaceOrderItems` and refreshes on success; confirm before saving an empty (clear-all) list.
- [x] 4.3 Add a manual "create order" form (phone + item editor) that calls `createOrder` and refreshes the day view.
- [x] 4.4 Add a delete control per order with a confirmation prompt that calls `deleteOrder` and refreshes.

## 5. Tests

- [x] 5.1 `OrdersService` specs for `createOrder`: persists order with items; persists order with no items; rejects out-of-catalog items (persists nothing); generated token is unique.
- [x] 5.2 `OrdersService` specs for `replaceItems`: replaces items; clears items on empty list; leaves status unchanged; rejects out-of-catalog items (existing items unchanged); throws NotFound for missing order.
- [x] 5.3 `OrdersService` specs for `deleteOrder`: removes order and items; order no longer returned by `getOrdersByDay`; throws NotFound for missing order.
- [x] 5.4 Confirm the refactored `confirm()` tests still pass after extracting the shared validation helper.
