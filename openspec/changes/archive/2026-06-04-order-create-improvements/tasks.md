## 1. Data model & shared types

- [x] 1.1 Add nullable `message String?` to the `Order` model in `packages/backend/prisma/schema.prisma`
- [x] 1.2 Generate a Prisma migration for the new column (`yarn prisma migrate dev`) and verify the SQLite schema updates with no backfill needed
- [x] 1.3 Add optional `message?: string` to `CreateOrderRequest` in `packages/shared/src/dtos.ts`

## 2. Backend — persist the message

- [x] 2.1 Add `@IsOptional() @IsString() message?: string` to `CreateOrderDto` in `packages/backend/src/orders/dto/create-order.dto.ts`
- [x] 2.2 In `OrdersService.createOrder` (`orders.service.ts`), normalize a blank/whitespace-only `message` to `null` and persist it on `prisma.order.create`
- [x] 2.3 Update/extend `orders.service.spec.ts`: a non-empty message is persisted; an absent or blank message stores `null`; item/catalog validation still rejects out-of-catalog items with nothing persisted

## 3. Frontend — combined "Crear orden" view

- [x] 3.1 In `BackofficeNav.tsx`, rename the `/links` entry label from `Crear link` to `Crear orden` (keep route path `/links` per design decision 1)
- [x] 3.2 In `links/page.tsx`, keep the link-generator section and add the direct order-entry form on the same view, grouped as two clear sections ("Por link" / "Cargar orden")
- [x] 3.3 Add an optional `message` textarea to the direct order-entry form and pass it through `createOrder` (`lib/api.ts` already forwards the full `CreateOrderRequest`; confirm no change needed there)
- [x] 3.4 Render `CreateOrderForm` inline on the combined view (or refactor its content out of the modal) so it no longer depends on the orders-page modal trigger

## 4. Frontend — remove duplicate entry point

- [x] 4.1 Remove the `CreateOrderForm` "+ New order" trigger from `orders/page.tsx` (orders view retains date picker, status control, edit, and delete actions)
- [x] 4.2 Remove now-unused imports/props from `orders/page.tsx`; delete `CreateOrderForm.tsx`/`Modal.tsx` only if nothing else uses them, otherwise leave intact

## 5. Verification

- [x] 5.1 Run `openspec validate "order-create-improvements"` and confirm it passes
- [x] 5.2 Run backend Jest suite (`yarn workspace @pannico/backend test`) and confirm green
- [x] 5.3 Manual check: nav shows "Crear orden"; the view creates an order both via link and via direct entry; a pasted message is persisted and an empty one stores null; the orders view no longer shows "+ New order"
