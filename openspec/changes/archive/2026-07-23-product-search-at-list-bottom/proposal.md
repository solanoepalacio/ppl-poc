## Why

The product search sat in the pinned top region, above the added-products list.
Moving it to the bottom of the list — nearer where new rows appear and closer to
the manager's hands — reads better, and freeing the top region lets the list start
higher. The list's column headers ("Producto"/"cant.") added noise without adding
information.

## What Changes

- **Move the product search to the bottom of the added-products list**, pinned so
  it does not scroll; when the list is long it stays fixed at the bottom, rendered
  over the list contents. Its results open upward (the search is at the bottom).
- **Title the list "Productos en el pedido"** in the pinned top region (the search
  no longer carries that label), and **drop the list's column headers**.
- Reworded the search placeholder to "Buscá un producto para agregar…".

## Capabilities

### Modified Capabilities

- `order-create-presentation`: the product search is pinned at the bottom of the
  added-products list (not the top region); the list is titled and has no column
  headers.

## Impact

- **Frontend only.** `ProductCombobox` moves out of the modal's top region into a
  sticky bar at the bottom of the list, opening its results upward; its label
  becomes a section title in the top region. `SelectedItems` drops the header row.
  A scroll margin keeps a just-added row clear of the pinned search bar.
