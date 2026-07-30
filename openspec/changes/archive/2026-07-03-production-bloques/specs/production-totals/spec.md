## RENAMED Requirements

- FROM: `### Requirement: Production totals aggregate item quantities for a day`
- TO: `### Requirement: Production totals aggregate item quantities for a bloque`

- FROM: `### Requirement: Production totals are scoped by day`
- TO: `### Requirement: Production totals are scoped by bloque`

- FROM: `### Requirement: Back office surfaces the day's production totals`
- TO: `### Requirement: Back office surfaces the bloque's production totals`

## MODIFIED Requirements

### Requirement: Production totals aggregate item quantities for a bloque
The system SHALL compute, for a given production bloque, the total quantity to produce of each product by summing the quantities of that product across all qualifying orders in that bloque. The result SHALL contain one entry per product that has a positive total, each carrying the product's identifier, its name, and the summed quantity.

#### Scenario: Quantities for the same product are summed across orders
- **WHEN** two qualifying orders in the bloque each contain product P, with quantities 3 and 2
- **THEN** the production totals include a single entry for product P with quantity 5

#### Scenario: Each entry carries the product name
- **WHEN** a qualifying order in the bloque contains product P
- **THEN** the production totals entry for P includes P's identifier and its product name

#### Scenario: Products with no demand are omitted
- **WHEN** no qualifying order in the bloque contains product Q
- **THEN** the production totals contain no entry for product Q

### Requirement: Production totals are scoped by bloque
The system SHALL compute production totals over the orders belonging to a single production bloque. When no bloque is specified, the system SHALL use the currently open bloque. When a bloque is specified by its identifier, the system SHALL use that bloque; if the identifier does not match a bloque, the system MUST reject the request. The response SHALL carry the resolved bloque alongside the totals.

#### Scenario: Defaults to the open bloque
- **WHEN** production totals are requested without specifying a bloque
- **THEN** the system returns totals for the orders in the currently open bloque
- **AND** the response identifies that bloque

#### Scenario: A specific bloque can be requested
- **WHEN** production totals are requested for a specified bloque identifier
- **THEN** the system returns totals for the orders in that bloque
- **AND** orders in other bloques do not contribute

#### Scenario: An unknown bloque is rejected
- **WHEN** production totals are requested for an identifier that matches no bloque
- **THEN** the system rejects the request

### Requirement: Back office surfaces the bloque's production totals
The back office SHALL present a bloque's per-item production totals on a dedicated production view, reachable from the persistent back-office navigation alongside the orders view and the bloques view, defaulting to the open bloque and reflecting the current totals each time the view is loaded for the selected bloque. Selecting a bloque on the production view SHALL apply immediately, without any explicit submit action.

#### Scenario: Manager views the bloque's production totals
- **WHEN** the manager opens the back-office production view for a bloque
- **THEN** the system shows each product to be produced for that bloque with its summed quantity

#### Scenario: Totals reflect the selected bloque
- **WHEN** the manager selects a different bloque on the production view
- **THEN** the production totals shown correspond to that bloque
- **AND** no separate submit action is required to render them
