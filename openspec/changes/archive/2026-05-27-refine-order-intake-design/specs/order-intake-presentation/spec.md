## ADDED Requirements

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
All text the customer reads on the order page SHALL be written in Spanish, including the title and subtitle, the primary and secondary action labels, the busy/submitting state, and the confirmation, WhatsApp-fallback, and invalid-link messages.

#### Scenario: Entry screen text is Spanish
- **WHEN** the order entry screen is rendered
- **THEN** the title, subtitle, and action labels are presented in Spanish

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

### Requirement: Quantities are chosen with stepper controls
Each catalog product SHALL offer a quantity control built from a decrement button, the current quantity value, and an increment button, with a minimum quantity of zero. The decrement control MUST NOT reduce the quantity below zero. The controls SHALL be sized for comfortable touch use.

#### Scenario: Increment raises the quantity
- **WHEN** the customer taps the increment control for a product
- **THEN** that product's quantity increases by one

#### Scenario: Decrement lowers the quantity but not below zero
- **WHEN** the customer taps the decrement control for a product at quantity zero
- **THEN** the quantity remains zero

#### Scenario: Selected products are visually distinguished
- **WHEN** a product has a quantity greater than zero
- **THEN** its row is visually distinguished (e.g. amber accent) from unselected products

### Requirement: A running selection summary and primary action are always reachable
The order entry screen SHALL show a running summary of how many products are currently selected and SHALL keep the primary "confirm order" action reachable without requiring the customer to scroll past the full catalog. The primary action MUST be disabled while no products are selected and while a submission is in progress, and the WhatsApp fallback control SHALL be presented as a secondary, lower-emphasis action.

#### Scenario: Summary reflects current selection
- **WHEN** the customer has set one or more products to a quantity greater than zero
- **THEN** the running summary reflects the number of selected products

#### Scenario: Primary action reachable without scrolling the whole list
- **WHEN** the catalog is long enough to require scrolling
- **THEN** the primary confirm action remains reachable (e.g. via a pinned action bar) without scrolling to the very bottom of the list

#### Scenario: Primary action disabled when nothing is selected
- **WHEN** no product has a quantity greater than zero
- **THEN** the confirm action is disabled and a hint indicates at least one product must be added

#### Scenario: Actions disabled during submission
- **WHEN** a confirm or WhatsApp action is in progress
- **THEN** both actions are disabled and the primary action shows a busy/submitting label

### Requirement: Confirmation and fallback states are branded and reassuring
After a successful order confirmation the page SHALL display a branded, prominent success state confirming the order was received; after the WhatsApp fallback is chosen the page SHALL display a branded state directing the customer to continue over WhatsApp. The invalid/expired-link state SHALL likewise be branded and explain that a fresh link is needed. None of these states changes order behavior; they re-present the existing outcomes.

#### Scenario: Branded success state after confirmation
- **WHEN** the order is confirmed successfully
- **THEN** the page shows a branded success state confirming the order was received and indicating no further steps are needed

#### Scenario: Branded WhatsApp fallback state
- **WHEN** the customer chooses the WhatsApp fallback
- **THEN** the page shows a branded state directing them to continue the order over WhatsApp

#### Scenario: Branded invalid-link state
- **WHEN** the page is opened with an invalid or expired token
- **THEN** it shows a branded state explaining the link is no longer valid and to request a fresh link

### Requirement: Controls are accessible and touch-friendly
Interactive controls on the order page SHALL meet baseline accessibility and touch-usability expectations: every control MUST have an accessible name, interactive elements MUST have a visible keyboard focus indicator, touch targets SHALL be at least 44×44 CSS pixels, and text and essential UI MUST meet WCAG AA contrast against their background. Submission errors SHALL be conveyed as text (not by color alone).

#### Scenario: Stepper controls have accessible names
- **WHEN** a screen reader inspects a product's quantity controls
- **THEN** each control exposes an accessible name identifying its product and action

#### Scenario: Keyboard focus is visible
- **WHEN** the customer navigates the page with a keyboard
- **THEN** the currently focused control shows a visible focus indicator

#### Scenario: Errors are conveyed textually
- **WHEN** a submission fails
- **THEN** an error message is shown as text in addition to any color treatment
