## Why

The people baking do not work in units, they work in **recetas** — a batch is
decided by how much goes into the mixer. The production screen tells them 100 of
product A, and they convert that to "a receta and a half" in their heads, every
product, every bloque, in a room where the screen is read from across the floor.

The conversion is a fixed number per product. The screen can do it.

## What Changes

- **A product carries how many units one of its recetas yields.** Zero — the
  default — means no receta is recorded and nothing changes for that product.
- **The production views gain a *receta* figure** beside the quantity: what is
  still to produce, divided by the receta, to two decimals. 25 to produce of a
  product whose receta is 100 shows **0,25**.
- **The catalog gains the field**, listed and editable like the others.

## Capabilities

### Modified Capabilities
- `product-catalog`: a product gains its receta size.
- `production-totals`: the views state the work in recetas as well as in units.

## Impact

- **Schema:** `Product.recipeSize`, an integer defaulting to 0 — the third figure
  on a product after the umbral and the pack, and maintained the same way.
- **Nothing stored changes.** Units remain the truth everywhere: ordered in
  units, held in units, produced in units. The receta is a lens over the figure
  the view already shows, which is what keeps a later correction to a receta from
  silently changing what a past bloque meant.
- **A fraction is shown rather than rounded to a whole receta.** This was the
  open question that stalled this feature when it was first analysed, and it is
  the reason it can now be small: rounding up would produce surplus that
  `toProduce` floors away, which would have dragged carrying stock between
  bloques into scope. Showing 0,25 asks the person at the mixer to do what they
  already do with a half batch, and changes no arithmetic anywhere.
- **The row grows to three figures** on a view read at a distance, where
  horizontal space is already split between two tables side by side. The unit
  quantity stays: it is what the order and the stock are counted in.
- **Not addressed:** a receta that yields more than one product — a shared dough
  — which the first analysis flagged and which a number on a product cannot
  express. Nothing here forecloses it; it would be an entity, not a field.
