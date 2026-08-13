## 1. The field

- [ ] 1.1 `Product.threshold`, `Int @default(0)`, plus the migration. The default
  is what keeps this change inert on the existing catalog.
- [ ] 1.2 Carry it on the `Product` DTO so both sides read one contract.

## 2. The production rule

- [ ] 2.1 `toProduce = max(0, threshold + demand − existencia − producción)`.
  With threshold 0 this is the rule that is there today, so the existing tests
  must keep passing untouched — if any needs editing, the rule is wrong.
- [ ] 2.2 The totals stop being built from demand alone: the list becomes the
  union of "ordered in this bloque" and "active with a positive threshold",
  still scoped by category and bloque.
- [ ] 2.3 A retired product is not raised by its threshold, but keeps its entry
  if it was ordered — that demand is real and somebody is waiting for it.
- [ ] 2.4 Leave the stock view and the close-bloque shortfall rule alone. A
  threshold is a target, not a debt; being under one is not owing units.
- [ ] 2.5 The production views' subtitle is no longer true — a row can be there
  with no pedidos behind it.

## 3. The catalog CRUD

- [ ] 3.1 Backend: list (retired included), create, update, remove — mirroring
  `clients/` , which solves the same problem. Name unique; reject a duplicate
  without persisting anything.
- [ ] 3.2 Remove is delete-or-retire depending on whether any order references
  the product, and the response says which happened.
- [ ] 3.3 Reject a negative threshold.
- [ ] 3.4 `GET /products` keeps returning only active products: it feeds the
  customer form and the order pickers, and a retired product must not be
  orderable. The management listing is the separate call.

## 4. The view

- [ ] 4.1 A `Productos` destination in the sidebar, sixth.
- [ ] 4.2 The catalog listed with name, line and threshold, retired ones dimmed
  and reinstatable, following the Clientes view.
- [ ] 4.3 The removal control says whether it will delete or retire before it is
  pressed.

## 5. Tests

- [ ] 5.1 The existing production tests pass unchanged.
- [ ] 5.2 A threshold raises the net to produce; threshold and demand add; a
  product at its threshold nets zero.
- [ ] 5.3 A product with a threshold and no orders appears; with neither it does
  not; a retired one is not raised by its threshold.
- [ ] 5.4 CRUD: duplicate name rejected, negative threshold rejected, remove
  deletes or retires depending on references, retired product not in `GET
  /products`.
