## Why

The back-office order dialogs were reworked to add products by search (showing
only the products already added, with a typed quantity field and a remove
control) instead of scrolling the full catalog with −/+ steppers. The customer
order page (`/order/<token>`) still used the old pattern: the full catalog with a
tap stepper per row. Bringing it to the same UX keeps the two surfaces consistent
and carries over the same benefits — less scrolling, a clear at-a-glance order,
and fast entry of large quantities.

## What Changes

- **Add products by search on the customer page.** A product search (top of the
  page, results open downward) lets the customer add products one at a time; the
  page shows only the products already added — each with a typed quantity field
  and a remove control — instead of the whole catalog. Already-added products drop
  out of the results.
- **Typed quantities, no stepper.** The −/+ stepper is replaced by a typed field
  (still selecting its whole value on focus). The sticky "Confirmar pedido" bar,
  the selection summary, the WhatsApp fallback, and all outcome states are
  unchanged.

The customer page reuses the same `ProductCombobox` / `SelectedItems` components
as the back office, with styling scoped to the customer page (branded card,
44×44 touch targets, visible keyboard focus).

## Capabilities

### Modified Capabilities

- `order-intake-presentation`: quantities are entered by adding products from a
  search into an added-only list with typed quantity fields, replacing the
  full-catalog stepper list.
- `numeric-input-presentation`: the customer-facing quantity field is now a typed
  field (like the back office), not a stepper; it still selects on focus.

## Impact

- **Frontend only.** `OrderForm` rewired onto `ProductCombobox` + `SelectedItems`
  (add / remove / just-added highlight); `ProductCombobox` gains a `dropUp` prop
  (customer opens downward, back office upward); `SelectedItems` gains an
  `emptyText` prop. `QuantityStepper` is removed. New CSS is scoped to
  `.customer-order` / `.order-search`, so the back office is unaffected.
- **Behavior / contract**: none. The customer still submits the same
  `{ productId, quantity }` items via `confirmOrder`.
