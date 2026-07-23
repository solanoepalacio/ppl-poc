## 1. Replace the stepper with a typed field

- [x] 1.1 `SelectedItems`: remove the −/+ buttons; render the quantity as a bordered `.qty-input` (keep select-all-on-focus, integer coercion, min 1); keep the remove control
- [x] 1.2 `globals.css`: remove `.item-stepper` / `.step-btn` / `.step-value`; add `.item-qty` + `.qty-input`

## 2. Verification

- [x] 2.1 Typecheck the frontend
- [x] 2.2 Drive the dialog: add a product and type 200 directly into the field
- [x] 2.3 `openspec validate typed-backoffice-quantities --strict`
