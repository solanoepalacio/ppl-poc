## REMOVED Requirements

### Requirement: Orders carry a status
**Reason**: The five-value order lifecycle status (`pending|issued|denied|ignored|finished`) is removed entirely. Single-use link validity is now expressed by a nullable `Order.consumedAt` timestamp (valid only while `consumedAt` is null and the bloque is `open`), and production totals no longer filter by status, so no order lifecycle status remains.
**Migration**: `Order.status` is dropped; a nullable `Order.consumedAt` is added and backfilled to the created instant for orders whose old status was already acted on (`issued`, `denied`, `finished`). No status value is read or written anywhere thereafter.

### Requirement: Manager can manually update an order's status
**Reason**: With no order status to set, the manual status-update path (and its endpoint) is retired. Excluding a mistaken order from a bloque is done by deleting the order.
**Migration**: The status selector and its update endpoint are removed from the back office; managers delete an order instead of re-tagging its status.

## MODIFIED Requirements

### Requirement: Orders are persisted with their context
The system SHALL persist each order with the client it is for, the time it was created, the production bloque it belongs to, and its order items once the customer submits them. Stored orders MUST be retrievable for back-office viewing.

#### Scenario: Order is retrievable after creation
- **WHEN** an order has been created for a generated link
- **THEN** the system can retrieve it with its client, creation time, and the bloque it belongs to

#### Scenario: Items are persisted on confirmation
- **WHEN** a customer confirms an order with items
- **THEN** the system persists those items on the order

### Requirement: Back office shows orders by bloque
The back office SHALL present orders grouped by the production bloque they belong to as the primary view, defaulting to the currently open bloque, so the manager can forward them to the production line. Each listed order SHALL show its items and the client it is for. The response SHALL carry the resolved bloque alongside its orders. Selecting a bloque in the orders view SHALL immediately show that bloque's orders without requiring any separate view or submit action.

#### Scenario: Manager views the open bloque's orders
- **WHEN** the manager opens the back-office orders view without selecting a bloque
- **THEN** the system shows the orders in the currently open bloque, each with its items and client

#### Scenario: Manager selects a different bloque
- **WHEN** the manager selects a specific bloque in the orders view bloque-picker
- **THEN** the system immediately shows the orders in that bloque
- **AND** no separate view or submit action is required to render them

### Requirement: Manager can create an order manually
From the back office, the manager SHALL be able to create an order by selecting a client, an optional list of catalog items with quantities, and an optional free-text `message` capturing the originating customer message (e.g. the pasted WhatsApp text), without generating or sending a customer link. The system MUST persist the created order in the currently open bloque so it appears in that bloque's back-office view, MUST record the supplied items, MUST persist the supplied `message` when present and store no message when it is absent or blank, MUST reject any item that is not in the active catalog, and MUST reject a missing or inactive client, persisting nothing on rejection.

#### Scenario: Manager creates an order with items
- **WHEN** the manager selects a client and one or more active-catalog items with quantities
- **THEN** the system persists a new order for that client with the supplied items
- **AND** the order appears in the back-office view for the open bloque it was placed in

#### Scenario: Manager creates an order with no items
- **WHEN** the manager selects a client with no items
- **THEN** the system persists a new order for that client and no items

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

#### Scenario: Manual order references an unknown client
- **WHEN** a manual order creation specifies a missing or inactive client
- **THEN** the system rejects the creation
- **AND** persists no order

### Requirement: Manager can edit an order's items
From the back office, the manager SHALL be able to replace the list of items on any persisted order. The submitted list MAY add products, remove products, and change quantities; submitting an empty list clears the order's items. The system MUST validate every submitted item against the active catalog, MUST reject the edit if any item is not in the catalog (leaving the order's existing items unchanged), and MUST otherwise persist the new item list as the order's complete set of items.

#### Scenario: Manager replaces an order's items
- **WHEN** the manager submits a new list of active-catalog items with quantities for an existing order
- **THEN** the system persists exactly those items as the order's items, replacing any previous items

#### Scenario: Manager clears an order's items
- **WHEN** the manager submits an empty item list for an existing order
- **THEN** the system removes all items from the order

#### Scenario: Item edit references a product outside the catalog
- **WHEN** an item edit includes a product that is not in the active catalog
- **THEN** the system rejects the edit
- **AND** the order's existing items are left unchanged

#### Scenario: Item edit targets a missing order
- **WHEN** an item edit references an order that does not exist
- **THEN** the system rejects the edit
