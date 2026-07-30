## 1. Catalog list component

- [x] 1.1 Create `packages/frontend/src/app/order/[token]/CatalogList.tsx`:
  renders every product as a row, sorted alphabetically by name
  (`localeCompare` with `es`, memoized), each with the same typed quantity
  field as `SelectedItems` (reusing `useSelectAllOnFocus`, the `.item-fields` /
  `.item-field` / `.qty-input` classes, integer coercion, and Enter-to-blur).
- [x] 1.2 Accept a `filter` string prop and render only rows whose name matches
  it via `normalizeForSearch` from `@pannico/shared` (accent/case-insensitive
  substring). Filtering only narrows what is rendered — it never writes to the
  quantities state.
- [x] 1.3 Render the clear-quantity control (same ✕ icon/position as
  `SelectedItems`, `aria-label="Vaciar cantidad de {name}"`) only on rows whose
  quantity is greater than zero; it sets that product's quantity to zero.
- [x] 1.4 When the filter matches no product, render a "Sin resultados" message
  in place of the list rather than an empty region.

## 2. Wire it into the order form

- [x] 2.1 `OrderForm.tsx`: replace `ProductCombobox` + `SelectedItems` with a
  plain filter `<input type="text">` in the existing `.order-search` slot plus
  `CatalogList` in `.customer-list`. Keep the `quantities` state, `items`
  derivation, submit/WhatsApp handlers, error handling, summary, and action bar
  as they are.
- [x] 2.2 Add the "Limpiar" clear-filter button beside the filter input,
  disabled while the filter is already empty, resetting the filter text.
- [x] 2.3 Drop the now-unused `justAdded` / `highlight` reveal state and the
  `addProduct` handler from `OrderForm` (there is no add step any more). Leave
  `ProductCombobox` and `SelectedItems` themselves untouched — the back office
  still uses both.

## 3. Mobile styling

- [x] 3.1 `globals.css`: style the filter row (input + clear button) inside
  `.order-search` so the two sit on one line with the input flexing; keep the
  input at `font-size: 16px` (stops iOS zoom-on-focus) and both controls at a
  44px minimum touch target.
- [x] 3.2 Verify the full-catalog list scrolls within `.customer-list` only,
  with the brand header, title, filter row, and action bar all staying pinned
  at a 360px-wide viewport.

## 4. Verification

- [x] 4.1 Typecheck the frontend (`yarn workspace @pannico/frontend run lint`).
- [x] 4.2 Drive it on a fresh order link at a 360px viewport: confirm every
  product is listed alphabetically on load, type quantities on a few rows,
  and confirm the summary count and the confirmed order's items match.
- [x] 4.3 Drive the filter: type a partial name (including one with an accent
  typed unaccented), confirm rows narrow; set a quantity, filter it out of
  view, confirm the summary still counts it and it lands in the submitted
  order; use "Limpiar" and confirm the full list returns with quantities
  intact.
- [x] 4.4 `openspec validate customer-full-catalog-list --strict`, then dry-run
  the archive against a throwaway copy of `openspec/` to confirm the delta
  applies cleanly before it is ever archived for real.
