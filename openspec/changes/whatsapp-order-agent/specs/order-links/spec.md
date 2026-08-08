## REMOVED Requirements

### Requirement: Manager generates an order link for a client
**Reason**: the requirement names the manager and the back office as the way a
link comes to exist — "SHALL allow the bakery manager, from the back office" —
and its scenario ends with a URL "that the manager can share over WhatsApp". The
agent generates links with no manager involved and shares them itself, so the
concept of who initiates changes rather than shifts. Replaced by *The system
generates an order link for a client*, which keeps every mechanic it specified:
the unique token, the order created at generation time, the bloque scoping and
the URL that embeds both.

## ADDED Requirements

### Requirement: The system generates an order link for a client
The system SHALL generate an order link for a client in the currently open
bloque, creating a unique token bound to an order for that client, creating the
corresponding order, and returning a custom URL that embeds the token together
with the sequence number of the bloque the link is valid for.

Generation SHALL be initiated in either of two ways, producing the same link:

- by the manager, from the back office, selecting a client from the directory;
- by the WhatsApp agent, on an inbound message it resolves to a client.

A request that does not name a valid, active client SHALL be rejected and SHALL
generate no token, whichever path it came from.

The manual path SHALL remain available regardless of the agent. It is what covers
a customer whose number the bakery does not have, a customer not on WhatsApp, and
the agent being unavailable.

#### Scenario: Generate a link for a selected client
- **WHEN** the manager selects a client in the back office and generates a link
- **THEN** the system creates a unique token bound to an order for that client in the open bloque
- **AND** creates an order associated with that client
- **AND** returns a custom URL containing the token, and the sequence number of the bloque the link is valid for, that the manager can share

#### Scenario: Client is missing or unknown
- **WHEN** a link request does not name a valid, active client
- **THEN** the system rejects the request and does not generate a token

#### Scenario: The agent generates the same kind of link
- **WHEN** the agent generates a link for a client it resolved from an inbound message
- **THEN** the link is bound to an order for that client in the open bloque, exactly as a manually generated one is

#### Scenario: The manual control survives the agent
- **WHEN** the agent is configured and running
- **THEN** the manager can still generate a link from the back office
