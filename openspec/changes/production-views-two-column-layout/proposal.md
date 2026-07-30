## Why

The production views (**Producción salados** / **Producción dulces**) are read
off a screen in the production area while people bake. Today each is a single
full-width table with four columns — producto, necesario, stock, a producir —
so a long line runs off the bottom of the screen and someone has to walk over
and scroll it, which is exactly what a wall display should never require.

Two things waste that space. The table is one column wide, leaving half the
screen empty on a wide display; and three of its four columns are numbers the
baker does not act on. What the production line needs is one number per
product: how many to make. Demand and existencia are inputs to that number, not
instructions.

## What Changes

- **Split each production view into two tables side by side**, one per half of
  the screen, so roughly twice as many products fit before anything scrolls.
  Products are distributed **alternating** between them — the first to the left
  table, the second to the right, the third to the left, and so on — so the list
  reads left-to-right, row by row.
- **Drop the "Necesario" and "Stock" columns.** Each row keeps only the product
  name and the quantity to produce.
- **Alternate each row's colour treatment**, blue then black down each table, to
  make rows easier to track across the width of the screen at a distance. The
  treatment covers the product name, a soft row background, and the quantity
  chip, whose background matches that row's name colour.
- **Drop the line total.** The screen is a per-product work list; a single summed
  figure is not something the production line acts on, and it competed for
  attention with the numbers that are.
- **Enlarge the header's supporting line** and make it the same on both views —
  *Cantidades a producir según pedidos* — so what the screen is showing reads
  from across the room.
- Everything else about these views is unchanged: still one view per production
  line, still always the currently open bloque, still no bloque selector, still
  read-only, and still refreshing on its own every 30 seconds. The larger
  supporting line is scoped to these two views, so the orders view's header is
  untouched.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `production-totals`: replaces the requirement describing the production views'
  single four-column table with one describing the two-table split and the
  reduced columns, adds the alternating row colour treatment, and states that
  these views carry no line total.

## Impact

- **Frontend only**, and only the production views:
  `packages/frontend/src/app/(backoffice)/production/ProductionView.tsx` plus
  the `.ptable` styles in `globals.css`. The orders view uses different markup
  and is untouched.
- **No backend or API change.** `GET /orders/production` keeps returning demand
  and existencia for every product — they are still needed to compute the
  quantity to produce. This change only stops *displaying* them, so the
  requirement covering that computation is deliberately left alone.
- Worth stating plainly as a trade-off rather than a hidden cost: with those two
  columns gone, nobody can tell from this screen *why* a number is what it is —
  whether a product shows 4 because 4 were ordered or because 10 were ordered
  and 6 are already in stock. The stock figures remain visible where they are
  entered, on the orders view.
