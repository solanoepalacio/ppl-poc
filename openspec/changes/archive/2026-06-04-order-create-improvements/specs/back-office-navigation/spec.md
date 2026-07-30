## MODIFIED Requirements

### Requirement: Persistent navigation across back-office views
The back office SHALL present a persistent navigation, visible on every back-office view, with one link to each of the three views labelled **Órdenes** (orders by day), **Crear orden** (order creation), and **Producción** (production totals). The **Crear orden** view SHALL host both order-creation paths — generating a shareable customer link and recording an order directly by adding items — as a single destination. Selecting a link SHALL navigate to that view. The navigation SHALL indicate which view is currently active.

#### Scenario: Navigation is present on each view
- **WHEN** the manager is on any of the orders, order-creation, or production views
- **THEN** the navigation is shown with links to Órdenes, Crear orden, and Producción

#### Scenario: Navigating between views
- **WHEN** the manager selects a navigation link
- **THEN** the corresponding view is shown

#### Scenario: Active view is indicated
- **WHEN** the manager is on one of the back-office views
- **THEN** the navigation indicates that view as the active one

#### Scenario: Crear orden hosts both creation paths
- **WHEN** the manager opens the Crear orden view
- **THEN** the view offers both creating an order by generating a customer link and recording an order directly by adding items
