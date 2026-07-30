## 1. Shared components

- [x] 1.1 `ProductCombobox`: add a `dropUp` prop (default off → downward); back-office `ProductPicker` opts in
- [x] 1.2 `SelectedItems`: add an `emptyText` prop (the direction to the search differs by surface)

## 2. Customer order form

- [x] 2.1 `OrderForm`: rewire onto `ProductCombobox` (top, downward) + `SelectedItems` (added-only); add `addProduct` / remove / just-added highlight; keep summary, confirm, WhatsApp, and outcome states
- [x] 2.2 Remove `QuantityStepper`
- [x] 2.3 `globals.css`: scope new styles to `.customer-order` / `.order-search` — search input, branded list card, 44×44 remove, visible focus, scroll margin clearing the sticky action bar
- [x] 2.4 Update the intake Purpose prose (no longer "stepper-based")

## 3. Verification

- [x] 3.1 Typecheck the frontend
- [x] 3.2 Drive the customer page (valid token) at 390px and desktop: empty, add two by search, dropdown, confirm gating; verify constrained column
- [x] 3.3 `openspec validate customer-add-by-search --strict`
