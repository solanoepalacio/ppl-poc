## Why

The numeric quantity fields in the order flows are awkward to edit. Because each field is a controlled `type="number"` input that keeps the previous value, focusing it places the caret next to the existing digits instead of selecting them — so a manager who wants to change `10` to `5` ends up with `105` (or `510`), and clicking beside a `0` lets stray values like `010` be typed. The expected behavior is the common spreadsheet/stepper convention: focusing a numeric field selects its whole value so the next keystroke replaces it.

## What Changes

- When a numeric quantity field receives focus — by click, tab, or programmatic focus — its full current value is selected, so the next keystroke replaces the value rather than appending to it.
- A click anywhere inside the field (not just a tab-in) results in the whole value being selected, regardless of where in the field the click lands.
- This applies to every numeric quantity field across the app: the back-office order-creation modal and edit-items form (`ItemQuantityFields`) and the customer-facing stepper (`QuantityStepper`).
- Existing value clamping/parsing (`min` 0, integer flooring, drop-zeros-on-submit) is unchanged; only the focus/selection interaction is added.

## Capabilities

### New Capabilities
- `numeric-input-presentation`: How numeric quantity input fields behave on focus and during editing — full-value selection on focus and replace-on-type — across all surfaces that present them.

### Modified Capabilities
<!-- None. The select-on-focus behavior is a cross-cutting presentation interaction captured as a single new capability rather than duplicated into order-create-presentation and order-intake-presentation. -->

## Impact

- Frontend components: `packages/frontend/src/app/(backoffice)/orders/ItemQuantityFields.tsx` (used by `CreateOrderModal` and `OrderActions`) and `packages/frontend/src/app/order/[token]/QuantityStepper.tsx`.
- No API, datastore, or backend changes. Presentation/interaction only.
