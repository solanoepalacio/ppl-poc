## Why

A bloque spans several days of baking. The production views tell the line how
many units of each product to make, and that number is computed once, from the
orders, minus whatever stock was already on hand when the bloque opened. It then
sits there unchanged while the line actually bakes.

So the screen answers "how many were needed" and not "how many are still
missing". Halfway through the bloque, with 30 of the 50 medialunas already out
of the oven, the screen still says 50. The only way to know what is left is to
remember what was made, which is exactly the thing a wall display exists to
avoid.

What is missing is a record of what has actually been produced so far, so the
quantity on the screen can count down toward zero as the work gets done — and,
once it reaches zero, get out of the way.

## What Changes

- **Record real production per bloque as a history of entries.** Each recorded
  batch is its own entry carrying a quantity and the moment it was recorded. A
  product's real production is the *sum* of its entries. Entries belong to the
  bloque, are editable only while it is open, and never span bloques whatever
  their timestamps say.
- **Subtract it from the quantity to produce.** The figure becomes
  `demand − existencia − producción real`, still floored at zero, so it is now
  *what is still missing* rather than *what was needed*.
- **Drop finished products from the production views.** A product whose quantity
  to produce has reached zero is done, and is removed from `/dulces` and
  `/salados` rather than shown as a row reading 0. The views become a work queue
  that empties as the bloque is worked through; when everything is done they are
  empty, which is the signal.
- **Add a "Producción Real" control to the orders view**, next to the existing
  "Stock" one, disabled the same way when the selected bloque is not the open one.
- **The control is a history, not a set of totals.** Each product with production
  recorded shows its accumulated quantity as a **read-only** figure — it is a sum,
  so the way to change it is to change what it sums. **Ver detalle** expands that
  product's entries, each showing when it was recorded, with an editable quantity
  and its own delete control. A per-product delete removes the whole history and
  so clears its real production. Separately, an always-empty picker records a new
  batch, so a quantity typed there is unambiguously an addition.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `production-slots`: adds the bloque's per-product real-production history and
  the orders-view control that records and reviews it.
- `production-totals`: replaces the requirement defining the net to produce as
  `demand − existencia` with one that also subtracts real production; replaces the
  requirement describing the production views so that finished products are
  omitted instead of shown at zero; and amends the aggregation requirement so the
  fields it enumerates stay accurate.

## Impact

- **Full stack.** New Prisma model and migration; new DTOs in `@pannico/shared`;
  three service methods and two endpoints in the `slots` module; two functions in
  `lib/api.ts`; one new component on the orders view; one filter in
  `ProductionView.tsx`.
- **The production views change behaviour but not markup.** They already showed a
  single number per product; now they show fewer rows. The one visual consequence
  is that the zero-quantity styling (`.ptable-qty--covered`) becomes unreachable
  and is removed.
- **Not idempotent, deliberately.** A new entry carries no id, so replaying a save
  appends it twice. This is the accepted cost of having a history: a duplicated
  batch is visible under the product's detail and removable in one click, whereas
  a silently doubled total would be invisible and unrecoverable. Incrementing a
  single stored figure would have the same hazard with none of the recourse.
- **The trade-off the views buy, stated plainly:** the screen no longer shows why
  a number is what it is, and no longer shows finished products at all. A product
  reading 20 could have had 20 ordered, or 50 ordered with 30 already baked; a
  product absent from the screen could be finished or never ordered. The line gets
  a queue it can act on and loses the ability to audit it from that screen. The
  inputs and the full history remain on the orders view, where they are entered.
- **Concurrent editing is not addressed.** Two managers with the dialog open would
  have the last save overwrite the first, since the save sends the complete desired
  set of entries. A single manager operates this, so it is accepted rather than
  solved.
