## MODIFIED Requirements

### Requirement: Customer-facing copy is in Spanish
All text the customer reads on the order page SHALL be written in Spanish, including the title, the primary and secondary action labels, the busy/submitting state, and the confirmation, WhatsApp-fallback, and invalid-link messages.

#### Scenario: Entry screen text is Spanish
- **WHEN** the order entry screen is rendered
- **THEN** the title and action labels are presented in Spanish

#### Scenario: Outcome and error text is Spanish
- **WHEN** any of the order-received, continue-on-WhatsApp, or invalid-link states is rendered
- **THEN** its heading and body message are presented in Spanish

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
