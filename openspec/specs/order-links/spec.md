# order-links Specification

## Purpose

Defines how the bakery manager generates tokenized order links bound to a selected client, and the lifecycle of those tokens: validity scoped to the order's production bloque, validation to resolve the bound client, and single-use semantics tied to whether the link has been consumed.
## Requirements
### Requirement: Order tokens are single-use
Each token SHALL be usable to act on its order at most once. A token MUST be treated as valid only while its order has not yet been consumed; once the customer has confirmed the order, the token MUST be treated as invalid.

#### Scenario: Token whose order has not been consumed
- **WHEN** a token is validated and its order has not yet been consumed
- **THEN** the system treats the token as valid

#### Scenario: Token whose order has already been consumed
- **WHEN** a token is validated and its order has already been consumed
- **THEN** the system treats the token as invalid

### Requirement: Manager generates an order link for a client
The system SHALL allow the bakery manager, from the back office, to generate an order link by selecting a client from the directory. The system SHALL create a unique token bound to an order for that client in the currently open bloque, create the corresponding order, and return a custom URL that embeds the token together with the sequence number of the bloque the link is valid for.

#### Scenario: Generate a link for a selected client
- **WHEN** the manager selects a client in the back office and generates a link
- **THEN** the system creates a unique token bound to an order for that client in the open bloque
- **AND** creates an order associated with that client
- **AND** returns a custom URL containing the token, and the sequence number of the bloque the link is valid for, that the manager can share over WhatsApp

#### Scenario: Client is missing or unknown
- **WHEN** the manager submits a link request without a valid, active client
- **THEN** the system rejects the request and does not generate a token

### Requirement: Token validation resolves the bound client
The system SHALL validate a presented token and, when valid, resolve the client the order is for. A token is valid only while its order has not yet been consumed and its bloque is `open`. Invalid tokens (unknown, malformed, single-use spent, or belonging to a closed bloque) MUST NOT resolve to any client.

#### Scenario: Valid token resolves to its client
- **WHEN** a valid token — unconsumed and in an open bloque — is validated
- **THEN** the system returns the client the order is for

#### Scenario: Invalid token is rejected
- **WHEN** an unknown, malformed, already-used, or closed-bloque token is validated
- **THEN** the system reports the token as invalid and resolves no client

### Requirement: Order token validity is scoped to its bloque
The system SHALL treat a generated token as valid only while the production bloque its
order belongs to is `open`. There is no time-based expiry. When a bloque is closed, every
token in it MUST be treated as invalid purely because its bloque is `closed`; closing writes
no order state.

#### Scenario: Token in an open bloque
- **WHEN** a token is presented while its order's bloque is `open`
- **THEN** the system treats the token as valid

#### Scenario: Token in a closed bloque
- **WHEN** a token is presented while its order's bloque is `closed`
- **THEN** the system treats the token as invalid
- **AND** the system wrote no order state when the bloque was closed

