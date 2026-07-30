## Why

The "Agregar pedido" dialog listed the entire catalog with a quantity stepper on
every row. Even in the enlarged frame that is a long, dense scroll, and it is hard
to see at a glance what is actually on the order — the ordered items are buried
among dozens of zero-quantity rows. The optional message also lived at the bottom
of that scroll, so it slid out of view while entering items.

## What Changes

- **Add products by search, one at a time.** The dialog gains a product search
  (type-ahead over the catalog, same pattern as the client picker). Picking a
  product adds it to the order; a product already on the order drops out of the
  results. The full catalog is no longer listed.
- **Show only the added products.** The middle region lists just the products on
  the order, each with a quantity stepper and a remove control, so the order's
  contents are legible at a glance with little scrolling.
- **Pin the optional message at the bottom.** The message field moves into a fixed
  region between the scrolling list and the action buttons, so it stays visible
  regardless of how far the list is scrolled. (The spec already required this; the
  code had drifted to a scrolling message.)

This also reconciles pre-existing spec drift: the spec still described a removed
**Cargar contenido** step that revealed the full catalog. The code long since
showed entry up-front with an **Agregar pedido** button; the requirements are
updated to match, now around search-based entry.

## Capabilities

### Modified Capabilities

- `order-create-presentation`: order contents are entered by searching and adding
  products (only added products are shown, not the full catalog); the three-region
  layout's middle region is the added-products list; the obsolete Cargar-contenido
  framing is removed.

## Impact

- **Frontend**: new `ProductCombobox` (type-ahead add) and `SelectedItems` (added
  rows with stepper + remove); `Modal` gains a pinned `belowBody` region; the
  message textarea moves into it. `CreateOrderModal` wires client picker + product
  search into the pinned top region, added items into the body, message into the
  bottom region. `ItemQuantityFields` is unchanged and still used by the edit-items
  and stock dialogs.
- **Backend / contract**: none. The submit still posts the same
  `{ clientId, items, message }`; items come from the same quantity map.
