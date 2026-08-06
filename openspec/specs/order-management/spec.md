# order-management Specification

## Purpose

Defines the order lifecycle status model, persistence of orders with their context, and the back-office view that groups orders by production bloque for the manager to forward to the production line.
## Requirements
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
From the back office, the manager SHALL be able to create an order by selecting a client and an optional list of catalog items with quantities, without generating or sending a customer link. The creation API SHALL additionally accept an optional free-text `message` capturing the originating customer message (e.g. the pasted WhatsApp text); it is part of the contract and is persisted, but the back office SHALL NOT offer the manager a field for supplying one — the message is for automated intake that has the customer's own text to hand, not for a manager to retype. The system MUST persist the created order in the currently open bloque so it appears in that bloque's back-office view, MUST record the supplied items, MUST persist the supplied `message` when present and store no message when it is absent or blank, MUST reject any item that is not in the active catalog, and MUST reject a missing or inactive client, persisting nothing on rejection. Because a manual order always lands in the open bloque, the order-creation control (**Agregar pedido**) on the orders view SHALL always be present but SHALL be disabled (visibly grayed and unclickable) unless the open bloque is selected.

#### Scenario: Order creation is disabled off the open bloque
- **WHEN** the manager selects a closed bloque in the orders view
- **THEN** the **Agregar pedido** control is shown disabled and cannot be activated

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

#### Scenario: The creation modal offers no message field
- **WHEN** the manager opens the order-creation modal
- **THEN** it presents no field for the originating message
- **AND** the order it creates carries no message

### Requirement: Manager can edit an order's items
From the back office, the manager SHALL be able to replace the list of items on any persisted order **belonging to the open bloque**. The submitted list MAY add products, remove products, and change quantities; submitting an empty list clears the order's items. The system MUST validate every submitted item against the active catalog, MUST reject the edit if any item is not in the catalog (leaving the order's existing items unchanged), and MUST otherwise persist the new item list as the order's complete set of items.

The system MUST reject an edit to an order in a closed bloque, leaving its items unchanged, and the back office SHALL NOT offer the control for such an order. A closed bloque's demand was used to compute the stock inicial carried to its successor, so a later change to that demand would leave the two disagreeing with nothing to detect it.

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

#### Scenario: Item edit targets an order in a closed bloque
- **WHEN** an item edit references an order whose bloque is closed
- **THEN** the system rejects the edit
- **AND** the order's items are left unchanged

#### Scenario: The edit control is not offered on a closed bloque
- **WHEN** the manager views the orders of a closed bloque
- **THEN** no control to edit an order's items is available

### Requirement: Manager can delete an order
From the back office, the manager SHALL be able to delete a persisted order **belonging to the open bloque**. Deleting an order MUST remove the order and all of its items, and the deleted order MUST no longer appear in the back-office view or be counted in production totals.

The system MUST reject deleting an order in a closed bloque, leaving it in place, and the back office SHALL NOT offer the control for such an order — for the same reason its items can no longer be edited: the bloque's demand is now baked into the stock its successor inherited.

#### Scenario: Manager deletes an order
- **WHEN** the manager deletes an existing order
- **THEN** the system removes the order and its items
- **AND** the order no longer appears in the back-office view

#### Scenario: Delete targets a missing order
- **WHEN** a delete references an order that does not exist
- **THEN** the system rejects the request

#### Scenario: Delete targets an order in a closed bloque
- **WHEN** a delete references an order whose bloque is closed
- **THEN** the system rejects the request
- **AND** the order remains in place

#### Scenario: The delete control is not offered on a closed bloque
- **WHEN** the manager views the orders of a closed bloque
- **THEN** no control to delete an order is available

### Requirement: An order's items keep their submitted order
The system SHALL store an order's items in the order they were submitted — by the
customer form or by the back office alike — and SHALL return them in that same
order wherever the order's items are read. Replacing an order's items SHALL
replace the order too: the new list's order is the submitted order of the
replacement. No separate sort key or timestamp is stored; the persisted sequence
itself is the order.

#### Scenario: Items come back in the order they were submitted
- **WHEN** an order is created with items for products Z, then A, then M
- **THEN** reading that order returns its items as Z, then A, then M

#### Scenario: Replacing items establishes the new order
- **WHEN** an order's items are replaced with a list ordered M, then Z
- **THEN** reading the order returns M, then Z

