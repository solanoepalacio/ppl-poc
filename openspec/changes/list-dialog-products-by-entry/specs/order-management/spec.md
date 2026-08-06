## ADDED Requirements

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
