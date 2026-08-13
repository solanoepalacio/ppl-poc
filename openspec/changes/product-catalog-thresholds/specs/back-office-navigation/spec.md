## MODIFIED Requirements

### Requirement: Persistent navigation across back-office views
The back office SHALL present a persistent navigation, visible on every back-office view, with one link to each of its views labelled **Pedidos** (orders by bloque), **Producción salados** (savory-line production totals), **Producción dulces** (sweet-line production totals), **Clientes** (the client directory), **Productos** (the product catalog), and **Revisar Pedidos** (the bloque's orders grouped by client). Neither order creation nor bloque management SHALL be a standalone navigation destination; both are launched from the orders view. Selecting a link SHALL navigate to that view. The navigation SHALL indicate which view is currently active.

Managing the directory is its own destination rather than something reached from the orders view, because it is not part of recording an order: it is done rarely, before or after the day's orders, and the manager arrives at it with that intent. The catalog is its own destination for the same reason. Reviewing the bloque's orders by client is its own destination for a different reason: it is read by the people packing, who never open the orders view at all.

#### Scenario: Navigation is present on each view
- **WHEN** the manager is on any back-office view
- **THEN** the navigation is shown with links to Pedidos, Producción salados, Producción dulces, Clientes, Productos, and Revisar Pedidos
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

#### Scenario: Clientes is a navigation destination
- **WHEN** the manager selects the Clientes link
- **THEN** the client directory view is shown
- **AND** the navigation indicates Clientes as the active view

#### Scenario: Productos is a navigation destination
- **WHEN** the manager selects the Productos link
- **THEN** the product catalog view is shown
- **AND** the navigation indicates Productos as the active view

#### Scenario: Revisar Pedidos is a navigation destination
- **WHEN** the manager selects the Revisar Pedidos link
- **THEN** the read-only view of the bloque's orders grouped by client is shown
- **AND** the navigation indicates Revisar Pedidos as the active view
