## RENAMED Requirements

- FROM: `### Requirement: Manager generates an order link for a phone number`
- TO: `### Requirement: Manager generates an order link for a client`

- FROM: `### Requirement: Token validation resolves the bound phone number`
- TO: `### Requirement: Token validation resolves the bound client`

## MODIFIED Requirements

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
