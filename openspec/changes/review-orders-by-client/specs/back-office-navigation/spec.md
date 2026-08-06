## MODIFIED Requirements

### Requirement: Back office lands on the orders view
The back office SHALL present the orders view (orders grouped by production bloque) as its landing destination. There SHALL NOT be a separate back-office home page; navigating to the back-office root SHALL result in the orders view.

#### Scenario: Opening the back office shows the orders view
- **WHEN** the manager navigates to the back-office root
- **THEN** the orders view is shown

#### Scenario: No standalone home page
- **WHEN** the manager is anywhere in the back office
- **THEN** no standalone landing page distinct from the three views is presented

### Requirement: Persistent navigation across back-office views
The back office SHALL present a persistent navigation, visible on every back-office view, with one link to each of its views labelled **Pedidos** (orders by bloque), **Producción salados** (savory-line production totals), and **Producción dulces** (sweet-line production totals). Neither order creation nor bloque management SHALL be a standalone navigation destination; both are launched from the orders view. Selecting a link SHALL navigate to that view. The navigation SHALL indicate which view is currently active.

#### Scenario: Navigation is present on each view
- **WHEN** the manager is on any back-office view
- **THEN** the navigation is shown with links to Pedidos, Producción salados, and Producción dulces
- **AND** there is no separate Bloques link

#### Scenario: Navigating between views
- **WHEN** the manager selects a navigation link
- **THEN** the corresponding view is shown

#### Scenario: Active view is indicated
- **WHEN** the manager is on one of the back-office views
- **THEN** the navigation indicates that view as the active one

#### Scenario: Each production line is its own destination
- **WHEN** the manager looks at the back-office navigation
- **THEN** there are two production links, one for salados and one for dulces
- **AND** selecting each shows only that line's production totals

#### Scenario: No standalone order-creation destination
- **WHEN** the manager looks at the back-office navigation
- **THEN** there is no separate order-creation navigation link
- **AND** order creation is reached from the orders view instead

#### Scenario: No standalone bloque-management destination
- **WHEN** the manager looks at the back-office navigation
- **THEN** there is no separate Bloques navigation link
- **AND** bloque management (closing the bloque, editing its stock) is reached from the orders view instead

#### Scenario: Revisar Pedidos is a navigation destination
- **WHEN** the manager selects the Revisar Pedidos link
- **THEN** the read-only view of the bloque's orders grouped by client is shown
- **AND** the navigation indicates Revisar Pedidos as the active view
