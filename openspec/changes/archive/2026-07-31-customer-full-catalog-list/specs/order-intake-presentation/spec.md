## REMOVED Requirements

### Requirement: Products are added by search and shown as an added-only list
**Reason**: The add-by-search interaction is replaced wholesale by an
always-visible full-catalog list. Its scenarios describe a flow that no longer
exists — picking a product from search results, showing only added products,
hiding already-added products from those results — rather than behavior that
merely changed shape.
**Migration**: See the new *Every catalog product is listed with a typed
quantity* requirement (the list and quantity behavior that replaces it) and
*Product list can be filtered by name* (the filter that replaces the search).
Quantity entry itself is unchanged: still typed, never stepped.

## ADDED Requirements

### Requirement: Every catalog product is listed with a typed quantity
The order entry screen SHALL show every catalog product as a row on load,
sorted alphabetically by name, each with an editable numeric quantity field.
A product's quantity of zero (including empty) means it is not part of the
order; any positive quantity means it is included. Quantities SHALL be
entered by typing into the field; there SHALL NOT be increment/decrement
stepper buttons. A product whose quantity is greater than zero SHALL show a
control to clear its quantity back to zero; a product still at zero SHALL NOT
show that control, since there is nothing to clear.

#### Scenario: Every product is listed on load
- **WHEN** the order entry screen is shown
- **THEN** it lists every catalog product, sorted alphabetically by name
- **AND** each row shows an editable quantity field

#### Scenario: Setting a quantity includes the product in the order
- **WHEN** the customer types a positive quantity into a product's field
- **THEN** that product becomes part of the order

#### Scenario: Quantity is typed, not stepped
- **WHEN** the customer sets a product's quantity
- **THEN** they type the value into its field
- **AND** there are no increment/decrement stepper buttons

#### Scenario: A selected product can be cleared
- **WHEN** the customer activates the clear control on a product with a
  positive quantity
- **THEN** that product's quantity returns to zero
- **AND** it is no longer part of the order

#### Scenario: Zero-quantity products show no clear control
- **WHEN** a product's quantity is zero
- **THEN** it shows no clear control

### Requirement: Product list can be filtered by name
The order entry screen SHALL present a text filter, pinned above the product
list, that narrows the visible rows to products whose name matches the
filter text (accent/case-insensitive substring match). Filtering SHALL only
change which rows are rendered; it MUST NOT alter any product's quantity,
including a product whose row is currently hidden by the filter. The screen
SHALL present a control that clears the filter text in one action, restoring
every product to view.

#### Scenario: Filtering narrows the visible list
- **WHEN** the customer types text into the filter
- **THEN** only products whose name matches that text (accent/case-insensitive)
  are shown

#### Scenario: A hidden product keeps its quantity
- **WHEN** a product with a positive quantity is hidden by the current filter
- **THEN** its quantity remains unchanged
- **AND** it still counts toward the order

#### Scenario: Clearing the filter restores the full list
- **WHEN** the customer activates the clear-filter control
- **THEN** the filter text is reset
- **AND** every product is shown again

#### Scenario: No matches shows a message, not an empty screen
- **WHEN** the filter text matches no product
- **THEN** the screen shows a message indicating no results, rather than an
  empty list with no explanation
