## 1. Status control label

- [x] In `OrderStatusControl.tsx`, replace the `<span class="status-dot status-*">` with a visible `Estado` label rendered before the `<select>` inside `.status-select`
- [x] Keep the select's `aria-label="Estado de la orden"` and the existing `· falló` error text
- [x] Remove the now-unused `.status-dot` rule (and any per-status dot color classes used only by it) from `globals.css`
- [x] Verify the orders view shows `Estado` before the selector and no colored dot

## 2. Order card separator

- [x] Give the `OrderActions` button row a borderless variant so it shows no bottom separator (add a modifier class or drop the global `.row` border for that row)
- [x] Remove the redundant inline `borderBottom` on the header `.row` in `orders/page.tsx`, leaving the global `.row` divider on the header
- [x] Verify each order card shows no separator beneath the Editar artículos / Eliminar buttons while the header divider remains

## 3. Redundant view titles

- [x] Remove the `<h1>Órdenes</h1>` from `orders/page.tsx`
- [x] Remove the `<h1>Producción diaria</h1>` from `production/page.tsx`
- [x] Verify each view renders without a title that repeats the active nav tab

## 4. Production explanatory copy

- [x] Remove the `Artículos a producir el … (órdenes pendientes, emitidas y finalizadas).` paragraph from `production/page.tsx`
- [x] Keep the `Nada que producir el …` empty-state message
- [x] Verify the production view shows the list (or empty state) with no explanatory paragraph above it

## 5. Validation

- [x] Run the frontend lint/build to confirm no unused-variable or CSS regressions
- [x] Manually confirm the customer-facing order page is unaffected
