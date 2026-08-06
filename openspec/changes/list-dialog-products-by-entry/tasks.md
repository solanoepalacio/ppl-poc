## 1. Backend — read in insertion order instead of sorting

- [x] 1.1 `slots.service.ts` `stockOf`: read existencia rows `orderBy: { id: 'asc' }`
  (cuid ids embed a timestamp+counter, so id order is insertion order) and build
  the row map from them first; then produced-only products by their first entry
  (`_min: { id: true }` on the existing groupBy); then demand-only products, by
  name for determinism (they are hidden in the dialog). Drop the final name sort —
  the map's insertion order is the response order.
- [x] 1.2 `slots.service.ts` `getProduced`: drop the final name sort; the per-product
  map is already built from rows read oldest-first, which is first-batch order.
  Add `id` as a tiebreaker to the query's `orderBy` so entries created in the same
  millisecond (one save writes several) keep their creation order.
- [x] 1.3 `orders.service.ts`: the two `include: { items: true }` become
  `include: { items: { orderBy: { id: 'asc' } } }`, so stored order is returned
  rather than whatever the engine happens to emit.
- [x] 1.4 Note why no schema change is needed: `setExistence` and `replaceItems`
  are replace-all, but `createMany` inserts in payload order and the dialogs
  submit in display order, so each save rewrites the rows in the order the
  previous load produced (plus appends). `setProduced` never recreates kept
  entries, so its history order is stable outright.

## 2. Backend tests

- [x] 2.1 Re-point the existing tests that assert alphabetical order in `getStock`
  and `getProduced` results to assert entry order instead.
- [x] 2.2 New: stock rows come back existencia-first in insertion order, with a
  produced-only product after them.
- [x] 2.3 New: `getProduced` lists products by first entry, a later batch does not
  move a product, and a product re-recorded after full deletion lands at the end.
- [x] 2.4 New: order items are returned in submitted order, and a replace
  establishes the replacement's order.

## 3. Frontend — display server order, submit display order

- [x] 3.1 `SelectedItems`: iterate the quantity map's own key order (a JS object
  preserves string-key insertion order) instead of filtering the catalog array,
  which is what imposed the alphabetical order. Look product data up by id.
- [x] 3.2 Its parents (`CreateOrderModal`, `OrderActions`, `ProducedEditor`'s
  batch) **delete** a product's key when its quantity reaches zero instead of
  keeping a zeroed key, so re-adding appends the key at the end — same semantics
  as the customer summary. `OrderActions` already seeds the map from the order's
  items, whose API order is now the stored order.
- [x] 3.3 `ExistenceEditor`: build rows from the server's stock order first and
  the just-added products after, dropping the local name sort. The save already
  maps over the displayed rows, so the payload is the display order.
- [x] 3.4 `ProducedEditor`: drop the name sort on `listed`; the draft record is
  keyed in the server's order already.

## 4. Verify

- [x] 4.1 Backend `lint` + `test`; frontend `lint`.
- [x] 4.2 Drive Agregar pedido: add three products out of alphabetical order and
  check the list shows them as added; change a quantity (no move); remove one and
  re-add it (to the end). Create the order, open Editar, and check it lists the
  items in the same order. Delete the scratch order and leave the bloque as found.
- [x] 4.3 Drive Stock: snapshot the real rows first; add products out of
  alphabetical order, save, reopen — same order, additions at the end. Restore the
  snapshot exactly.
- [x] 4.4 Drive Producción Real: record batches for products out of alphabetical
  order across two saves; the list follows first-batch order and a later batch
  does not move its product. Delete the scratch entries and confirm the dialog is
  back to its pre-test state.
- [x] 4.5 Confirm the production views and totals are unaffected — they sort on
  their own and never did read this order.
