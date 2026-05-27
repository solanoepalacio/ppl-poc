# order-management Specification

## Purpose

Defines the order lifecycle status model, persistence of orders with their context, and the back-office view that groups orders by day for the manager to forward to the production line.

## Requirements

### Requirement: Orders carry a status
Every order SHALL have a status that is exactly one of `pending`, `issued`, `denied`, or `ignored`, reflecting its lifecycle stage: `pending` once created at link generation, `issued` once the customer confirms the order, `denied` once the customer chooses the WhatsApp fallback, and `ignored` once the link's token expires while the order is still `pending`.

#### Scenario: Status reflects the order's lifecycle stage
- **WHEN** an order's status is read
- **THEN** it is exactly one of `pending`, `issued`, `denied`, or `ignored`

### Requirement: Orders are persisted with their context
The system SHALL persist each order with the phone number bound to its token, its status, the time it was created, and its order items once the customer submits them. Stored orders MUST be retrievable for back-office viewing.

#### Scenario: Order is retrievable after creation
- **WHEN** an order has been created for a generated link
- **THEN** the system can retrieve it with its phone number, status, and creation time

#### Scenario: Items are persisted on confirmation
- **WHEN** a customer confirms an order with items
- **THEN** the system persists those items on the order

### Requirement: Back office shows orders by day
The back office SHALL present orders grouped by the day they were created as the primary view, defaulting to the current day, so the manager can forward them to the production line. Each listed order SHALL show its status, items, and the associated phone number.

#### Scenario: Manager views the day's orders
- **WHEN** the manager opens the back-office orders view
- **THEN** the system shows the orders created that day, each with its status, items, and phone number

#### Scenario: Manager selects a different day
- **WHEN** the manager selects a specific day
- **THEN** the system shows the orders created on that day
