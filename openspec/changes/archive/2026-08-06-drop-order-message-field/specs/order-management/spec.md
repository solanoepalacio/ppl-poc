## MODIFIED Requirements

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
