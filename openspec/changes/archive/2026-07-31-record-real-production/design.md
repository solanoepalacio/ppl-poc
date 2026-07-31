## Context

Existencia is the nearest existing thing, and it is worth being precise about
where this follows it and where it does not:

- `SlotExistence(slotId, productId, quantity)`, unique on `(slotId, productId)` —
  **one row per product**, written replace-all inside a transaction, rejecting a
  closed bloque and non-integer or negative quantities.
- `ExistenceEditor`, a client island: a toolbar button opening a `Modal` whose body
  is `ProductPicker`, prefilled from the current figures, saving the whole map and
  then `router.refresh()`.
- `orders.service.ts` computes `toProduce: Math.max(0, quantity - inStock)`.

Producción real reuses the *shape* of all that — bloque-scoped, open-bloque-only,
subtracted from the totals — but not the cardinality: it is a history, so it is
**one row per recorded batch**.

The production views consume only `toProduce`; since the two-column change they
render the product name and that number and nothing else.

## Goals / Non-Goals

**Goals:**
- Make the number on the production views a live countdown of what is still
  missing, and remove products once there is nothing missing.
- Let the manager add each batch as it comes out of the oven, without arithmetic
  against what was already recorded.
- Let a wrong batch be found and fixed *where the mistake is*, not by adjusting a
  total that hides it.
- Keep every guarantee existencia already has: bloque-scoped, open-bloque-only,
  independent of existencia, integer quantities.

**Non-Goals:**
- Showing real production on the production views. They were deliberately reduced
  to one number per product.
- Attributing entries to a person. The timestamp is for finding a batch, not for
  audit of who did it.
- Safe concurrent editing. One manager operates this.
- Editing on a closed bloque, for the same reason existencia cannot be: the bloque
  is the unit of work.

## Decisions

### The history is the data; the total is derived

`SlotProduced` deliberately drops the `(slotId, productId)` unique constraint that
`SlotExistence` has. A product's figure is `SUM(quantity)` over its rows, computed
by `groupBy` in `getProducedMap`, and never stored.

That is what makes the requirements above possible. Correcting a mistyped batch
means updating the row that was wrong, so the other batches are untouched and the
total follows. Deleting a batch means deleting a row. "Remove this product" means
deleting all of its rows. There is no second mechanism for any of it, and no
stored total that could disagree with the entries behind it.

The consequence, accepted: the accumulated quantity cannot be edited directly in
the UI, because there is nothing to write it to. That is why it renders as a
figure rather than an input — the affordance matches the model instead of implying
a capability that does not exist.

### One replace-all endpoint over entries, not four verbs

The obvious API for a history is a verb per operation: POST a batch, PATCH an
entry, DELETE an entry, DELETE a product. That is rejected. The existing dialogs
in this codebase all stage changes locally and commit once — `Cancelar` really
cancels — and four endpoints would mean either firing requests per keystroke or
building a change-set to replay, which is a replace-all payload with extra steps.

So `PUT /slots/:id/produced` carries the **complete desired set of entries**:

- an entry with an `id` is kept, its quantity updated, its `createdAt` preserved;
- an entry without an `id` is new, and the server stamps it;
- any existing entry the client did not send is deleted.

All four operations fall out of that one shape, including both deletes. Ids are
validated against this bloque's own rows *and* against the product they are sent
under before anything is written, and a duplicate id is rejected, so an entry
cannot be reached across bloques, reassigned by mislabelling, or applied twice.

**Deletion is scoped to the products named in the request.** The obvious reading
of replace-all — delete every entry not sent — is wrong here, and dangerously so.
The dialog sends its entire view on save, so a tab holding a stale read would
delete the history of any product added since it loaded, with the manager doing
nothing but pressing Guardar. That is not a theoretical race: it destroyed real
data twice while this feature was being tested, silently, and it needs only one
person with a second tab. Narrowing the blast radius to the products actually
named costs nothing — clearing a product is still expressed by sending it with an
empty `entries` — and turns a silent wipe into a no-op.

### Idempotency is traded for visibility

This is the one place the design reverses an earlier decision, so it is worth
stating rather than burying. A per-product total *can* be written idempotently:
have the client compute `recorded + batch` and send the absolute figure, so
replaying it lands on the same state. A history cannot: new entries carry no id,
so replaying appends them again.

The trade is accepted because the failure mode changes character. With a single
total, a doubled batch is indistinguishable from a genuine one and nothing
downstream can detect it. With a history, it appears as two entries seconds apart
under the product's detail, and one click removes it. Visible and reversible beats
impossible-but-invisible, and the save button is disabled while in flight anyway.

### `produced` in code, "Producción Real" in the UI

*Production* is already taken: `GET /orders/production` returns the totals to
produce, and the two views are named **Producción salados** / **Producción
dulces**. A `SlotProduction` model next to a production-totals endpoint would be a
standing trap. The code says `produced` throughout — model `SlotProduced`, route
`/slots/:id/produced`, field `produced` — and "Producción Real" appears only as
user-facing Spanish, which is the convention the project already follows.

### The views filter; the API does not

`toProduce > 0` is applied in `ProductionView.tsx`, not in
`getProductionTotals`. The totals keep reporting covered products, with their
demand, existencia and real production intact, so the figures stay available and
auditable on the orders view and to anything else that asks. Only the screen that
has no use for them drops them. Putting the filter in the API would have thrown
the data away for every consumer to serve one.

### Timestamps are formatted with an explicit locale

`formatWhen` pins `es-AR`. The server runs with an empty `LANG` and would resolve
to `en-US`, so an unpinned `toLocaleDateString` renders different text on the
server than in the browser and React reports a hydration mismatch — the same trap
already fixed in `slotLabel.ts` and `OrdersTable.tsx`.

### The migration backfills integers, not `CURRENT_TIMESTAMP`

Adding `createdAt` to a table that already had rows needs a value for them.
Prisma's generated migration used `DEFAULT CURRENT_TIMESTAMP`, which writes
**TEXT**, while Prisma itself encodes `DateTime` on SQLite as **integer
milliseconds**. SQLite orders every INTEGER before every TEXT regardless of value,
so a backfilled row sorted after every later entry no matter how old it was, and
the history read out of order. The backfill writes
`CAST(strftime('%s','now') AS INTEGER) * 1000` instead. Confirmed empirically, not
assumed.

## Risks / Trade-offs

- **A stale dialog can still overwrite a concurrent edit to a product it *did*
  show.** Two dialogs open on the same product, and the second save wins. Accepted:
  single operator. What it can no longer do is delete a product it never showed —
  see the scoping decision above.
- **A duplicated batch is possible.** Covered above: visible and one-click
  reversible, which is the point of the history.
- **The production screen stops being auditable, and now also incomplete.** A
  finished product is indistinguishable from one never ordered, because both are
  absent. Covered in the proposal.
- **The pinned history region competes for dialog height.** Capped at `38vh` with
  its own scroll so it cannot push the batch picker — where the work happens — off
  the screen.
