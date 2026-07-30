## ADDED Requirements

### Requirement: Back-office quantity fields are typed, not stepped
On the back office's product lists — order creation, edit items, and stock — each product's quantity SHALL be entered through a typed numeric field, not through increment/decrement (+/−) stepper buttons. Back-office quantities are frequently large, so typing the value directly is faster than repeated stepping. The field SHALL read as an editable input, and removing a product from the list SHALL be a separate control, distinct from the quantity field. This composes with *Numeric quantity fields select their whole value on focus*: the typed field still selects its whole value on focus. The customer-facing quantity stepper is unaffected.

#### Scenario: The quantity is a typed field with no stepper
- **WHEN** a product is shown on a back-office product list
- **THEN** its quantity is presented as an editable numeric field the manager can type into
- **AND** there are no increment/decrement stepper buttons around it

#### Scenario: A large quantity is entered by typing
- **WHEN** the manager sets a product's quantity to 200
- **THEN** they type 200 into the field directly, rather than stepping the value up 200 times
