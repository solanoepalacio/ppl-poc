## Why

Orders were grouped for production implicitly, by the calendar day they were created (`createdAt`, server-local): the orders view and the production-totals view both took a `?day=YYYY-MM-DD` param, and a "production run" was whatever landed on a given date. That day boundary never matched how the bakery actually batches work — a run can span midnight or cover part of a day, and the manager has no way to say "this batch is done, start a new one." Tying batching to the wall clock also makes the totals shift under the manager's feet as a new day rolls over.

This change replaces day-based grouping with an explicit, manually-closed **production bloque** (a "Slot" in code): a first-class container that orders are placed into. Exactly one bloque is open at a time and receives every new order; the manager closes it when the run is done, which atomically opens a fresh one. Grouping now reflects the manager's real batching decision instead of the calendar.

## What Changes

- Add a **Slot** ("bloque") entity: `id`, human-facing `seq`, `status` (`open` | `closed`), `openedAt`, `closedAt`. Add a required `slotId` FK on `Order`.
- **Single-open invariant:** exactly one bloque is `open` at any time; the backend bootstraps one on startup and a partial unique index backstops it at the DB level.
- **New orders land in the open bloque** on both paths — customer-link confirmation and back-office manual creation.
- **Manual close:** the manager closes the open bloque; closing atomically marks it `closed` and opens a fresh bloque with the next `seq`.
- **BREAKING** (API): the back-office read endpoints change from `?day=YYYY-MM-DD` to `?slotId=` (defaulting to the open bloque). `GET /orders` and `GET /orders/production` responses are re-keyed from `day` to the resolved `slot`.
- Add slot endpoints: `GET /slots` (all bloques, newest first, with order counts), `GET /slots/open` (current open bloque), `POST /slots/close` (close open + open fresh).
- **Frontend:** replace both day pickers with a shared `SlotPicker`; add a `/slots` management view with a "Cerrar bloque actual" button and a **Bloques** nav link. Orders and production views select a bloque instead of a day.
- **Migration:** create `Slot`, backfill one `closed` bloque per historical `createdAt`-day (numbered chronologically) plus one fresh `open` bloque, and add `Order.slotId` pointing each existing order at its day-bloque.

## Capabilities

### New Capabilities

- `production-slots`: the production-bloque lifecycle — single-open invariant, new orders landing in the open bloque, manual close-and-reopen, listing, and the back-office bloques management view.

### Modified Capabilities

- `production-totals`: totals are now computed per bloque (defaulting to the open one) instead of per day; the response is keyed by the resolved bloque.
- `order-management`: the primary back-office view groups orders by bloque (defaulting to the open one) instead of by day; orders persist their bloque association; manual orders land in the open bloque.
- `back-office-navigation`: a third **Bloques** view/link joins Órdenes and Producción; "orders by day" wording becomes "orders by bloque".

## Impact

- **Data**: new `Slot` table (`@@unique(seq)`, `status` index, partial unique index on `status='open'`); `Order.slotId` NOT NULL FK (`ON DELETE RESTRICT`) with an index. Migration `20260703120000_add_production_slots` backfills historical bloques.
- **Backend**: new `SlotsModule` / `SlotsService` (`ensureOpenSlot`, `getOpenSlot`, `resolveSlot`, `listSlots`, transactional `closeSlot`) and `SlotsController` (`GET /slots`, `GET /slots/open`, `POST /slots/close`). Orders read path: `getOrdersByDay`→`getOrdersBySlot`, `getProductionTotals(slotId?)`; `dayBounds()` deleted; the order-creation paths call `getOpenSlotId()`.
- **Shared**: new `Slot` / `SlotStatus` / `SlotListItem` / `SlotListResponse` / `CloseSlotResponse` in `slot.ts`; `DayViewResponse`→`SlotOrdersResponse` and `ProductionTotalsResponse` re-keyed from `day` to `slot`; `Order` model gains `slotId`.
- **Frontend**: shared `SlotPicker` replaces both `DayPicker`s; new `/slots` view + `CloseSlotButton`; **Bloques** nav link; orders and production pages select a bloque.
