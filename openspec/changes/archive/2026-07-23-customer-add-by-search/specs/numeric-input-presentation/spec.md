## MODIFIED Requirements

### Requirement: Numeric quantity fields select their whole value on focus
Every numeric quantity input field SHALL select its entire current value when the field receives focus, so that the next character typed replaces the value rather than being inserted into it. This SHALL apply on every focus path — mouse click, keyboard tab, and programmatic focus — and to every surface that presents such a field, including the back-office order-creation modal, the back-office edit-items form, and the customer-facing order form. The field's existing value rules (integer-only quantities) SHALL be unchanged.

#### Scenario: Focusing a field selects its value
- **WHEN** a numeric quantity field holding a non-empty value receives focus
- **THEN** the field's full value is selected

#### Scenario: Typing replaces the previous value
- **WHEN** a numeric quantity field showing `10` is focused and the user types `5`
- **THEN** the field's value becomes `5`, not `105` or `510`

### Requirement: Back-office quantity fields are typed, not stepped
On the back office's product lists — order creation, edit items, and stock — each product's quantity SHALL be entered through a typed numeric field, not through increment/decrement (+/−) stepper buttons. Back-office quantities are frequently large, so typing the value directly is faster than repeated stepping. The field SHALL read as an editable input, and removing a product from the list SHALL be a separate control, distinct from the quantity field. This composes with *Numeric quantity fields select their whole value on focus*: the typed field still selects its whole value on focus. The customer-facing order form uses the same typed quantity field (see the `order-intake-presentation` capability).

#### Scenario: The quantity is a typed field with no stepper
- **WHEN** a product is shown on a back-office product list
- **THEN** its quantity is presented as an editable numeric field the manager can type into
- **AND** there are no increment/decrement stepper buttons around it

#### Scenario: A large quantity is entered by typing
- **WHEN** the manager sets a product's quantity to 200
- **THEN** they type 200 into the field directly, rather than stepping the value up 200 times
