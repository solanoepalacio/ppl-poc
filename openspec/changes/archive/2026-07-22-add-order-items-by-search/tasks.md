## 1. Modal frame

- [x] 1.1 `Modal.tsx`: add an optional `belowBody` pinned region between the scrolling body and the footer
- [x] 1.2 `globals.css`: `.modal-below` pinned region; stack the two pickers in `.modal-above` (flex column + gap)

## 2. Product search + added items

- [x] 2.1 New `ProductCombobox.tsx`: type-ahead over the catalog; `onAdd(productId)`; excludes already-added; shows category tag; clears + refocuses to add the next
- [x] 2.2 New `SelectedItems.tsx`: rows for added products only (qty > 0), each with a stepper (min 1) and a remove control; empty state when none added
- [x] 2.3 `globals.css`: option layout (name + tag), `.item-remove` button, `.items-empty` state

## 3. Wire the dialog

- [x] 3.1 `CreateOrderModal.tsx`: client picker + product search in `aboveBody`; `SelectedItems` in the body; message in `belowBody`; `addProduct` / `removeProduct` on the quantity map
- [x] 3.2 Confirm submit still posts the same `{ clientId, items, message }` via `itemsFromQuantities`

## 4. Verification

- [x] 4.1 Typecheck the frontend
- [x] 4.2 Drive the dialog: empty state, add two products by search, message pinned at bottom
- [x] 4.3 `openspec validate add-order-items-by-search --strict`
