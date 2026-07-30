## MODIFIED Requirements

### Requirement: Instrumented back-office events

The back-office SHALL emit custom events for its primary management actions.

#### Scenario: Order link generated and copied
- **WHEN** a manager generates a shareable order link
- **THEN** an `order_link_generated` event is emitted
- **AND** when the manager copies that link, an `order_link_copied` event is emitted

#### Scenario: Direct order created
- **WHEN** a manager creates an order directly from the back-office
- **THEN** an `order_created_direct` event is emitted with the item count and
  total quantity

#### Scenario: Order edited or deleted
- **WHEN** a manager edits an order's items
- **THEN** an `order_items_edited` event is emitted
- **AND WHEN** a manager deletes an order, an `order_deleted` event is emitted
