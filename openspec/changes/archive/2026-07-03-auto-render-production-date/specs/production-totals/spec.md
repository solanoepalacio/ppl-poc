## MODIFIED Requirements

### Requirement: Back office surfaces the day's production totals
The back office SHALL present the day's per-item production totals on a dedicated production view, reachable from the persistent back-office navigation alongside the link generator and the orders-by-day view, reflecting the current totals each time the view is loaded for the selected day. Selecting a day on the production view SHALL apply immediately, without any explicit submit action: the view SHALL NOT present a separate "view"/submit control for the day selection.

#### Scenario: Manager views the day's production totals
- **WHEN** the manager opens the back-office production view for a day
- **THEN** the system shows each product to be produced that day with its summed quantity

#### Scenario: Totals reflect the selected day
- **WHEN** the manager selects a different day on the production view
- **THEN** the production totals shown correspond to that day

#### Scenario: Selecting a day applies without an explicit submit
- **WHEN** the manager selects a day in the production view's day picker
- **THEN** the system loads and shows that day's production totals without requiring any further action
- **AND** the production view presents no separate submit ("view") button for the day selection
