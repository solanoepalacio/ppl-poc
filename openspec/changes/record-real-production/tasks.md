## 1. Data model

- [x] 1.1 `schema.prisma`: add `SlotProduced` with `id`, `slotId`, `productId`,
  `quantity`, `createdAt`. **No** unique constraint on `(slotId, productId)` — one
  row per recorded batch, not per product. Index `slotId` and `(slotId, productId)`.
  Cascade on the bloque, plain relation to `Product`.
- [x] 1.2 Document on the model that a product's figure is the SUM of its rows,
  that the rows are the history the manager reviews, and that totals key off
  `slotId` alone so entries never leak across bloques.
- [x] 1.3 Migration, then `prisma generate`.
- [x] 1.4 Fix the generated backfill: write `createdAt` as integer milliseconds,
  not `CURRENT_TIMESTAMP` (TEXT), or pre-existing rows sort after every later entry
  in SQLite. Verify on a throwaway DB that the backfilled row sorts first.

## 2. Contract

- [x] 2.1 `@pannico/shared`: `ProducedEntry` (id, quantity, createdAt),
  `ProducedProduct` (productId, name, total, entries), `SlotProducedResponse`,
  `SetProducedProduct` and `SetProducedRequest`.
- [x] 2.2 Document `SetProducedRequest` as the complete desired set of entries, and
  state plainly that it is *not* idempotent and why that trade was taken.
- [x] 2.3 Add `produced: number` to `ProductionTotalItem` and restate `toProduce`
  as `max(0, demand − existence − produced)`.
- [x] 2.4 Build `@pannico/shared` before the other workspaces typecheck.

## 3. Backend

- [x] 3.1 `getProduced`: read rows oldest-first, group by product, sum, carry the
  product name, sort by name. A product with no rows is absent, not zero.
- [x] 3.2 `getProducedMap`: `groupBy` + `_sum` so the totals come from the entries
  rather than a stored figure. Treat a null sum as zero.
- [x] 3.3 `setProduced`: reject a closed bloque, an unknown product, a non-positive
  or non-integer quantity, an id not belonging to this bloque *or to the product it
  is sent under*, and a duplicate id. Then, in one transaction: delete the unsent
  entries **of the named products only**, update those with ids, create those
  without.
- [x] 3.3b Scope deletion to the products named in the request. Deleting every
  unsent entry lets a stale tab wipe anything added since it loaded, just by
  pressing Guardar — reproduced against the running app before and after the fix.
- [x] 3.4 Revert the `validatePerProductWrite` factoring — `setProduced` no longer
  shares that path, so a helper claiming the two writes cannot drift would be a
  lie. Restore `setExistence` to its own inline validation.
- [x] 3.5 `SlotsController`: `GET`/`PUT :id/produced`, with doc comments describing
  the entry semantics rather than the old absolute-totals ones.
- [x] 3.6 `orders.service.ts`: subtract both deductions under one floor at zero,
  and add `produced` to each item.
- [x] 3.7 `slots.service.spec.ts`: cover create/update/delete/clear, id-ownership
  and duplicate-id rejection, closed bloque, non-positive and non-integer
  quantities, independence from existencia, and that `getProduced` groups, sums,
  sorts and reads oldest-first.
- [x] 3.8 `orders.service.spec.ts`: cover the chained subtraction — each deduction
  alone, both together, the floor when they jointly exceed demand, and a fully
  produced product staying in the *totals* at zero.

## 4. Frontend data access

- [x] 4.1 `lib/api.ts`: `getSlotProduced` / `setSlotProduced` over the new shapes.
- [x] 4.2 `orders/page.tsx`: fetch the open bloque's history alongside existencia.

## 5. The Producción Real dialog

- [x] 5.1 `ProducedEditor.tsx` holds a staged draft keyed by product, seeded from
  the response, plus an always-empty batch map. Both reset on every open so a stale
  batch can never be submitted twice.
- [x] 5.2 List only products whose staged entries still sum above zero, sorted by
  name. Show the accumulated quantity as a **figure, not an input**.
- [x] 5.3 "Ver detalle" toggles a product's entries: date and time, an editable
  quantity, and a delete control per entry.
- [x] 5.4 A per-product delete control clears that product's whole staged history,
  which drops it from the list and clears its figure on save.
- [x] 5.5 On save, merge the batch in as id-less entries and send the whole staged
  set.
- [x] 5.6 Format timestamps with an explicit `es-AR` locale to avoid the hydration
  mismatch the server's empty `LANG` would otherwise cause.
- [x] 5.7 Mount it next to `ExistenceEditor` with the same `disabled={!isOpen}`
  treatment, and `router.refresh()` on success.
- [x] 5.8 CSS: cap the pinned history at `38vh` with its own scroll. Zero
  `padding`/`min-height` on the icon buttons — the global `button` rule's 1rem side
  padding and 44px min-height otherwise collapse a 34px box's content to zero width
  and the glyph renders invisible.

## 6. Production views omit finished products

- [x] 6.1 `ProductionView.tsx`: filter to `toProduce > 0` before the zig-zag split,
  and drive the empty state off the filtered list so "Nada que producir" shows when
  everything is done.
- [x] 6.2 Keep the filter in the view, not the API — the totals stay complete and
  auditable for the orders view and any other consumer.
- [x] 6.3 Remove the now-unreachable `.ptable-qty--covered` styling and the
  conditional that applied it.

## 7. Verify

- [x] 7.1 `lint` and `test` on the backend; `lint` on the frontend.
- [x] 7.2 Drive the API: successive batches create separate entries in chronological
  order; correcting one entry leaves the others and their timestamps alone; deleting
  one entry leaves the rest; clearing a product removes it and zeroes its figure;
  every rejection returns 400 and writes nothing.
- [x] 7.3 Drive the dialog in a browser: the total is a figure with no input; "Ver
  detalle" reveals date/time and editable quantities; per-entry and per-product
  deletes work and the total recalculates live before saving; no hydration warning
  in the console.
- [x] 7.4 Reproduce the stale-tab case end to end: load the page, write from
  another session, then save the untouched dialog — and confirm the other session's
  product survives.
- [x] 7.5 Fix the quantity inputs: a controlled numeric field that reparses '' back
  to its committed value can never be cleared, so typing 300 over a 1 gives 1300.
  Hold the raw text while focused and the value the field started with, restoring
  the latter when it is left empty or below the minimum. Applies to the shared
  `SelectedItems` input (create-order, edit-items, Stock, Producción Real) and to
  the history entry fields.
- [x] 7.6 Regression-test the three other dialogs that share that input.
- [x] 7.7 Drive the production views: a product hidden the moment it reaches zero,
  reappearing if the deduction drops, hidden again exactly at the boundary, never
  showing a row at or below zero, and still reported by the API while hidden.
