# order-intake Specification

## Purpose

Defines the customer-facing order form: how it is gated by a valid token, kept frictionless (no login, no prices, no payment), how customers submit a structured order from a predefined catalog, and the WhatsApp fallback.
## Requirements
### Requirement: Order form is reachable only with a valid token
The system SHALL render the customer order form when the tokenized URL carries a valid, unexpired token. When the token is invalid or expired, the system MUST NOT render the form and SHALL instead show an error message.

#### Scenario: Customer opens a valid link
- **WHEN** a customer opens the custom URL with a valid, unexpired token
- **THEN** the system renders the minimal order form

#### Scenario: Customer opens an invalid or expired link
- **WHEN** a customer opens a URL whose token is invalid or expired
- **THEN** the system does not render the order form
- **AND** shows a message explaining the link is no longer valid

### Requirement: Order form is frictionless
The customer order form SHALL NOT require login, SHALL NOT display prices, and SHALL NOT include any payment step.

#### Scenario: Form contains no friction elements
- **WHEN** the order form is rendered for a valid token
- **THEN** the form presents no login, no prices, and no payment controls

### Requirement: Customer submits a structured order
The system SHALL present a predefined catalog of products and let the customer choose one or more of those products, each with a quantity, then submit the order. The system MUST reject any item that is not in the predefined catalog. On submission with a valid token, the system MUST record the chosen items on the order bound to the token, consume the link so it can no longer be used, and confirm the order immediately without any payment step.

#### Scenario: Customer submits an order
- **WHEN** a customer with a valid token chooses one or more catalog products with quantities and submits the form
- **THEN** the system records the chosen items on the order bound to the token
- **AND** consumes the link so it can no longer be used
- **AND** displays an immediate confirmation that the order was received

#### Scenario: Customer submits an empty order
- **WHEN** a customer submits the form with no items
- **THEN** the system rejects the submission and the link remains usable

#### Scenario: Submission references a product outside the catalog
- **WHEN** a submission includes an item that is not in the predefined catalog
- **THEN** the system rejects the submission and the link remains usable

### Requirement: Customer can fall back to WhatsApp
The order form SHALL include a control that lets the customer indicate they prefer to continue the order over WhatsApp instead of using the form.

#### Scenario: Customer chooses to continue on WhatsApp
- **WHEN** the customer activates the "continue on WhatsApp" control
- **THEN** the system consumes the link bound to the token so it can no longer be used
- **AND** records no order items

