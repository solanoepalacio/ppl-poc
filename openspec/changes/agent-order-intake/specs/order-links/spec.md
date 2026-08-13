## ADDED Requirements

### Requirement: An order records how it came to exist

The system SHALL record, for every order, whether it originated from a generated
order link or was recorded by hand in the back office.

Only an order originating from a generated link MAY be handed back as one. An
order recorded by hand also carries an unused token and has not been consumed, so
it is otherwise indistinguishable from a live link — and confirming an order adds
its items to those already recorded rather than replacing them, so handing a
hand-recorded order to a customer would combine their items with the manager's
and count that product twice in the bloque's production totals.

An order whose origin predates this distinction SHALL be treated as recorded by
hand, since nothing can recover which it was, and treating it so means no such
order is ever handed to a customer.

#### Scenario: A generated link is recorded as one
- **WHEN** the system generates an order link for a client
- **THEN** the order it creates is recorded as originating from a generated link

#### Scenario: A hand-recorded order is recorded as one
- **WHEN** the manager records an order received off-channel in the back office
- **THEN** that order is recorded as having been recorded by hand

#### Scenario: An order predating the distinction is treated as hand-recorded
- **WHEN** an order created before origin was recorded is considered for reuse
- **THEN** it is treated as having been recorded by hand
- **AND** it is not handed back as a link

## MODIFIED Requirements

### Requirement: Manager generates an order link for a client
The system SHALL allow the bakery manager, from the back office, to generate an order link by selecting a client from the directory. The system SHALL create a unique token bound to an order for that client in the currently open bloque, create the corresponding order, and return a custom URL that embeds the token together with the sequence number of the bloque the link is valid for.

Generating a link for a client that already has an unconsumed link-originated
order in the open bloque SHALL return that existing link rather than create a
second one, and SHALL report that the link returned was already outstanding. An
order is created up front, before the customer has done anything with it, and the
bloque lists every order it holds whether or not it was ever filled in — so
issuing a fresh link each time leaves every superseded one behind as an empty
order the manager cannot account for. A caller that repeats the request on a
customer's behalf would leave one per message.

Reuse SHALL be scoped to links that are still good: an order in the open bloque
that has not been consumed, which is the same condition under which its token is
treated as valid. A consumed link SHALL NOT be handed out again, and a link in a
closed bloque SHALL NOT be reused — closing a bloque starts every client fresh.

#### Scenario: Generate a link for a selected client
- **WHEN** the manager selects a client in the back office and generates a link
- **THEN** the system creates a unique token bound to an order for that client in the open bloque
- **AND** creates an order associated with that client
- **AND** returns a custom URL containing the token, and the sequence number of the bloque the link is valid for, that the manager can share over WhatsApp
- **AND** reports that the link is newly issued

#### Scenario: Client is missing or unknown
- **WHEN** the manager submits a link request without a valid, active client
- **THEN** the system rejects the request and does not generate a token

#### Scenario: Generating again returns the outstanding link
- **WHEN** a link is generated for a client that already has an unconsumed
  link-originated order in the open bloque
- **THEN** the system returns that same link
- **AND** creates no second order
- **AND** reports that the link was already outstanding

#### Scenario: A consumed link is not handed out again
- **WHEN** a link is generated for a client whose only link in the open bloque has
  been consumed
- **THEN** the system creates a new token and order
- **AND** reports that the link is newly issued

#### Scenario: A closed bloque starts the client fresh
- **WHEN** a link is generated for a client whose outstanding link belongs to a
  bloque that has since been closed
- **THEN** the system creates a new token and order in the currently open bloque

#### Scenario: A hand-recorded order is never handed out as a link
- **WHEN** a link is generated for a client that has an unconsumed order in the
  open bloque which the manager recorded by hand
- **THEN** the system creates a new token and order
- **AND** the hand-recorded order is left untouched
