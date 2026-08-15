## Why

Some products are sold by the pack — a tray of five, a bag of a dozen — and the
customer thinks in packs, not in units. Today the form only takes units, so
ordering four packs means the customer doing the arithmetic themselves, and the
bakery finding out it went wrong after it was baked. The red notice in the header
exists precisely because that mistake was happening.

The bakery still counts, bakes and packs in **units**. So the choice belongs on
the form, and the conversion belongs behind it.

## What Changes

- **A product carries how many units make up one of its packs.** Zero — the
  default — means it has no pack and is ordered by unit, which is every product
  today.
- **The customer picks the measure per product** on the order form: a product
  with a pack gets a *unidad / paquete* control, defaulting to **unidad**; every
  other product shows a plain "unidad" label with nothing to choose.
- **The summary says which measure each line is in**, and what it comes to in
  units, so the review the customer is being asked to perform is performable.
- **The order records units and nothing else.** The conversion happens on
  submission and never reaches the database, so every other screen — production,
  stock, review, totals — keeps meaning exactly what it means today.
- **The header notice changes.** "Los pedidos se toman por unidad, no por
  paquete" stops being true the moment a pack can be ordered.

## Capabilities

### Added Capabilities
_None._

### Modified Capabilities
- `product-catalog`: a product gains its pack size, maintained like any other
  field.
- `order-intake`: a submitted item carries the measure it was chosen in, and the
  system converts before recording.
- `order-intake-presentation`: the per-product control, the summary, and the
  header notice that contradicted all of it.

## Impact

- **Schema:** `Product.packSize`, an integer defaulting to 0. Inert on the
  existing catalog: every product stays unit-only until somebody gives it a pack.
- **The conversion is done by the backend, not the browser.** The pack size is
  the bakery's to define, so the authoritative value is the stored one — and a
  client that computed its own unit count could submit any number it liked.
- **`OrderItem.quantity` keeps meaning units**, which is what leaves the rest of
  the system untouched: production totals, existencia, stock actual, the review
  view and the back-office order dialogs all keep working on one measure.
- **The by-unit notice is replaced rather than deleted.** The confusion it guards
  against does not go away — it changes shape, from "did they mean packs?" to
  "which one is this row in?".
