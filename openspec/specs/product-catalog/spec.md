# product-catalog Specification

## Purpose
TBD - created by archiving change product-catalog-thresholds. Update Purpose after archive.
## Requirements
### Requirement: The product catalog is managed from the back office
The system SHALL maintain a catalog of products that orders are placed against,
and SHALL let the manager maintain it from the back office. Each product SHALL
have a stable identifier, a display name, a production line, an active flag, and
a production threshold.

The manager SHALL be able to **add** a product by supplying a display name and a
production line; **edit** an existing product's display name, line and
threshold; **retire** a product; and **reinstate** a retired one.

A product's display name SHALL be unique, and the system MUST reject an add or an
edit that would duplicate an existing one, persisting nothing. Two products the
manager cannot tell apart in a picker are two products that will be ordered
interchangeably, and their demand will be split across both for no reason anybody
can see afterwards.

Removing a product SHALL depend on whether any order references it:

- With **no orders**, the product SHALL be deleted outright.
- With **one or more orders**, the product SHALL NOT be deleted; it SHALL be
  retired by being marked inactive, so those orders keep their reference and
  closed bloques stay intact.

The back office SHALL show which of the two a product's removal control will
perform before it is activated.

A retired product SHALL NOT be offered on the customer form or in the back
office's order pickers, SHALL remain in the catalog listing, and SHALL be
reinstatable.

The catalog SHALL continue to be seedable by Prisma data migrations, which remain
the way the initial catalog is loaded.

#### Scenario: Manager adds a product
- **WHEN** the manager supplies a display name and a production line for a new product
- **THEN** the product is added to the catalog, active, on that line
- **AND** it is offered for new orders

#### Scenario: A new product starts with no threshold
- **WHEN** the manager adds a product without stating a threshold
- **THEN** its threshold is zero
- **AND** it is only produced against what customers order

#### Scenario: Duplicate name is rejected
- **WHEN** the manager supplies a display name that an existing product already has
- **THEN** the system rejects it
- **AND** no product is added

#### Scenario: Manager renames a product
- **WHEN** the manager changes an existing product's display name
- **THEN** the product's display name changes
- **AND** its identifier is unchanged
- **AND** orders already containing it still resolve to it

#### Scenario: Manager moves a product to the other line
- **WHEN** the manager changes a product's production line
- **THEN** it appears in that line's production view and no longer in the other

#### Scenario: Removing a product with no orders deletes it
- **WHEN** the manager removes a product that no order references
- **THEN** the product is deleted from the catalog

#### Scenario: Removing a product with orders retires it instead
- **WHEN** the manager removes a product that one or more orders reference
- **THEN** the product is not deleted
- **AND** it is marked inactive
- **AND** those orders still resolve to it

#### Scenario: The removal control says which it will do
- **WHEN** the manager looks at a product's removal control
- **THEN** it indicates whether activating it will delete the product or retire it

#### Scenario: A retired product stays listed and can be reinstated
- **WHEN** a product has been retired
- **THEN** it is still shown in the catalog listing, distinguished from the active ones
- **AND** a control is offered to reinstate it
- **AND** activating that control makes it orderable again

### Requirement: A product carries the stock level the bakery wants to hold
Each product SHALL carry a **threshold**: the number of units the bakery wants on
the shelf independently of what has been ordered. It SHALL be a whole number, it
SHALL NOT be negative, and it SHALL default to zero.

Zero is not a special case but the ordinary one, and it means what the system did
before thresholds existed: produce what was ordered and nothing more. Any product
whose threshold is left alone therefore keeps behaving exactly as it does today.

The threshold SHALL belong to the product rather than to a bloque. It describes
how the bakery wants to stock that product, which does not change when a bloque
is closed; a figure re-entered every bloque would be a figure that is wrong
whenever somebody forgets.

The manager SHALL be able to see and change it (see *The product catalog is
managed from the back office*).

#### Scenario: A threshold defaults to zero
- **WHEN** a product has never had a threshold set
- **THEN** its threshold is zero

#### Scenario: A negative threshold is rejected
- **WHEN** the manager supplies a negative threshold
- **THEN** the system rejects it
- **AND** the product's threshold is unchanged

#### Scenario: The threshold survives closing a bloque
- **WHEN** a bloque is closed and a new one opened
- **THEN** every product keeps the threshold it had

