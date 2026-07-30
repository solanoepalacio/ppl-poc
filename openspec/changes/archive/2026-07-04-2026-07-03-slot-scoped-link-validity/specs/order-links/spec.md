## RENAMED Requirements

- FROM: `### Requirement: Order tokens are short-lived`
- TO: `### Requirement: Order token validity is scoped to its bloque`

## MODIFIED Requirements

### Requirement: Order token validity is scoped to its bloque
The system SHALL treat a generated token as valid only while the production bloque its
order belongs to is `open`. There is no time-based expiry. When a bloque is closed, every
token in it whose order is still `pending` MUST be treated as invalid, and the system SHALL
transition each such order to `ignored`.

#### Scenario: Token in an open bloque
- **WHEN** a token is presented while its order's bloque is `open`
- **THEN** the system treats the token as valid

#### Scenario: Token in a closed bloque
- **WHEN** a token is presented while its order's bloque is `closed`
- **THEN** the system treats the token as invalid

#### Scenario: Bloque closes before the customer acts
- **WHEN** a bloque is closed while one of its orders is still `pending`
- **THEN** the system transitions that order to `ignored`
- **AND** treats its token as invalid

### Requirement: Manager generates an order link for a client
The system SHALL allow the bakery manager, from the back office, to generate an order link by selecting a client from the directory. The system SHALL create a unique token bound to an order for that client in the currently open bloque, create the corresponding order in `pending` status, and return a custom URL that embeds the token together with the sequence number of the bloque the link is valid for.

#### Scenario: Generate a link for a selected client
- **WHEN** the manager selects a client in the back office and generates a link
- **THEN** the system creates a unique token bound to an order for that client in the open bloque
- **AND** creates a `pending` order associated with that client
- **AND** returns a custom URL containing the token, and the sequence number of the bloque the link is valid for, that the manager can share over WhatsApp

#### Scenario: Client is missing or unknown
- **WHEN** the manager submits a link request without a valid, active client
- **THEN** the system rejects the request and does not generate a token

### Requirement: Token validation resolves the bound client
The system SHALL validate a presented token and, when valid, resolve the client the order is for. A token is valid only while its order is `pending` and its bloque is `open`. Invalid tokens (unknown, malformed, single-use spent, or belonging to a closed bloque) MUST NOT resolve to any client.

#### Scenario: Valid token resolves to its client
- **WHEN** a valid token — pending and in an open bloque — is validated
- **THEN** the system returns the client the order is for

#### Scenario: Invalid token is rejected
- **WHEN** an unknown, malformed, already-used, or closed-bloque token is validated
- **THEN** the system reports the token as invalid and resolves no client
