## Why

The Stock, Producción Real and Agregar/Editar pedido dialogs all list their
products alphabetically, re-shuffling what the manager just did. The customer
form's summary already switched to entry order for exactly this reason: checking
a list means matching it against your memory of the sequence you performed, and
alphabetical order throws that sequence away. The back office works the same way
— the manager types in stock counts off a paper list, records batches as they
come out of the oven, keys in an order as it is dictated — and in all three the
natural order to read back is the order things went in.

## What Changes

- **The added-products list (Agregar pedido / Editar pedido) follows entry
  order.** Additions append; removing a product and adding it again appends it as
  a new entry, matching the customer summary's semantics. Opening the edit dialog
  lists the order's items in the order they are stored.
- **The Stock dialog lists products in the order they were entered**, persisting
  across save and reopen. Products that appear without being typed (produced-only
  rows) come after the entered ones; stock inherited from a closed bloque keeps
  the order it had there.
- **The Producción Real dialog lists products by their first recorded batch**,
  oldest first — the accumulated list reads as a log of the day's baking rather
  than a catalog.
- **An order's items keep their submitted order** (new `order-management`
  requirement): the API stores and returns items in the order they were sent, so
  the customer's entry order (which the form already preserves) and the manager's
  are what the edit dialog and any listing read back.

## How the order is kept — no new timestamp

Answering the design question directly: **no new column is needed.**

- **Producción Real** already has everything: entries carry `createdAt` (used by
  the history display), and edits update rows in place rather than recreating
  them, so "first entry per product" is a genuine, stable entry order.
- **Stock and order items** are saved replace-all (delete + recreate), so no
  stored value survives a save — but none is needed. Prisma's `cuid()` ids embed
  a timestamp+counter prefix, so **id order is insertion order**, and `createMany`
  inserts in payload order. The dialogs display in server order and submit in
  display order, so the order is preserved *inductively*: each save rewrites the
  rows in the order the previous load produced, plus additions at the end. The
  server just reads `orderBy: { id: 'asc' }` instead of sorting by name.

## Capabilities

### Modified Capabilities
- `production-slots`: the two back-office dialog requirements (Stock, Producción
  Real) gain the ordering behavior.
- `order-create-presentation`: the added-products list requirement gains entry
  order, covering both the creation modal and the edit dialog that shares it.
- `order-management`: new requirement — an order's items keep their submitted
  order.

## Impact

- **Backend:** `slots.service.ts` (`stockOf` builds rows in entry order instead
  of sorting by name; `getProduced` drops its name sort — its query already reads
  oldest-first), `orders.service.ts` (`items` includes gain `orderBy: { id: 'asc' }`).
  No schema change, no migration.
- **Frontend:** `SelectedItems` iterates the quantity map's key order instead of
  catalog order; its three parents drop a product's key on removal (so re-adding
  appends); `ExistenceEditor` and `ProducedEditor` stop sorting by name and
  preserve server order, appending new products at the end.
- **The close carry inherits the order for free:** the carry writes the successor
  bloque's stock inicial from the stock view's rows, so the next bloque's Stock
  dialog opens in the closed bloque's order.
- **Existing data has no entry order to recover** — rows saved before this change
  were written in alphabetical payload order, so dialogs will initially open
  alphabetically and drift toward true entry order as the manager works. Nothing
  to migrate; the first save after this change establishes the baseline.
- **The close-shortfall warning and stock API keep a deterministic order** (entry
  order, demand-only rows last by name) but no longer alphabetical — nothing on
  screen sorts them back.
