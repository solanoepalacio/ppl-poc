## MODIFIED Requirements

### Requirement: Back office surfaces the day's production totals
The back office SHALL present the day's per-item production totals on a dedicated production view, reachable from the persistent back-office navigation alongside the link generator and the orders-by-day view, reflecting the current totals each time the view is loaded for the selected day.

#### Scenario: Manager views the day's production totals
- **WHEN** the manager opens the back-office production view for a day
- **THEN** the system shows each product to be produced that day with its summed quantity

#### Scenario: Totals reflect the selected day
- **WHEN** the manager selects a different day on the production view
- **THEN** the production totals shown correspond to that day
