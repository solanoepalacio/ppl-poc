# order-links Specification

## Purpose

Defines how the bakery manager generates tokenized order links bound to a customer phone number, and the lifecycle of those tokens: short-lived expiry, validation to resolve the bound phone number, and single-use semantics tied to the order status.

## Requirements

### Requirement: Manager generates an order link for a phone number
The system SHALL allow the bakery manager, from the back office, to generate an order link by providing a customer phone number. The system SHALL create a unique token bound to that phone number, create a corresponding order in `pending` status, and return a custom URL that embeds the token.

#### Scenario: Generate a link for a valid phone number
- **WHEN** the manager submits a phone number in the back office
- **THEN** the system creates a unique token bound to that phone number
- **AND** creates a `pending` order associated with that phone number
- **AND** returns a custom URL containing the token that the manager can share over WhatsApp

#### Scenario: Phone number is missing or malformed
- **WHEN** the manager submits a request without a valid phone number
- **THEN** the system rejects the request and does not generate a token

### Requirement: Order tokens are short-lived
The system SHALL assign each generated token an expiry. After the expiry time, the token MUST be treated as invalid. When a token expires while its order is still `pending`, the system SHALL transition that order to `ignored`.

#### Scenario: Token within its validity window
- **WHEN** a token is presented before its expiry time
- **THEN** the system treats the token as valid

#### Scenario: Token past its expiry
- **WHEN** a token is presented after its expiry time
- **THEN** the system treats the token as invalid

#### Scenario: Token expires before the customer acts
- **WHEN** a token expires while its order is still `pending`
- **THEN** the system transitions that order to `ignored`

### Requirement: Token validation resolves the bound phone number
The system SHALL validate a presented token and, when valid and unexpired, resolve the phone number bound to it. Invalid or expired tokens MUST NOT resolve to any phone number.

#### Scenario: Valid token resolves to its customer
- **WHEN** a valid, unexpired token is validated
- **THEN** the system returns the phone number bound to that token

#### Scenario: Invalid or expired token is rejected
- **WHEN** an unknown, malformed, or expired token is validated
- **THEN** the system reports the token as invalid and resolves no phone number

### Requirement: Order tokens are single-use
Each token SHALL be usable to act on its order at most once. A token MUST be treated as valid only while its order is still `pending`; once the order has become `issued`, `denied`, or `ignored`, the token MUST be treated as invalid.

#### Scenario: Token whose order is still pending
- **WHEN** a token is validated and its order is still `pending`
- **THEN** the system treats the token as valid

#### Scenario: Token whose order has already been acted on
- **WHEN** a token is validated and its order is `issued`, `denied`, or `ignored`
- **THEN** the system treats the token as invalid
