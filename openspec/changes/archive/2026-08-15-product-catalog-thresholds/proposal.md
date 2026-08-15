## Why

The production views answer "what did customers order that we have not baked
yet". They cannot answer "what should be on the shelf anyway". A product nobody
ordered today is invisible to the line even when there are none left, because the
list is built from demand: no order, no row.

The bakery bakes to stock as well as to order. What is missing is a per-product
floor — bake enough to cover the orders **and** leave this many on the shelf —
and the floor has to be maintained by the manager, which today is impossible:
products are seeded by data migration and there is no product view at all.

## What Changes

- **Products gain a threshold**: the stock level the bakery wants to hold. Zero
  means "only bake what was ordered", which is what every product does today.
- **The production views show a product whose stock actual is under its
  threshold**, even with no orders at all, and the quantity to produce becomes
  `threshold − stock actual` — which is the same arithmetic as today once the
  threshold is zero, so nothing about the current behaviour changes by default.
- **A Productos view** in the back office: list, add, edit (name, line,
  threshold), retire and reinstate. The catalog stops being editable only by
  migration.

## Capabilities

### Added Capabilities
- `product-catalog`: the catalog as something the manager maintains — the fields
  a product carries, including the threshold, and the rules for adding, editing
  and retiring one.

### Modified Capabilities
- `production-totals`: the net to produce accounts for the threshold, and a
  product can now be in the totals without appearing in a single order.
- `back-office-navigation`: a sixth destination.

## Impact

- **Schema:** `Product.threshold`, an integer defaulting to 0. The default is
  what makes this change inert on the existing catalog: every product keeps
  behaving exactly as it does now until somebody raises its floor.
- **The totals stop being demand-driven.** Today one query over the bloque's
  order items produces the whole list. Now the list is the union of "ordered in
  this bloque" and "has a threshold", which means reading the catalog too. The
  bloque scoping and the category scoping are unaffected.
- **The production views' subtitle stops being true.** "Cantidades a producir
  según pedidos" is no longer what the screen shows, since a row can be there
  with no pedidos behind it.
- **Deliberately not touched:** the stock view and the rule that refuses to close
  a bloque with negative stock actual. A threshold is a target, not a debt —
  being under it is not the same as owing units to a customer, and closing a
  bloque under a threshold is normal.
- **Products become deletable**, which they were not. Following the client
  directory exactly: a product no order references is deleted outright, one that
  orders reference is retired instead, so closed bloques keep resolving.
