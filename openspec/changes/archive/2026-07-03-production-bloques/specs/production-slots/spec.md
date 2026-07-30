## ADDED Requirements

### Requirement: Exactly one open bloque exists at all times
The system SHALL maintain exactly one production bloque in the `open` status at any time. On startup, if no open bloque exists, the system MUST create one. The single-open invariant MUST be enforced such that two open bloques can never coexist.

#### Scenario: A system without an open bloque self-heals
- **WHEN** the system starts and no bloque is currently open
- **THEN** the system creates a new open bloque

#### Scenario: Never two open bloques
- **WHEN** the set of bloques is inspected at any time
- **THEN** exactly one bloque has status `open`

### Requirement: A bloque carries an identity, sequence, status, and timestamps
Every bloque SHALL have a stable identifier, a human-facing sequence number, a status that is exactly one of `open` or `closed`, the instant it was opened, and the instant it was closed. A bloque's closed instant SHALL be absent while it is open and set when it is closed.

#### Scenario: An open bloque has no closed instant
- **WHEN** an open bloque is read
- **THEN** its status is `open` and it has an opened instant and no closed instant

#### Scenario: A closed bloque records when it was closed
- **WHEN** a closed bloque is read
- **THEN** its status is `closed` and it carries both its opened and closed instants

### Requirement: New orders are placed in the open bloque
Every newly created order SHALL be associated with the currently open bloque, whether it originates from the customer-link path (the customer confirms an order) or from the back-office manual-creation path.

#### Scenario: A customer-confirmed order lands in the open bloque
- **WHEN** a customer confirms an order via their link
- **THEN** the created order is associated with the currently open bloque

#### Scenario: A manually created order lands in the open bloque
- **WHEN** the manager creates an order manually from the back office
- **THEN** the created order is associated with the currently open bloque

### Requirement: Closing the open bloque atomically opens a fresh one
From the back office, the manager SHALL be able to close the currently open bloque. Closing MUST atomically mark that bloque `closed` (recording its closed instant) and open a new bloque with the next sequence number, so that exactly one open bloque always remains. The system MUST reject a request to close a bloque that does not exist or that is already closed, leaving the bloques unchanged.

#### Scenario: Closing opens a fresh bloque
- **WHEN** the manager closes the currently open bloque
- **THEN** the system marks it closed with a closed instant
- **AND** a new open bloque with the next sequence number exists
- **AND** exactly one bloque remains open

#### Scenario: A closed bloque is read-only history
- **WHEN** a bloque has been closed
- **THEN** it no longer receives new orders
- **AND** its orders remain viewable as the bloque's history

#### Scenario: Closing an already-closed bloque is rejected
- **WHEN** a close is requested for a bloque that is already closed or does not exist
- **THEN** the system rejects the request
- **AND** leaves the existing bloques unchanged

### Requirement: Bloques can be listed for management
The system SHALL expose all bloques, newest first, each with its status, sequence number, timestamps, and the count of orders it contains, for a dedicated back-office bloques view.

#### Scenario: The bloques view lists every bloque newest first
- **WHEN** the manager opens the back-office bloques view
- **THEN** the system lists all bloques ordered newest first
- **AND** each entry shows its status and the number of orders it contains

### Requirement: Back office surfaces bloque management
The back office SHALL present a dedicated bloques view, reachable from the persistent back-office navigation, that lists the bloques and offers a control to close the currently open bloque.

#### Scenario: Manager closes the current bloque from the bloques view
- **WHEN** the manager activates the "close current bloque" control on the bloques view
- **THEN** the system closes the open bloque and opens a fresh one
- **AND** the bloques view reflects the newly closed bloque and the new open bloque
