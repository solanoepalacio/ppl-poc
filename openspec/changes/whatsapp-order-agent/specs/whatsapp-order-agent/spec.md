## ADDED Requirements

### Requirement: The webhook answers Meta's verification handshake
The system SHALL expose an endpoint the Meta Cloud API can register as a webhook.
On a verification request it SHALL check the challenge's verify token against the
configured one and, only when they match, echo the challenge back as the plain
response body. A mismatched or absent token SHALL be rejected without echoing
anything, since echoing is what proves ownership of the endpoint.

#### Scenario: Verification with the right token
- **WHEN** the endpoint receives a verification request whose verify token matches
  the configured one
- **THEN** it responds with the challenge value as the body

#### Scenario: Verification with a wrong token
- **WHEN** the verify token does not match
- **THEN** the request is rejected and the challenge is not echoed

### Requirement: Deliveries are authenticated before they are acted on
Every delivery SHALL carry a signature over its raw body, and the system SHALL
verify it against the configured app secret before interpreting the payload,
using a comparison that does not leak by timing. A delivery whose signature is
absent or does not match SHALL be rejected and SHALL cause nothing to be created
or sent.

The endpoint is reachable without a session — it must be, for Meta to call it —
so the signature is the only thing standing between the public internet and an
endpoint that mints order links. It SHALL be checked against the **raw** body:
a signature verified against a re-serialised payload proves nothing.

#### Scenario: An unsigned or wrongly signed delivery is rejected
- **WHEN** a delivery arrives with a missing or invalid signature
- **THEN** it is rejected
- **AND** no order, token or reply is produced

#### Scenario: A correctly signed delivery is processed
- **WHEN** a delivery's signature matches the configured app secret
- **THEN** its payload is processed

### Requirement: Only inbound customer messages are acted on
A delivery MAY carry inbound messages, status updates for messages the system
itself sent, or neither. The system SHALL act only on inbound messages.

Status updates SHALL be ignored. They arrive on the same webhook and describe the
system's own replies, so treating one as an inbound message would have the agent
answer itself for as long as each answer produced another status.

The system SHALL ignore a message it has already acted on, identified by the
message id Meta assigns it. Meta retries a delivery until it is acknowledged, for
up to seven days, so the same message arriving twice is expected rather than
exceptional, and without this each retry would be another link.

#### Scenario: A status update produces nothing
- **WHEN** a delivery carries only status updates for messages the system sent
- **THEN** no reply is sent and nothing is created

#### Scenario: A redelivered message is acted on once
- **WHEN** the same inbound message is delivered more than once
- **THEN** it is acted on the first time only

#### Scenario: Deliveries are acknowledged even when nothing is done
- **WHEN** a delivery is ignored, or acting on it fails
- **THEN** the endpoint still acknowledges it successfully
- **AND** Meta is not made to retry it

### Requirement: A known sender is answered with their order link
The system SHALL resolve an inbound message's sender to a client by matching the
sender's number against the directory, and SHALL reply with a message containing
that client's order link for the open bloque.

The reply SHALL be free-form text rather than a template. The customer messaged
first, which opens the service window in which free-form replies are allowed, and
a template would need approval before it could be sent at all.

Sending the reply SHALL be best-effort with respect to the order: if the reply
cannot be delivered, the order and its link SHALL still exist, so the manager can
fall back to sharing the link by hand. A failure to send SHALL be recorded where
it can be seen.

#### Scenario: A known number gets a link
- **WHEN** an inbound message arrives from a number belonging to an active client
- **THEN** the system replies with a message containing an order link for that
  client in the open bloque

#### Scenario: The link is the customer's own
- **WHEN** the reply is sent
- **THEN** the link it carries resolves to an order bound to the sender's client
- **AND** not to any other client

#### Scenario: A failed reply does not discard the link
- **WHEN** the reply cannot be delivered
- **THEN** the order and its link still exist and remain usable
- **AND** the failure is recorded

### Requirement: One link per client per bloque, not one per message
An inbound message from a client who already has an unconsumed order link for the
open bloque SHALL NOT create another. The existing link SHALL be what the reply
carries.

This is the rule that keeps the agent from turning a conversation into a pile of
orders: a customer typing "hola", "quiero pedir" and "?" is one customer with one
order to place, and a link minted per message would leave the bakery three
pending orders for them and three tokens that each still work.

Beyond reusing the link, the system SHALL suppress repeated replies to the same
sender within a short window, so that several messages in quick succession are
answered once rather than once each. The window SHALL be measured from the last
reply sent to that sender.

A client whose link for the bloque has already been used SHALL be treated as a
new request: their order is placed, and a further message is a further order.

#### Scenario: A second message reuses the outstanding link
- **WHEN** a client with an unconsumed link for the open bloque sends another
  message after the suppression window
- **THEN** no new order is created
- **AND** the reply carries the link they already had

#### Scenario: Several messages in quick succession are answered once
- **WHEN** a client sends several messages inside the suppression window
- **THEN** exactly one reply is sent

#### Scenario: A client who already ordered can order again
- **WHEN** a client whose link for the open bloque has already been used sends a
  message
- **THEN** a new order and link are created for them

#### Scenario: Each bloque is its own conversation
- **WHEN** a client who had a link in a closed bloque sends a message while a new
  bloque is open
- **THEN** they are given a link for the open bloque
- **AND** the closed bloque's link is not reused, since it no longer works

### Requirement: An unknown sender is answered without creating anything
An inbound message from a number that matches no active client SHALL NOT create
an order, a token or a client. The system SHALL reply telling the sender to leave
their order in the chat and that a person will take it, so that a customer the
bakery has not registered is not met with silence.

The directory is maintained by the manager, and a number arriving unannounced is
as likely to be a wrong number as a customer. Registering it automatically would
let anyone with the bakery's number add themselves to the directory.

#### Scenario: An unknown number gets the courtesy reply
- **WHEN** an inbound message arrives from a number matching no active client
- **THEN** the system replies asking them to leave the order in the chat
- **AND** no order, token or client is created

#### Scenario: A retired client's number is treated as unknown
- **WHEN** an inbound message arrives from the number of a client that has been
  retired
- **THEN** it is handled as an unknown sender

### Requirement: The agent is inert unless it is fully configured
The verify token, the app secret, the access token and the sending phone number
SHALL come from the environment and SHALL NOT appear in the repository. With any
of them missing the agent SHALL be inert: it SHALL NOT attempt to verify
signatures it cannot check or send messages it cannot authenticate, and it SHALL
NOT present an endpoint that answers Meta with errors.

None of these values SHALL be written to logs, and neither SHALL the contents of
an inbound message beyond what is needed to act on it.

#### Scenario: Missing configuration disables the agent
- **WHEN** any required credential is absent from the environment
- **THEN** the agent does not process deliveries
- **AND** its state is discoverable at startup rather than at the first delivery

#### Scenario: Credentials never reach the logs
- **WHEN** the agent processes or rejects a delivery
- **THEN** no credential appears in any log line
