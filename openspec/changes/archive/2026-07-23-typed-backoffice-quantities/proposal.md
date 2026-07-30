## Why

On the back office's product lists, a product's quantity was a value flanked by
−/+ stepper buttons. Testing with the bakery manager revealed the number itself
wasn't recognized as editable, so setting 200 units meant tapping "+" 200 times.
Back-office quantities are frequently large (production runs), so a typed field is
the right primary control.

## What Changes

- **Replace the −/+ stepper with a typed numeric field** on the back-office product
  lists (order creation, edit items, stock). The field looks like an input so it
  reads as editable, and it still selects its whole value on focus (so typing
  replaces it). Removing a product stays a separate control.

The customer-facing quantity stepper is unchanged.

## Capabilities

### Modified Capabilities

- `numeric-input-presentation`: back-office quantity fields are entered by typing,
  not through −/+ stepper buttons.

## Impact

- **Frontend only.** `SelectedItems` drops the −/+ buttons and renders the quantity
  as a bordered `.qty-input` (keeping select-all-on-focus and integer coercion);
  the old `.step-btn` / `.step-value` styles are removed. Shared by all three
  back-office product dialogs via `ProductPicker`.
