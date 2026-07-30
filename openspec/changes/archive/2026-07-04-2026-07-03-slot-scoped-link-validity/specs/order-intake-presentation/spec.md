## MODIFIED Requirements

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
