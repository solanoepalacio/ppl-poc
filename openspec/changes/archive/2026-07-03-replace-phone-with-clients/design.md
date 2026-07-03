## Context

Order identity was a free-text `Order.phone` (a single normalized E.164 string), captured
through the back-office two-field phone control and surfaced in the link result, the
customer token validation, and the back-office order list. There was no notion of a
"client" — every order carried its own phone string.

This change introduces a fixed `Client` directory (loaded by data migration, mirroring
the seed-only product catalog) and re-points orders at a client by FK, dropping the phone
number entirely.

## Goals / Non-Goals

**Goals:**
- A first-class `Client` entity that orders belong to by required FK.
- Clients loaded and extended only via Prisma data migrations — no management UI.
- A filterable (type-ahead) client picker in the order-creation modal, in place of the
  phone entry.
- A clean migration that backfills existing orders to a placeholder client so `clientId`
  is `NOT NULL`.

**Non-Goals:**
- Creating/editing/deleting clients from the UI.
- Keeping the phone number (it is removed, not denormalized onto the order).
- Client contact details beyond a display name (phone/email/notes are out of scope now).
- Reassigning an order's client after creation.

## Decisions

**1. `Client` owns identity; `Order.clientId` is a required FK.**
An order always references exactly one client. `ON DELETE RESTRICT` prevents deleting a
client out from under its orders (parallels `Order.slotId`). `clientId` is indexed.
*Alternative:* keep `phone` alongside `clientId` — rejected; two sources of identity drift
and the phone is no longer captured anywhere.

**2. Store both a display `name` and a normalized `slug` (unique).**
`name` is what the manager reads and searches ("Il Postino"); `slug` ("il-postino") is a
stable, case/accent-insensitive natural key so future data migrations can upsert clients
idempotently (`INSERT OR IGNORE` on `slug`) without knowing generated ids, and duplicates
are rejected at the DB.
*Alternative:* name-only — rejected; no stable key for re-runnable data migrations or dedup.

**3. Clients are migration-owned, never seeded and never UI-managed.**
This matches the catalog's "fixed preset list, new seeds to change items" pattern, which
the user extended to "new data migrations." Keeping clients out of `seed.ts` avoids two
competing sources of truth. `assertActive(clientId)` (mirroring
`validateItemsAgainstCatalog`) is a DB existence+active check, not a static union — the
set is dynamic, so the `isOrderStatus`-style guard does not apply.

**4. Existing orders backfill to a placeholder client.**
The migration inserts `Cliente sin asignar` (slug `cliente-sin-asignar`) and rebuilds
`Order` with a `NOT NULL clientId` set to that placeholder for every existing row, so the
required FK holds without losing historical orders. New real clients are inserted in the
same first data migration.
*Alternative:* nullable `clientId` — rejected; weakens the guarantee every order has a
client. Reset the DB — rejected; the user chose to preserve existing orders.

**5. Type-ahead client picker is hand-rolled.**
No combobox exists and the project forbids a component library, so `ClientCombobox` is a
controlled text input that filters the injected client list by `normalizeForSearch`
substring and renders a clickable list — mirroring the lifted-state style of the removed
`PhoneField`. Filtering is client-side over the small directory (no search endpoint).

## Risks / Trade-offs

- **`clientId` NOT NULL + FK on a populated table** → requires the SQLite table-rebuild
  dance (as `add_production_slots` did); handled in hand-written migration SQL.
- **`phone`→`clientId` is a breaking API change** → acceptable for a PoC with one known
  frontend, updated in lockstep; no external consumers.
- **`ON DELETE RESTRICT`** → a client can't be deleted while it holds orders; intended —
  clients are retired via `active: false`.
- **Real client list not yet supplied** → the migration wires the placeholder now and the
  supplied list is inserted into this same first data migration once provided.

## Migration Plan

Single Prisma migration `<ts>_add_clients` (scaffold `--create-only`, then hand-edit):
create `Client` + unique `slug` index; `INSERT OR IGNORE` the placeholder and the initial
client list; `PRAGMA foreign_keys=OFF`, rebuild `Order` with `clientId TEXT NOT NULL` +
FK, backfilling `clientId` = placeholder id and dropping `phone`; recreate `Order`
indexes plus `@@index([clientId])`. Forward-only; rollback is restoring the pre-migration
DB.

## Open Questions

None blocking. Additional clients arrive as future data migrations; the real initial list
is inserted into this change's migration when the user provides it.
