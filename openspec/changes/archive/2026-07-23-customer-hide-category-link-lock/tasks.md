## 1. Hide production category on the customer view

- [x] 1.1 `SelectedItems`: add `showCategory` prop (default true); render the salado/dulce pill only when true
- [x] 1.2 Customer `OrderForm`: pass `showCategory={false}`

## 2. Generar link: lock client + inline copy

- [x] 2.1 `GenerateLinkModal`: keep `ClientCombobox` mounted and disabled once a result exists; render the link in a `.link-card` with an inline copy icon button (check-icon feedback on copy); footer becomes just Listo
- [x] 2.2 `globals.css`: `.link-row` (url + copy side by side) and `.copy-btn` styles

## 3. Verification

- [x] 3.1 Typecheck the frontend
- [x] 3.2 Drive the customer view (no salado/dulce pills) and the Generar link modal (client locked after generate, link card, inline copy toggles to copied)
- [x] 3.3 `openspec validate customer-hide-category-link-lock --strict`
