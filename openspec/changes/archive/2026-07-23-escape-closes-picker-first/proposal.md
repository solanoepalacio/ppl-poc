## Why

The client selector and the product search each show a type-ahead dropdown. While
one was open, pressing Escape closed the whole "Agregar pedido" modal (the native
`<dialog>` closes on Escape) — losing the order in progress when the manager only
meant to dismiss the dropdown.

## What Changes

- **Escape closes an open picker dropdown first**, without closing the modal. When
  no dropdown is open, Escape closes the modal as before. Applies to both the
  client selector and the product search.

## Capabilities

### Modified Capabilities

- `order-create-presentation`: Escape dismisses an open picker dropdown before it
  can close the order-creation modal.

## Impact

- **Frontend only.** `ClientCombobox` and `ProductCombobox` swallow Escape
  (`preventDefault` + `stopPropagation`) only while their dropdown is open,
  closing just the dropdown; otherwise Escape bubbles to the dialog as before.
