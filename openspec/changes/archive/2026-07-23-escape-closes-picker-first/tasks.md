## 1. Escape handling

- [x] 1.1 `ProductCombobox`: on Escape, when the dropdown is open, `preventDefault` + `stopPropagation` and close only the dropdown; otherwise let it bubble
- [x] 1.2 `ClientCombobox`: same Escape handling

## 2. Verification

- [x] 2.1 Typecheck the frontend
- [x] 2.2 Drive both fields: Escape with dropdown open closes the dropdown and keeps the modal; a second Escape closes the modal
- [x] 2.3 `openspec validate escape-closes-picker-first --strict`
