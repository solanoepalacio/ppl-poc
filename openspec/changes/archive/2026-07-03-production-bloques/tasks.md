## 1. Data model & migration

- [x] 1.1 Add a `Slot` model to `schema.prisma` (`id`, `seq` `@unique`, `status` default `open`, `openedAt`, `closedAt?`, `@@index([status])`) and a required `slotId` on `Order` with a relation to `Slot` (`onDelete: Restrict`) and `@@index([slotId])`
- [x] 1.2 Author migration `20260703120000_add_production_slots`: create `Slot` + indexes, plus the partial unique index `Slot_single_open ON (status) WHERE status='open'` (not expressible in the Prisma DSL)
- [x] 1.3 Backfill: one `closed` bloque per distinct historical `createdAt` local day (deterministic id, chronological `seq`, `openedAt`/`closedAt` = first/last order instant of the day) plus one fresh `open` bloque numbered after them
- [x] 1.4 Rebuild `Order` with a NOT NULL `slotId`, backfilling each order's `slotId` from its day-bloque; keep timestamps as integer epoch-ms so Prisma deserialization is unaffected

## 2. Shared contract

- [x] 2.1 Add `slot.ts`: `SlotStatus` union + `SLOT_STATUSES` + `isSlotStatus`, and `Slot`, `SlotListItem` (adds `orderCount`), `SlotListResponse`, `CloseSlotResponse` interfaces; export from the barrel
- [x] 2.2 Add `slotId` to the shared `Order` model type
- [x] 2.3 Replace `DayViewResponse` with `SlotOrdersResponse` (keyed by `slot`, with `SlotViewOrder[]`) and re-key `ProductionTotalsResponse` from `day` to `slot`

## 3. Backend — slots lifecycle

- [x] 3.1 Add `SlotsModule`, `SlotsService`, `SlotsController`
- [x] 3.2 `ensureOpenSlot()` (creates `seq = max+1` when none open; swallows the P2002 race) invoked from `OnModuleInit`; `getOpenSlot`/`getOpenSlotId`/`getOpenSlotView`
- [x] 3.3 `resolveSlot(slotId?)` — named bloque (404 if unknown) or the open bloque when omitted
- [x] 3.4 `listSlots()` — all bloques newest-first with `orderCount`
- [x] 3.5 `closeSlot(id)` — transactional close-then-open-next; reject missing (404) or already-closed (400)
- [x] 3.6 `SlotsController`: `GET /slots`, `GET /slots/open`, `POST /slots/close`

## 4. Backend — orders read & create

- [x] 4.1 Replace `getOrdersByDay(day?)` with `getOrdersBySlot(slotId?)` returning `SlotOrdersResponse`; delete `dayBounds()`
- [x] 4.2 Change `getProductionTotals(slotId?)` to aggregate over the resolved bloque's orders and return the `slot` in the response
- [x] 4.3 Change `GET /orders` and `GET /orders/production` to read `?slotId=` instead of `?day=`
- [x] 4.4 Place newly created orders (customer-link confirmation and manual creation) in the open bloque via `getOpenSlotId()`

## 5. Frontend

- [x] 5.1 Add a shared `SlotPicker` (replacing both `DayPicker`s) that navigates on selection with `?slotId=`
- [x] 5.2 Point the orders and production views at `?slotId=`, defaulting to the open bloque, using `SlotPicker`
- [x] 5.3 Add the `/slots` management view listing bloques with a "Cerrar bloque actual" (`CloseSlotButton`) control
- [x] 5.4 Add the **Bloques** link to the back-office navigation
- [x] 5.5 Add `getSlots`/`getOpenSlot`/`closeSlot` (and slot-scoped orders/production) calls to the frontend API client

## 6. Tests & verification

- [x] 6.1 `slots.service.spec.ts`: single-open invariant, `ensureOpenSlot` bootstrap, transactional `closeSlot` (opens next), reject close of missing/already-closed
- [x] 6.2 Orders/production service specs updated to slot scoping (defaults to open bloque; specific `slotId`; unknown `slotId` rejected)
- [x] 6.3 Run backend + frontend test suites and the build; confirm new orders land in the open bloque and closing opens a fresh one
