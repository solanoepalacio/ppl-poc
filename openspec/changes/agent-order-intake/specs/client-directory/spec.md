## ADDED Requirements

### Requirement: A client can be resolved by phone number

The system SHALL resolve a phone number to the client it belongs to, so that a
caller holding an inbound message's number — rather than a client identifier —
can tell whose message it is.

The number SHALL be matched on its normalized digits, so that it resolves however
it was written: the stored value is digits only, and an inbound identifier or a
number typed with a leading `+`, spaces or punctuation reduce to the same value.

Only an active client SHALL resolve. A retired client cannot be given an order
link, and resolving one would only defer that refusal to the next step.

A number that matches no client SHALL be reported as resolving to no client, and
this MUST NOT be treated as an error: an automated caller's first question is
whether a message comes from a customer at all, and "from a stranger" is an
ordinary answer it acts on by discarding the message. A number carrying no digits
SHALL resolve to no client, there being no value to match on.

#### Scenario: A stored number resolves to its client
- **WHEN** a number is presented that an active client holds
- **THEN** the system returns that client

#### Scenario: A number resolves however it was written
- **WHEN** a number is presented with a leading `+`, spaces or punctuation, whose
  digits are those an active client holds
- **THEN** the system returns that client, the same one the bare digits resolve to

#### Scenario: An unknown number resolves to nobody
- **WHEN** a number is presented that no client holds
- **THEN** the system reports that it resolves to no client
- **AND** does not report the request as having failed

#### Scenario: A retired client does not resolve
- **WHEN** a number is presented that only a retired client holds
- **THEN** the system reports that it resolves to no client

#### Scenario: A number with no digits resolves to nobody
- **WHEN** a blank value, or one containing no digits at all, is presented
- **THEN** the system reports that it resolves to no client
