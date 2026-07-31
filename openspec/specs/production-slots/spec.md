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

### Requirement: A bloque carries a real-production history per product
The system SHALL let the manager record *producción real* — how much of a product
has actually been baked — as a **history of entries** on a production bloque.
Each entry SHALL carry a quantity and the moment it was recorded. A product MAY
have many entries in a bloque, one per batch recorded.

A product's real production for the bloque SHALL be the **sum of its entries**. A
product with no entries SHALL be treated as zero. A freshly opened bloque SHALL
start with no entries at all.

Entries SHALL belong to the bloque they were recorded in. Although each entry
carries a timestamp, the history is scoped to the bloque and never spans bloques:
a bloque's totals SHALL be computed only from its own entries, regardless of the
dates those entries carry.

The history SHALL be editable only while the bloque is open — adding, changing and
deleting entries alike. The system MUST reject any of those on a closed bloque,
leaving its history unchanged.

Real production is recorded independently of existencia: the two are separate
figures on the same bloque, and writing one SHALL NOT affect the other.

#### Scenario: A freshly opened bloque has no history
- **WHEN** a bloque is opened
- **THEN** every product's real-production history for that bloque is empty
- **AND** every product's real production is zero

#### Scenario: A product's real production is the sum of its entries
- **WHEN** product P has entries of 20 and 30 recorded in the bloque
- **THEN** P's real production for that bloque is 50

#### Scenario: Recording a batch appends an entry
- **WHEN** the manager records 30 of product P on the open bloque
- **THEN** a new entry of 30 is added to P's history for that bloque
- **AND** the entry carries the moment it was recorded
- **AND** entries recorded earlier are left unchanged

#### Scenario: Deleting the last entry clears the product's real production
- **WHEN** every entry for product P in the bloque is deleted
- **THEN** P has no real-production history for that bloque
- **AND** P's real production is zero

#### Scenario: The history is scoped to its bloque
- **WHEN** a bloque's real production is computed
- **THEN** only entries recorded in that bloque contribute
- **AND** entries in other bloques are excluded whatever their timestamps

#### Scenario: Changing the history on a closed bloque is rejected
- **WHEN** an entry is added, changed or deleted on a bloque that is already closed
- **THEN** the system rejects the request
- **AND** leaves that bloque's history unchanged

#### Scenario: Real production and existencia are independent
- **WHEN** the manager records real production for a product on the open bloque
- **THEN** that product's existencia for the bloque is unchanged
- **AND** recording existencia likewise leaves its real-production history unchanged

### Requirement: Back office surfaces the real-production history on the open bloque
The orders view SHALL present a control (**Producción Real**) to record and review
per-product real production for the open bloque. The control SHALL always be
present but SHALL be disabled (visibly grayed and unclickable) unless the open
bloque is selected.

The control SHALL list every product with real production recorded in the bloque
— that is, an accumulated quantity above zero — showing the product's name and
its accumulated quantity. **The accumulated quantity SHALL NOT be editable**: it
is a sum, and the way to change it is to change the entries it is a sum of.

Each listed product SHALL offer a way to expand its history (**Ver detalle**),
revealing that product's entries with, for each one, the date and time it was
recorded and its quantity. Within the expanded history:

- The quantity of an entry SHALL be editable, so a batch entered wrongly can be
  corrected where the mistake actually is.
- Each entry SHALL offer a control to delete that entry alone.

Each listed product SHALL also offer a control to remove the product, which SHALL
delete that product's **entire** history for the bloque and therefore clear its
real production.

Separately from the list, the control SHALL offer an entry area for recording a
new batch, which SHALL start empty each time the control is opened so that a
quantity entered there is unambiguously an addition and never a total.

#### Scenario: Products with recorded production are listed with their totals
- **WHEN** the manager opens the control and product P has entries of 20 and 30
- **THEN** P is listed with an accumulated quantity of 50

#### Scenario: A product with no production is not listed
- **WHEN** the manager opens the control and product Q has no entries in the bloque
- **THEN** Q is not listed

#### Scenario: The accumulated quantity cannot be edited directly
- **WHEN** a product is listed with its accumulated quantity
- **THEN** that quantity is presented as a figure and offers no way to change it

#### Scenario: Expanding a product reveals its entries
- **WHEN** the manager expands a listed product's detail
- **THEN** each of that product's entries is shown with the date and time it was
  recorded and its quantity

#### Scenario: An entry's quantity can be corrected
- **WHEN** product P has an entry of 30 that should have been 3, and the manager
  changes that entry to 3
- **THEN** that entry's quantity becomes 3
- **AND** P's accumulated quantity falls by 27
- **AND** P's other entries are unchanged

#### Scenario: A single entry can be deleted
- **WHEN** product P has entries of 20 and 30 and the manager deletes the entry of 20
- **THEN** only the entry of 30 remains
- **AND** P's accumulated quantity is 30

#### Scenario: Removing a product deletes its whole history
- **WHEN** the manager removes a listed product from the control
- **THEN** every entry for that product in the bloque is deleted
- **AND** that product's real production is zero
- **AND** the product is no longer listed

#### Scenario: The entry area starts empty each time
- **WHEN** the manager opens the control on a bloque that already has entries
- **THEN** the recorded products are listed with their accumulated quantities
- **AND** the entry area for a new batch is empty

#### Scenario: Successive batches accumulate as separate entries
- **WHEN** the manager records 20 of product P, and later records 30 of P again on
  the same bloque
- **THEN** P has two entries, of 20 and of 30
- **AND** P's accumulated quantity is 50

#### Scenario: The control is disabled off the open bloque
- **WHEN** a bloque other than the open one is selected on the orders view
- **THEN** the control is present but disabled and cannot be opened

#### Scenario: Saving does not disturb products the control did not show
- **WHEN** the control was opened while product P had production recorded, product
  Q gained production afterwards from elsewhere, and the manager saves without
  having seen Q
- **THEN** P is saved as shown
- **AND** Q's history is left untouched rather than deleted

