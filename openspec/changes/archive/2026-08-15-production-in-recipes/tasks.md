## 1. The field

- [x] 1.1 `Product.recipeSize`, `Int @default(0)`, plus the migration. Inert on
  the existing catalog, like the umbral and the pack before it.
- [x] 1.2 On the `Product` DTO, and on the production totals item — the view
  divides, so it needs the divisor.

## 2. The catalog

- [x] 2.1 Receta in the Productos listing and in add/edit, beside the pack.
- [x] 2.2 Reject a negative receta size.
- [x] 2.3 Four numeric fields on one row now. Check the add form and the listing
  still fit before calling it done — the columns were last balanced for three.

## 3. The production views

- [x] 3.1 A receta figure per row: quantity to produce divided by the receta
  size, to two decimals, in es-AR — `0,25`, not `0.25`.
- [x] 3.2 An em dash where there is no receta. Zero would read as "no work",
  which is the opposite of what a row on this screen means.
- [x] 3.3 Keep the unit quantity. It is what the order was placed in and what the
  stock is counted in; the receta is a second reading of it, not a replacement.
- [x] 3.4 Divide where the figure is displayed, not in the API. The endpoint
  reports quantities; how many batches that is, is a way of reading them.
- [x] 3.5 Formatted on the server. These are Server Components, so the locale
  cannot resolve one way in Node and another in the browser.
- [x] 3.6 Look at it at the size these screens are actually read at. Three
  columns in each of two side-by-side tables is the constraint, and it is not
  visible from the markup.

## 4. Tests

- [x] 4.1 The totals carry the receta size.
- [x] 4.2 CRUD: a negative receta is rejected; a product starts at zero.
- [x] 4.3 The division: 25 of a 100-unit receta reads 0,25; a product with no
  receta reads as having none.
