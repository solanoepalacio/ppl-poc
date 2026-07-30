## 1. Move the search + retitle

- [x] 1.1 `CreateOrderModal`: move `ProductCombobox` out of the top region into a sticky `.product-add-bar` at the bottom of the list; add a "Productos en el pedido" section label to the top region; wrap the form body so the bar sits at the region bottom when the list is short
- [x] 1.2 `ProductCombobox`: drop the visible label (use `aria-label`), reword the placeholder, open the results upward (`combobox-up`)
- [x] 1.3 `SelectedItems`: remove the "Producto"/"cant." header row; update the empty-state copy

## 2. Styling

- [x] 2.1 `globals.css`: `.order-form-body` fills the region so the bar pins to the bottom; `.product-add-bar` sticky bar; `.combobox-up` dropup; `.modal-section-label`; extend the combobox input styling to the bar; `scroll-margin-bottom` so an added row clears the bar

## 3. Verification

- [x] 3.1 Typecheck the frontend
- [x] 3.2 Drive the dialog: empty (bar at bottom), long list (bar floats over, added row clears it), dropdown opens upward
- [x] 3.3 `openspec validate product-search-at-list-bottom --strict`
