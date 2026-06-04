## MODIFIED Requirements

### Requirement: Back office shows orders by day
The back office SHALL present orders grouped by the day they were created as the primary view, defaulting to the current day, so the manager can forward them to the production line. Each listed order SHALL show its status, items, and the associated phone number. Selecting a day in the orders view SHALL immediately show that day's orders without requiring any separate view or submit action.

#### Scenario: Manager views the day's orders
- **WHEN** the manager opens the back-office orders view
- **THEN** the system shows the orders created that day, each with its status, items, and phone number

#### Scenario: Manager selects a different day
- **WHEN** the manager selects a specific day in the orders view date-picker
- **THEN** the system immediately shows the orders created on that day
- **AND** no separate view or submit action is required to render them
