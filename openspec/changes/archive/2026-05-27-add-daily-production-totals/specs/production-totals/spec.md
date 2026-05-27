## ADDED Requirements

### Requirement: Production totals aggregate item quantities for a day
The system SHALL compute, for a given day, the total quantity to produce of each product by summing the quantities of that product across all qualifying orders created that day. The result SHALL contain one entry per product that has a positive total, each carrying the product's identifier, its name, and the summed quantity.

#### Scenario: Quantities for the same product are summed across orders
- **WHEN** two qualifying orders created on the day each contain product P, with quantities 3 and 2
- **THEN** the production totals include a single entry for product P with quantity 5

#### Scenario: Each entry carries the product name
- **WHEN** a qualifying order on the day contains product P
- **THEN** the production totals entry for P includes P's identifier and its product name

#### Scenario: Products with no demand are omitted
- **WHEN** no qualifying order on the day contains product Q
- **THEN** the production totals contain no entry for product Q

### Requirement: Only production-relevant statuses are counted
The system SHALL include in the production totals only orders whose status is `pending`, `issued`, or `finished`. Orders with status `denied` or `ignored` MUST be excluded from the totals.

#### Scenario: Issued and finished orders contribute
- **WHEN** an `issued` order and a `finished` order on the day each contain product P
- **THEN** both orders' quantities of P are included in P's total

#### Scenario: Denied and ignored orders are excluded
- **WHEN** a `denied` order and an `ignored` order on the day reference product P
- **THEN** neither order's quantities contribute to P's total

### Requirement: Production totals are scoped by day
The system SHALL compute production totals for the day the orders were created, using the same server-local day boundaries as the back-office day view. When no day is specified, the system SHALL use the current day. When a day is specified as `YYYY-MM-DD`, the system SHALL use that day.

#### Scenario: Defaults to the current day
- **WHEN** production totals are requested without specifying a day
- **THEN** the system returns totals for orders created on the current day

#### Scenario: A specific day can be requested
- **WHEN** production totals are requested for a specified day `YYYY-MM-DD`
- **THEN** the system returns totals for orders created on that day
- **AND** orders created on other days do not contribute

### Requirement: Back office surfaces the day's production totals
The back office SHALL present the day's per-item production totals on a dedicated production view, reachable from the back-office home alongside the link generator and the orders-by-day view, reflecting the current totals each time the view is loaded for the selected day.

#### Scenario: Manager views the day's production totals
- **WHEN** the manager opens the back-office production view for a day
- **THEN** the system shows each product to be produced that day with its summed quantity

#### Scenario: Totals reflect the selected day
- **WHEN** the manager selects a different day on the production view
- **THEN** the production totals shown correspond to that day
