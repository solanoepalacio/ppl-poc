## Why

When the manager picks a product from the "Agregar producto" search, there was no
feedback: the dropdown stayed open and nothing indicated where the product landed
in the added-products list. Because the list is in catalog order (not append
order), a just-added product can appear anywhere — often off-screen — so it was
easy to miss whether the pick registered.

## What Changes

- **Close the search results on pick.** Picking a product closes the dropdown.
- **Reveal + highlight the added row.** The product's row is scrolled into view if
  off-screen and briefly highlighted, so the manager sees the pick land.

## Capabilities

### Modified Capabilities

- `order-create-presentation`: picking a product from the search now closes the
  results and reveals + briefly highlights the added row.

## Impact

- **Frontend only.** `ProductCombobox` closes on pick (no longer re-opens via a
  refocus). `CreateOrderModal` tracks the just-added product (with a bump counter
  so a re-add re-triggers). `SelectedItems` scrolls the matching row into view and
  applies a short flash (`item-added-flash`), honoring `prefers-reduced-motion`.
