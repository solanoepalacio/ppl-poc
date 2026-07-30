# production-slots Specification

## Purpose

Defines the production "bloque" (slot) — the container that orders are grouped into for a production run. It replaces the previous implicit day-based grouping with an explicit, manually-closed entity: at any moment exactly one bloque is open and receives new orders, and the manager closes it when the run is done, which atomically opens a fresh one. Also defines the back-office view for managing bloques.
## Requirements
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
From the back office, the manager SHALL be able to close the currently open bloque. Closing MUST atomically mark that bloque `closed` (recording its closed instant) and open a new bloque with the next sequence number, so that exactly one open bloque always remains. Closing writes no order state: a closed bloque's order links are invalid purely because the bloque is `closed`. The system MUST reject a request to close a bloque that does not exist or that is already closed, leaving the bloques unchanged.

#### Scenario: Closing opens a fresh bloque
- **WHEN** the manager closes the currently open bloque
- **THEN** the system marks it closed with a closed instant
- **AND** a new open bloque with the next sequence number exists
- **AND** exactly one bloque remains open

#### Scenario: Closing invalidates the bloque's unused links
- **WHEN** the manager closes a bloque that still holds unused order links
- **THEN** those order links no longer resolve as valid
- **AND** the system changes no order's state

#### Scenario: A closed bloque is read-only history
- **WHEN** a bloque has been closed
- **THEN** it no longer receives new orders
- **AND** its orders remain viewable as the bloque's history

#### Scenario: Closing an already-closed bloque is rejected
- **WHEN** a close is requested for a bloque that is already closed or does not exist
- **THEN** the system rejects the request
- **AND** leaves the existing bloques unchanged

### Requirement: A bloque carries manually-entered existencia
The system SHALL let the manager record, per product, the *existencia* (stock already on hand) for a production bloque. A product with no recorded existencia for a bloque SHALL be treated as zero existencia. A freshly opened bloque SHALL start with all existencia at zero. Existencia SHALL be editable only while the bloque is open; the system MUST reject setting existencia on a closed bloque, leaving its existencia unchanged.

#### Scenario: A freshly opened bloque starts at zero existencia
- **WHEN** a new bloque is opened
- **THEN** every product's existencia for that bloque is zero

#### Scenario: The manager records existencia on the open bloque
- **WHEN** the manager records existencia quantities for products on the open bloque
- **THEN** the system stores those quantities as that bloque's existencia
- **AND** a product left at zero is stored as no existencia

#### Scenario: Setting existencia on a closed bloque is rejected
- **WHEN** existencia is set for a bloque that is already closed
- **THEN** the system rejects the request
- **AND** leaves that bloque's existencia unchanged

### Requirement: Bloques can be listed for selection
The system SHALL expose all bloques, newest first, each with its status, sequence number, and timestamps, so the orders view can present them in a bloque selector for viewing and management. There is no dedicated bloques view.

#### Scenario: The orders view lists every bloque newest first
- **WHEN** the manager opens the back-office orders view
- **THEN** its bloque selector lists all bloques ordered newest first
- **AND** each entry shows its sequence number and status

### Requirement: Back office surfaces bloque closing on the orders view
The orders view SHALL present a control (**Cerrar producción**) to close the currently open bloque — which atomically opens a fresh one. The control SHALL always be present but SHALL be disabled (visibly grayed and unclickable) unless the open bloque is selected.

#### Scenario: Manager closes the current bloque from the orders view
- **WHEN** the manager activates the **Cerrar producción** control on the orders view while the open bloque is selected
- **THEN** the system closes the open bloque and opens a fresh one
- **AND** the orders view reflects the newly closed bloque and the new open bloque

#### Scenario: The close control is disabled for a closed bloque
- **WHEN** the manager selects a closed bloque in the orders view
- **THEN** the **Cerrar producción** control is shown disabled and cannot be activated

### Requirement: Back office surfaces existencia editing on the open bloque
The orders view SHALL present a control (**Editar stock**) to record per-product existencia for the open bloque. The control SHALL always be present but SHALL be disabled (visibly grayed and unclickable) unless the open bloque is selected.

#### Scenario: Manager edits existencia for the open bloque
- **WHEN** the manager opens the stock editor on the orders view while the open bloque is selected and saves per-product quantities
- **THEN** the system stores them as that bloque's existencia

#### Scenario: The stock control is disabled for a closed bloque
- **WHEN** the manager selects a closed bloque in the orders view
- **THEN** the **Editar stock** control is shown disabled and cannot be activated

