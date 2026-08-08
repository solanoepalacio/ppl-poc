## REMOVED Requirements

### Requirement: Closing warns about products in shortfall before it happens
**Reason**: the requirement is built around letting the manager proceed — it
"SHALL require the manager to confirm the close or cancel it" — and two of its
scenarios are named after confirming and discarding. This change removes that
choice, so the concept inverts rather than shifts. Replaced by *Closing is
refused while any product is in shortfall*, which keeps what the warning got
right: naming the products and by how much.

## ADDED Requirements

### Requirement: Closing is refused while any product is in shortfall
A bloque in which any product's stock actual is below zero SHALL NOT be closed.
The attempt SHALL be rejected, the bloque SHALL remain open, and no successor
bloque SHALL be created.

A shortfall means the bakery owes units it has not baked. Closing used to discard
it behind a confirmation, which made the loss a click rather than a decision; the
work does not disappear because the bloque did, so the bloque waits for the work.

The refusal SHALL be enforced where the close is performed, not only by the
control that offers it — a guard applied by one caller is not a guard.

The system SHALL report which products are short and by how much, so the manager
knows what to produce to unblock the close. Recording the missing production, or
correcting the stock inicial when the shortfall is a counting error, SHALL be
enough to allow it.

When no product is in shortfall, closing SHALL proceed as before, with no
confirmation asked for.

#### Scenario: A bloque with a shortfall cannot be closed
- **WHEN** the manager closes a bloque in which product Q has a stock actual of −50
- **THEN** the close is rejected
- **AND** the bloque remains open
- **AND** no successor bloque is created

#### Scenario: The refusal names what is short
- **WHEN** a close is refused for shortfall
- **THEN** the products in shortfall and their amounts are reported

#### Scenario: Producing the shortfall allows the close
- **WHEN** the missing units of product Q are recorded as real production, raising
  its stock actual to zero or above, and no other product is short
- **THEN** the bloque closes

#### Scenario: Correcting the stock inicial also allows it
- **WHEN** the shortfall came from a miscounted stock inicial and the manager
  corrects it so no product is below zero
- **THEN** the bloque closes

#### Scenario: No shortfall closes as before
- **WHEN** the manager closes a bloque in which no product's stock actual is below zero
- **THEN** the close proceeds without asking for confirmation

#### Scenario: The refusal is enforced beyond the control
- **WHEN** a close is requested for a bloque in shortfall by any means, including
  one that never showed the warning
- **THEN** it is rejected just the same
