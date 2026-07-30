## 1. Feedback on pick

- [x] 1.1 `ProductCombobox`: close the dropdown on pick (drop the refocus that re-opened it)
- [x] 1.2 `CreateOrderModal`: track the just-added product with a bump counter; pass it to `SelectedItems`; clear on reset
- [x] 1.3 `SelectedItems`: on the highlight prop, scroll the matching row into view and flash it; honor `prefers-reduced-motion`
- [x] 1.4 `globals.css`: `item-added-flash` keyframes + `.item-field.is-added`, disabled under reduced motion

## 2. Verification

- [x] 2.1 Typecheck the frontend
- [x] 2.2 Drive the dialog: dropdown closes on pick, added row flashes, an off-screen add scrolls into view
- [x] 2.3 `openspec validate reveal-added-product-feedback --strict`
