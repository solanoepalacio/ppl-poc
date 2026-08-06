## 1. Demand aggregation moves to SlotsService

- [x] 1.1 Add `getDemandMap(slotId, category?)` to `SlotsService`, returning
  productId → `{ name, quantity }` summed over the bloque's order items. It goes
  here, not in `OrdersService`, because `closeSlot` needs it and `SlotsService`
  cannot depend on `OrdersService` without closing a module cycle.
- [x] 1.2 Rewrite `OrdersService.getProductionTotals` to consume it instead of
  summing the items itself, so there is one implementation of "demand for a
  bloque" rather than two that can drift.
- [x] 1.3 ~~Confirm the existing production-totals tests pass untouched~~ — they
  could not: the data source moved from the Prisma mock to the SlotsService stub,
  so the tests had to be re-pointed. They still assert the same outputs (the two
  deductions, the floor, the sort, the category pass-through); the summing itself
  is now covered by four new tests on `getDemandMap`.

## 2. Stock computation

- [x] 2.1 `SlotsService.getStock(slotId)`: merge stock inicial, summed producción
  real and demand into one row per product with `initial`, `produced`, `demand`
  and `current = initial + produced − demand`. The union has to cover products
  present in only one of the three sources — a product baked but never ordered
  nor counted appears in exactly one.
- [x] 2.1b Return **every** product with activity, shortfalls included, rather
  than pre-filtering. The control hides them, but a manager adding such a product
  to give it a stock inicial needs its real demand and production, or the stock
  actual shown would be a fiction. Verified in the browser: adding a hidden
  product shows its true −45.
- [x] 2.2 Shape the response so the caller does not re-derive: include the product
  name, and sort by name.
- [x] 2.3 `@pannico/shared`: `SlotStockItem` and `SlotStockResponse` DTOs.
- [x] 2.4 `GET /slots/:id/stock`.
- [x] 2.5 Unit-test the three-way union explicitly: product with only initial,
  only production, only demand, and all three; plus a negative current.

## 3. Carry on close

- [x] 3.1 `closeSlot`: after creating the successor and inside the same
  transaction, write each product's positive stock actual as a `SlotExistence`
  row on the new bloque. Clamp at zero — drop anything zero or below rather than
  storing it.
- [x] 3.2 Compute the carry from data read inside the transaction, so a write
  landing mid-close cannot produce a carry that matches neither bloque.
- [x] 3.3 Do not carry producción real; the new bloque starts with no entries.
- [x] 3.4 `GET /slots/close-preview`: the products of the open bloque whose stock
  actual is below zero, with the shortfall. Advisory only — the clamp behaves the
  same whether or not it was called.
- [x] 3.5 Tests: a positive carries, a negative does not, the closed bloque's own
  figures are untouched, producción real does not carry, and a failure inside the
  carry rolls back the whole close so the bloque stays open.

## 4. Closed bloques are immutable

- [x] 4.1 `deleteOrder`: reject when the order's bloque is closed.
- [x] 4.2 `replaceItems`: same guard — it has none today either.
- [x] 4.3 Tests for both.
- [x] 4.4 `OrderActions`: take the bloque's status and stop offering edit and
  delete on a closed bloque, rather than letting the manager find out by failing.

## 5. Stock dialog

- [x] 5.1 `lib/api.ts`: `getSlotStock`, and `getSlotClosePreview`.
- [x] 5.2 `orders/page.tsx`: fetch the stock view for the open bloque and pass it
  to the dialog. It replaces the existencia fetch, which the new view subsumes.
- [x] 5.3 Rework `ExistenceEditor`'s rows: name, an editable stock inicial and a
  read-only stock actual. **Not** `SelectedItems` — that component is built on
  "only ever shows what is already on the order" and is shared by three other
  dialogs; a row that exists because of a figure it knows nothing about breaks its
  premise, and its remove control would be meaningless on such a row.
- [x] 5.4 List a product when its initial or its current is above zero; recompute
  the current figure locally as the initial is edited, so the two never disagree
  on screen before a save.
- [x] 5.5 Keep the save as replace-all over stock inicial only — the current figure
  has nothing to submit.
- [x] 5.6 Update the dialog's copy: it is no longer only "lo que ya hay en
  existencia", and the title should name both figures.
- [x] 5.7 `globals.css`: styles for the two-figure row.

## 6. Close confirmation

- [x] 6.1 `CloseSlotButton`: fetch the preview first; with no shortfall, close as
  today.
- [x] 6.2 With a shortfall, show the products and their amounts and require an
  explicit confirm, with cancel leaving everything untouched.
- [x] 6.3 Say plainly in the dialog copy that confirming discards the shortfall —
  the point of the warning is that the loss is chosen, not discovered later.

## 7. Verify

- [x] 7.1 `lint` and `test` on the backend; `lint` on the frontend.
- [x] 7.2 Drive the arithmetic against the running app with the worked example:
  initial 100, demand 200, production 300 → current 200, initial still 100.
- [x] 7.3 Drive a real close end to end on a scratch bloque: a positive carries to
  the successor as its initial, a negative does not, the closed bloque keeps its
  own numbers, and the successor has no producción real. Restore whatever bloque
  state the test disturbs.
- [x] 7.4 Confirm stock actual and the production views never disagree: a product
  at `−n` shows `n` to produce, a product at zero or above is absent from the view.
- [x] 7.5 Confirm a closed bloque rejects order edit and delete from the API, and
  that the controls are gone from the UI.
- [x] 7.6 Drive the confirmation: warning lists the right products, cancel leaves
  the bloque open, confirm closes and drops the shortfall.
