## RENAMED Requirements

- FROM: `### Requirement: Back office shows orders by day`
- TO: `### Requirement: Back office shows orders by bloque`

## MODIFIED Requirements

### Requirement: Orders are persisted with their context
The system SHALL persist each order with the phone number bound to its token, its status, the time it was created, the production bloque it belongs to, and its order items once the customer submits them. Stored orders MUST be retrievable for back-office viewing.

#### Scenario: Order is retrievable after creation
- **WHEN** an order has been created for a generated link
- **THEN** the system can retrieve it with its phone number, status, creation time, and the bloque it belongs to

#### Scenario: Items are persisted on confirmation
- **WHEN** a customer confirms an order with items
- **THEN** the system persists those items on the order

### Requirement: Back office shows orders by bloque
The back office SHALL present orders grouped by the production bloque they belong to as the primary view, defaulting to the currently open bloque, so the manager can forward them to the production line. Each listed order SHALL show its status, items, and the associated phone number. The response SHALL carry the resolved bloque alongside its orders. Selecting a bloque in the orders view SHALL immediately show that bloque's orders without requiring any separate view or submit action.

#### Scenario: Manager views the open bloque's orders
- **WHEN** the manager opens the back-office orders view without selecting a bloque
- **THEN** the system shows the orders in the currently open bloque, each with its status, items, and phone number

#### Scenario: Manager selects a different bloque
- **WHEN** the manager selects a specific bloque in the orders view bloque-picker
- **THEN** the system immediately shows the orders in that bloque
- **AND** no separate view or submit action is required to render them

### Requirement: Manager can create an order manually
From the back office, the manager SHALL be able to create an order by providing a phone number, an optional list of catalog items with quantities, and an optional free-text `message` capturing the originating customer message (e.g. the pasted WhatsApp text), without generating or sending a customer link. The system MUST persist the created order in the currently open bloque so it appears in that bloque's back-office view, MUST record the supplied items, MUST persist the supplied `message` when present and store no message when it is absent or blank, and MUST reject any item that is not in the active catalog, persisting nothing on rejection. A manually created order SHALL carry a valid status from the order status model.

#### Scenario: Manager creates an order with items
- **WHEN** the manager submits a phone number and one or more active-catalog items with quantities
- **THEN** the system persists a new order bound to that phone number with the supplied items
- **AND** the order appears in the back-office view for the open bloque it was placed in

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
