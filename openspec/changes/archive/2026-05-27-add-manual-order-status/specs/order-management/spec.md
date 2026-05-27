## MODIFIED Requirements

### Requirement: Orders carry a status
Every order SHALL have a status that is exactly one of `pending`, `issued`, `denied`, `ignored`, or `finished`, reflecting its lifecycle stage: `pending` once created at link generation, `issued` once the customer confirms the order, `denied` once the customer chooses the WhatsApp fallback, `ignored` once the link's token expires while the order is still `pending`, and `finished` once the manager marks the order as completed.

#### Scenario: Status reflects the order's lifecycle stage
- **WHEN** an order's status is read
- **THEN** it is exactly one of `pending`, `issued`, `denied`, `ignored`, or `finished`

## ADDED Requirements

### Requirement: Manager can manually update an order's status
From the back office, the manager SHALL be able to set any persisted order's status to any of the valid statuses (`pending`, `issued`, `denied`, `ignored`, `finished`), regardless of the order's current status. The system MUST persist the chosen status and MUST reject any value outside the valid set, leaving the order unchanged on rejection.

#### Scenario: Manager marks an order as finished
- **WHEN** the manager sets an `issued` order's status to `finished`
- **THEN** the system persists the order's status as `finished`
- **AND** the back-office view reflects the new status

#### Scenario: Manager changes status freely
- **WHEN** the manager sets an order to any valid status that differs from its current status
- **THEN** the system persists the newly chosen status without restricting the transition

#### Scenario: Manager submits an invalid status
- **WHEN** a status update specifies a value that is not one of `pending`, `issued`, `denied`, `ignored`, or `finished`
- **THEN** the system rejects the update
- **AND** the order's status is left unchanged
