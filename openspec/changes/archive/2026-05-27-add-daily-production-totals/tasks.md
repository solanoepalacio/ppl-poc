## 1. Shared contract

- [x] 1.1 Add `PRODUCTION_STATUSES: readonly OrderStatus[] = ['pending', 'issued', 'finished']` to `packages/shared/src/order-status.ts`, documenting that these are the statuses counted toward production
- [x] 1.2 Add `ProductionTotalItem` (`{ productId: string; name: string; quantity: number }`) and `ProductionTotalsResponse` (`{ day: string; items: ProductionTotalItem[] }`) to `packages/shared/src/dtos.ts`
- [x] 1.3 Export the new symbols from the shared package barrel if not re-exported automatically

## 2. Backend aggregation

- [x] 2.1 Make the existing `dayBounds()` helper in `orders.service.ts` reusable by both the day view and production totals (extract/share, no behavior change)
- [x] 2.2 Add `getProductionTotals(day?: string): Promise<ProductionTotalsResponse>` to `OrdersService`: query orders for the day with `status: { in: PRODUCTION_STATUSES }` and `include: { items: { include: { product: true } } }`
- [x] 2.3 Reduce the result to a per-`productId` sum of quantities, keeping only products with a positive total, and sort entries by product name; return `{ day: label, items }`
- [x] 2.4 Add `GET /orders/production` to `OrdersController` reading optional `?day=YYYY-MM-DD`, returning `ProductionTotalsResponse`

## 3. Frontend

- [x] 3.1 Add a `getProductionTotals(day?)` call to `packages/frontend/src/lib/api.ts` hitting `GET /orders/production`
- [x] 3.2 Render the day's production totals (product name + summed quantity) on `packages/frontend/src/app/orders/page.tsx`, alongside the existing order list
- [x] 3.3 Refetch the totals for the currently selected day so they track the day the manager is viewing

## 4. Tests

- [x] 4.1 Unit-test `getProductionTotals` in `orders.service.spec.ts`: same product summed across multiple orders; entries carry the product name; products with no demand are omitted
- [x] 4.2 Unit-test status filtering: `issued` and `finished` contribute; `denied` and `ignored` are excluded
- [x] 4.3 Unit-test day scoping: defaults to today; a specified `YYYY-MM-DD` includes only that day's orders

## 5. Verification

- [x] 5.1 Run the backend and frontend test suites and the build; confirm the orders page shows correct totals for a seeded day
