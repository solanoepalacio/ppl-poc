## MODIFIED Requirements

### Requirement: Manager can create an order manually
From the back office, the manager SHALL be able to create an order by providing a phone number, an optional list of catalog items with quantities, and an optional free-text `message` capturing the originating customer message (e.g. the pasted WhatsApp text), without generating or sending a customer link. The system MUST persist the created order so it appears in the day's back-office view, MUST record the supplied items, MUST persist the supplied `message` when present and store no message when it is absent or blank, and MUST reject any item that is not in the active catalog, persisting nothing on rejection. A manually created order SHALL carry a valid status from the order status model.

#### Scenario: Manager creates an order with items
- **WHEN** the manager submits a phone number and one or more active-catalog items with quantities
- **THEN** the system persists a new order bound to that phone number with the supplied items
- **AND** the order appears in the back-office view for the day it was created

#### Scenario: Manager creates an order with no items
- **WHEN** the manager submits a phone number with no items
- **THEN** the system persists a new order with that phone number and no items

#### Scenario: Manager captures the originating message
- **WHEN** the manager submits a manual order and includes a non-empty `message`
- **THEN** the system persists that `message` on the created order

#### Scenario: Manager omits the message
- **WHEN** the manager submits a manual order with no `message` or a blank `message`
- **THEN** the system persists the order with no stored message

#### Scenario: Manual order references a product outside the catalog
- **WHEN** a manual order creation includes an item that is not in the active catalog
- **THEN** the system rejects the creation
- **AND** persists no order
