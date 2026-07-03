# order-links Specification

## Purpose

Defines how the bakery manager generates tokenized order links bound to a selected client, and the lifecycle of those tokens: short-lived expiry, validation to resolve the bound client, and single-use semantics tied to the order status.
## Requirements
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

### Requirement: Order tokens are single-use
Each token SHALL be usable to act on its order at most once. A token MUST be treated as valid only while its order is still `pending`; once the order has become `issued`, `denied`, or `ignored`, the token MUST be treated as invalid.

#### Scenario: Token whose order is still pending
- **WHEN** a token is validated and its order is still `pending`
- **THEN** the system treats the token as valid

#### Scenario: Token whose order has already been acted on
- **WHEN** a token is validated and its order is `issued`, `denied`, or `ignored`
- **THEN** the system treats the token as invalid

### Requirement: Manager generates an order link for a client
The system SHALL allow the bakery manager, from the back office, to generate an order link by selecting a client from the directory. The system SHALL create a unique token bound to an order for that client, create the corresponding order in `pending` status, and return a custom URL that embeds the token.

#### Scenario: Generate a link for a selected client
- **WHEN** the manager selects a client in the back office and generates a link
- **THEN** the system creates a unique token bound to an order for that client
- **AND** creates a `pending` order associated with that client
- **AND** returns a custom URL containing the token that the manager can share over WhatsApp

#### Scenario: Client is missing or unknown
- **WHEN** the manager submits a link request without a valid, active client
- **THEN** the system rejects the request and does not generate a token

### Requirement: Token validation resolves the bound client
The system SHALL validate a presented token and, when valid and unexpired, resolve the client the order is for. Invalid or expired tokens MUST NOT resolve to any client.

#### Scenario: Valid token resolves to its client
- **WHEN** a valid, unexpired token is validated
- **THEN** the system returns the client the order is for

#### Scenario: Invalid or expired token is rejected
- **WHEN** an unknown, malformed, or expired token is validated
- **THEN** the system reports the token as invalid and resolves no client

