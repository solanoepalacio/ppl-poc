# order-intake-presentation Specification

## Purpose

Defines the presentation layer of the customer-facing order page: how it carries the Pannico brand identity across all states, presents Spanish-language copy, lays out responsively for mobile-first use, lets the customer add products by search into an added-only list with typed quantities and an always-reachable selection summary and primary action, and renders branded, accessible confirmation, fallback, and error states. These requirements govern presentation only and do not change underlying order behavior.
## Requirements
### Requirement: Customer page carries the Pannico brand identity
The customer order page SHALL present the Pannico brand identity on every state it can render (order entry, order-received confirmation, continue-on-WhatsApp, and invalid/expired link). The page MUST display the Pannico wordmark/logo and apply the brand palette (slate blue `#365566`, white, and golden-amber `#D39B23` accent). Brand typography SHALL use a condensed display style for headings/wordmark and a legible sans for body text.

#### Scenario: Wordmark is present on the entry screen
- **WHEN** a customer opens the order page with a valid token
- **THEN** the Pannico wordmark/logo is visible
- **AND** the page uses the brand palette and typography

#### Scenario: Brand persists across outcome and error screens
- **WHEN** the page renders the order-received, continue-on-WhatsApp, or invalid-link state
- **THEN** the Pannico wordmark/logo and brand palette are still present, consistent with the entry screen

### Requirement: Customer-facing copy is in Spanish
All text the customer reads on the order page SHALL be written in Spanish, including the title, the primary and secondary action labels, the busy/submitting state, and the confirmation, WhatsApp-fallback, and invalid-link messages.

#### Scenario: Entry screen text is Spanish
- **WHEN** the order entry screen is rendered
- **THEN** the title and action labels are presented in Spanish

#### Scenario: Outcome and error text is Spanish
- **WHEN** any of the order-received, continue-on-WhatsApp, or invalid-link states is rendered
- **THEN** its heading and body message are presented in Spanish

### Requirement: Layout is mobile-first and responsive
The order page SHALL be designed for one-handed phone use as the primary case and MUST remain usable and well-proportioned on larger viewports. Content SHALL be constrained to a comfortable reading column rather than stretching full-width on wide screens.

#### Scenario: Usable on a narrow phone viewport
- **WHEN** the page is viewed at a typical mobile width (e.g. 360px)
- **THEN** all content, controls, and actions are visible and operable without horizontal scrolling

#### Scenario: Constrained column on a wide viewport
- **WHEN** the page is viewed on a wide desktop viewport
- **THEN** the content is constrained to a centered reading column rather than spanning the full width

### Requirement: A running selection summary and primary action are always reachable
The order entry screen SHALL show a running summary of how many products are currently selected and SHALL keep the primary "confirm order" action reachable without requiring the customer to scroll the order to reach it. The primary action MUST be disabled while no products are selected and while a submission is in progress, and the WhatsApp fallback control SHALL be presented as a secondary, lower-emphasis action.

#### Scenario: Summary reflects current selection
- **WHEN** the customer has added one or more products
- **THEN** the running summary reflects the number of selected products

#### Scenario: Primary action reachable without scrolling the list
- **WHEN** the added-products list is long enough to require scrolling
- **THEN** the primary confirm action remains reachable (via a pinned action bar) without scrolling the list

#### Scenario: Primary action disabled when nothing is selected
- **WHEN** no product has been added to the order
- **THEN** the confirm action is disabled

#### Scenario: Actions disabled during submission
- **WHEN** a confirm or WhatsApp action is in progress
- **THEN** both actions are disabled and the primary action shows a busy/submitting label

### Requirement: Confirmation and fallback states are branded and reassuring
After a successful order confirmation the page SHALL display a branded, prominent success state confirming the order was received; after the WhatsApp fallback is chosen the page SHALL display a branded state directing the customer to continue over WhatsApp. The invalid-link state SHALL likewise be branded and explain that a fresh link is needed. The page SHALL reach the invalid-link state both when it is opened with an already-invalid token and when an in-progress confirmation or WhatsApp action is rejected because the link is no longer valid — for example, because the order's bloque was closed while the customer was filling out the form. None of these states changes order behavior; they re-present the existing outcomes.

#### Scenario: Branded success state after confirmation
- **WHEN** the order is confirmed successfully
- **THEN** the page shows a branded success state confirming the order was received and indicating no further steps are needed

#### Scenario: Branded WhatsApp fallback state
- **WHEN** the customer chooses the WhatsApp fallback
- **THEN** the page shows a branded state directing them to continue the order over WhatsApp

#### Scenario: Branded invalid-link state on load
- **WHEN** the page is opened with an invalid token
- **THEN** it shows a branded state explaining the link is no longer valid and to request a fresh link

#### Scenario: Link becomes invalid while the customer is on the form
- **WHEN** the customer submits their order (or chooses the WhatsApp fallback) but the link is no longer valid — e.g. its bloque was closed after the form was opened but before the action completed
- **THEN** the page transitions to the branded invalid-link state explaining a fresh link is needed
- **AND** does not leave the customer on the form with no feedback

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

### Requirement: Production-facing labels are hidden from the customer
The customer order screen SHALL NOT display product metadata that exists only for the back office's production planning and is irrelevant to placing an order — in particular the salado/dulce (savory/sweet) production-line category label. The customer sees each added product by name and quantity, not by which production line it belongs to.

#### Scenario: No production category label on an added product
- **WHEN** the customer adds a product to the order
- **THEN** the product's row shows its name and quantity
- **AND** it does not show the product's salado/dulce production-line category

