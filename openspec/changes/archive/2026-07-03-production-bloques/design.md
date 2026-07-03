## Context

Before this change, "which orders belong to a production run" was derived from `Order.createdAt` bucketed into a server-local calendar day by a `dayBounds()` helper in `orders.service.ts`. Both back-office read endpoints (`GET /orders?day=` and `GET /orders/production?day=`) and the two frontend day pickers were built on that `?day=YYYY-MM-DD` contract. The grouping was implicit and clock-driven — there was no entity representing a run and no way for the manager to declare a run finished.

This change introduces an explicit `Slot` ("bloque") entity that orders reference by FK, and moves the grouping decision from the calendar to a manual close action. The single-open invariant ("exactly one bloque accepts orders at a time") is the core of the design.

## Goals / Non-Goals

**Goals:**
- A first-class production-bloque entity that orders belong to, replacing day-bucketing.
- Exactly one open bloque at all times, enforced in the service and backstopped in the DB.
- New orders (both the customer-link and manual paths) land in the open bloque with no caller ceremony.
- A manual close that atomically closes the current bloque and opens the next, so there is never a gap with zero open bloques.
- Back-office read views default to the open bloque and can select any historical bloque.
- A clean migration that preserves historical grouping (one closed bloque per past day).

**Non-Goals:**
- Reopening or deleting a closed bloque; editing `seq`.
- Moving an order between bloques after creation.
- Multi-open / concurrent bloques.
- Per-bloque naming/labels beyond the numeric `seq` (Bloque #N).
- Real-time push; the views stay plain re-fetchable reads.

## Decisions

**1. `Slot` owns the grouping; `Order.slotId` is a required FK.**
An order always belongs to exactly one bloque. `ON DELETE RESTRICT` prevents deleting a bloque out from under its orders. `slotId` is indexed for the by-bloque read.
*Alternative:* keep day-bucketing and layer a "run label" on top — rejected; it leaves grouping clock-driven, which is the problem.

**2. Single-open invariant enforced in three layers.**
(a) `SlotsService.ensureOpenSlot()` on `OnModuleInit` guarantees one exists at boot and self-heals a DB without one; (b) `closeSlot` runs in a `$transaction` that closes-then-opens atomically; (c) a **partial unique index** `Slot_single_open ON (status) WHERE status='open'` makes any race that would create a second open bloque fail at the DB. Prisma's schema DSL can't express a partial index, so it lives in the migration SQL only.
*Alternative:* rely on app logic alone — rejected; a concurrency bug or a second process could silently break the invariant the whole model depends on.

**3. Reads resolve a bloque, defaulting to the open one.**
`resolveSlot(slotId?)` returns the named bloque (404 if unknown) or the open bloque when omitted. Both `GET /orders` and `GET /orders/production` take `?slotId=` and return the resolved `slot` in the payload so the header/picker can render it without a second call.
*Alternative:* require an explicit `slotId` everywhere — rejected; defaulting to "open" matches the manager's normal case (working the live run).

**4. Slot endpoints kept separate from orders.**
`GET /slots`, `GET /slots/open`, `POST /slots/close` live in their own `SlotsController`/`SlotsService`. Lifecycle is its own concern from the orders read/aggregation; the orders paths only depend on `getOpenSlotId()`.

**5. `seq` is a monotonic human-facing number, assigned as `max(seq)+1`.**
Gives the UI a stable "Bloque #N" without exposing ids. `@@unique(seq)` prevents duplicates.

**6. Migration backfills history as one closed bloque per past day.**
Historical grouping was per-day, so the migration preserves it: group existing orders by `date(createdAt/1000,'unixepoch','localtime')`, create one `closed` bloque per day (deterministic id `'slot_' || day`, `seq` chronological, `openedAt`/`closedAt` = first/last order instant), then rebuild `Order` with a NOT NULL `slotId` backfilled from each order's day. A final `slot_open_initial` open bloque (next `seq`) receives all new orders. SQLite stores `DateTime` as integer epoch-ms, so all timestamps are written as integer ms to keep Prisma's deserialization intact.
*Alternative:* dump everything into one closed bloque — rejected; it would erase the historical day grouping the old view showed.

## Risks / Trade-offs

- **Partial index lives only in migration SQL, invisible to `schema.prisma`** → a future `prisma migrate` from schema-diff won't regenerate it. Documented in the migration; the service invariant still holds without it, the index is a backstop.
- **`?day=` → `?slotId=` is a breaking API/URL change** → acceptable for a PoC with a single known frontend, updated in lockstep; no external consumers.
- **`ON DELETE RESTRICT` means a bloque can't be deleted while it holds orders** → intended; bloques are history. No delete-bloque feature is offered.
- **Backfill assumes `createdAt` day grouping matches past intent** → it does, because that is exactly what the old view computed.

## Migration Plan

Single Prisma migration `20260703120000_add_production_slots`: create `Slot` + indexes (incl. the partial unique index), backfill closed day-bloques + one open bloque, rebuild `Order` with a backfilled NOT NULL `slotId` FK. Forward-only; rollback is restoring the pre-migration DB (the reverse would require re-deriving `?day=` from each order's bloque, which is not implemented).

## Open Questions

None — shipped.
