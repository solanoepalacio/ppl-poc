## MODIFIED Requirements

### Requirement: Persistent navigation across back-office views
The back office SHALL present a persistent navigation, visible on every back-office view, with one link to each of its views labelled **Órdenes** (orders by bloque), **Producción salados** (savory-line production totals), **Producción dulces** (sweet-line production totals), and **Bloques** (production-bloque management). Order creation SHALL NOT be a standalone navigation destination; it is launched as a modal action from the orders view. Selecting a link SHALL navigate to that view. The navigation SHALL indicate which view is currently active.

#### Scenario: Navigation is present on each view
- **WHEN** the manager is on any back-office view
- **THEN** the navigation is shown with links to Órdenes, Producción salados, Producción dulces, and Bloques

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
- **THEN** there is no separate Crear orden navigation link
- **AND** order creation is reached from the orders view instead
