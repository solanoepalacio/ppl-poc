## 1. The field

- [x] 1.1 `Product.packSize`, `Int @default(0)`, plus the migration. The default
  keeps the change inert on the existing catalog.
- [x] 1.2 On the `Product` DTO, so the customer form can decide per product
  whether to offer a choice at all.

## 2. The submission

- [x] 2.1 A submitted item carries the measure it was chosen in. Absent means
  units, so an older client — or any caller that does not know about packs —
  keeps working unchanged.
- [x] 2.2 Convert on the server with the **stored** pack size. A client that
  computed its own unit count could claim any number of units for any quantity.
- [x] 2.3 Reject packs of a product whose pack size is zero: the form cannot
  offer that, so a submission making it did not come from the form.
- [x] 2.4 Nothing about the measure is persisted. `OrderItem.quantity` stays
  units, which is what leaves production, stock and the review view untouched.

## 3. The form

- [x] 3.1 A unidad/paquete control beside the quantity, only where there is a
  pack; a plain label otherwise. Never a disabled control — it invites the
  customer to try it and wonder what is broken.
- [x] 3.2 Default to unidad. A default of packs multiplies an unread choice by
  the pack size.
- [x] 3.3 A small note beneath saying it can be ordered either way and what the
  pack is worth. The control alone says a pack exists but not what it holds.
- [x] 3.4 Replace the header notice. "Se toman por unidad, no por paquete" stops
  being true, and left there it contradicts the control below it.
- [x] 3.5 The summary states each line's measure, and the unit total for a line
  in packs — that total is what the bakery will bake.

## 4. The catalog

- [x] 4.1 Pack size in the Productos listing and in add/edit, beside the umbral.
- [x] 4.2 Reject a negative pack size, like the umbral.

## 5. Tests

- [x] 5.1 4 packs of a pack-of-5 records 20 units; 4 units records 4.
- [x] 5.2 Packs of a product without a pack size are rejected and nothing is
  persisted.
- [x] 5.3 An item with no measure at all is taken as units.
- [x] 5.4 The conversion ignores anything the client says the pack is worth.
- [x] 5.5 CRUD: a negative pack size is rejected; a product starts at zero.
