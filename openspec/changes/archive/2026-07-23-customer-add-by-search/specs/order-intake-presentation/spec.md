## REMOVED Requirements

### Requirement: Quantities are chosen with stepper controls
**Reason**: Replaced by *Products are added by search and shown as an added-only list*. The customer page no longer lists the whole catalog with a −/+ stepper per row; products are added one at a time from a search and their quantity is typed.

## ADDED Requirements

### Requirement: Products are added by search and shown as an added-only list
The order entry screen SHALL let the customer add products one at a time through a product search that filters the catalog by name (accent/case-insensitive); picking a result SHALL add that product to the order. The screen SHALL show only the products already added — each with an editable numeric quantity field and a control to remove it — rather than the full catalog. A product already added SHALL NOT appear in the search results. Quantities SHALL be entered by typing into the field; there SHALL NOT be increment/decrement stepper buttons. An added product's quantity is at least one, and removing a product is done with its remove control.

#### Scenario: Adding a product from the search
- **WHEN** the customer types part of a product name and picks a result
- **THEN** that product is added to the order and appears with an editable quantity field

#### Scenario: Only added products are shown
- **WHEN** the order entry screen is shown
- **THEN** it lists only the products already added to the order
- **AND** it does not list the rest of the catalog

#### Scenario: Quantity is typed, not stepped
- **WHEN** the customer sets an added product's quantity
- **THEN** they type the value into its field
- **AND** there are no increment/decrement stepper buttons

#### Scenario: A product can be removed
- **WHEN** the customer activates an added product's remove control
- **THEN** that product is removed from the order

#### Scenario: Already-added products are excluded from the search
- **WHEN** a product is already on the order
- **THEN** it does not appear in the product-search results

## MODIFIED Requirements

### Requirement: Controls are accessible and touch-friendly
Interactive controls on the order page SHALL meet baseline accessibility and touch-usability expectations: every control MUST have an accessible name, interactive elements MUST have a visible keyboard focus indicator, touch targets SHALL be at least 44×44 CSS pixels, and text and essential UI MUST meet WCAG AA contrast against their background. Submission errors SHALL be conveyed as text (not by color alone).

#### Scenario: Quantity and add controls have accessible names
- **WHEN** a screen reader inspects the product search, a product's quantity field, or its remove control
- **THEN** each control exposes an accessible name identifying its purpose and, where applicable, its product

#### Scenario: Keyboard focus is visible
- **WHEN** the customer navigates the page with a keyboard
- **THEN** the currently focused control shows a visible focus indicator

#### Scenario: Errors are conveyed textually
- **WHEN** a submission fails
- **THEN** an error message is shown as text in addition to any color treatment
