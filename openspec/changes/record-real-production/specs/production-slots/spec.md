## ADDED Requirements

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
