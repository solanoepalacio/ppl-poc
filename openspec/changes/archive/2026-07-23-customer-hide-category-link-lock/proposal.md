## Why

Two small refinements from testing the order flows:

- The customer order screen showed each product's salado/dulce production-line
  label. That category exists for the back office's production planning — the
  customer neither knows nor cares which line a product belongs to when ordering,
  so the pill is noise on that surface.
- The Generar link modal dropped the client selector once the link was generated
  and parked the copy action in the footer, away from the link itself. Keeping the
  client visible (locked) and putting copy right next to the link reads better.

## What Changes

- **Hide production category labels from the customer.** The customer order
  screen no longer shows the salado/dulce pill on added products; the back office
  still shows it everywhere it did.
- **Generar link keeps the client locked and copies inline.** After generating,
  the selected client stays shown as a read-only selection, the link appears in
  its own card, and a copy control sits directly with the link.

## Capabilities

### Modified Capabilities

- `order-intake-presentation`: the customer order screen hides production-facing
  category labels (salado/dulce).
- `order-create-presentation`: the Generar link modal keeps the selected client
  shown as a locked selection after generating and places the copy control with
  the generated link.

## Impact

- **Frontend only.** `SelectedItems` gains a `showCategory` prop (default true);
  the customer `OrderForm` passes `showCategory={false}`. `GenerateLinkModal`
  keeps the `ClientCombobox` mounted and disabled once a result exists, renders the
  link in a `.link-card` with an inline `.copy-btn`, and drops the footer copy
  button (footer is just Listo). `globals.css` adds `.link-row` / `.copy-btn`.
- **Backend / contract**: none.
