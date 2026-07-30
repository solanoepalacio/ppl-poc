## ADDED Requirements

### Requirement: Order status control is labelled, not color-coded
The back-office order status control SHALL be preceded by a visible **`Estado`**
label and SHALL NOT rely on a colored status dot to convey the current status.
The status itself is presented by the selector's chosen option; the label names
the control.

#### Scenario: Status control shows the Estado label
- **WHEN** the manager views an order in the orders-by-day view
- **THEN** the status control is preceded by a visible `Estado` label

#### Scenario: No status dot is shown
- **WHEN** the order status control is rendered
- **THEN** no colored status dot is shown beside the selector

### Requirement: Action button rows carry no trailing separator
A row of action buttons in the back office SHALL NOT render a separator line
beneath it. This covers the order card's action controls (the **Editar
artículos** and **Eliminar** buttons) in the orders-by-day view and the
order-creation modal's path buttons (**Generar link** and **Cargar contenido**).
A card's own boundary is the only divider between one order and the next.

#### Scenario: No separator under the card actions
- **WHEN** an order card is rendered with its Editar artículos and Eliminar buttons
- **THEN** no horizontal separator line is shown beneath those buttons

#### Scenario: No separator under the creation modal's path buttons
- **WHEN** the order-creation modal shows its Generar link and Cargar contenido buttons
- **THEN** no horizontal separator line is shown beneath those buttons

### Requirement: Back-office views omit titles already conveyed by the navigation
The back-office orders and production views SHALL NOT display a page title that
merely repeats the name of the active navigation tab. The persistent navigation's
active tab is the sole indicator of which view is shown.

#### Scenario: Orders view has no redundant title
- **WHEN** the manager opens the orders-by-day view with the Órdenes tab active
- **THEN** no `Órdenes` page title is shown above the view content

#### Scenario: Production view has no redundant title
- **WHEN** the manager opens the production view with the Producción tab active
- **THEN** no `Producción diaria` page title is shown above the view content

### Requirement: Production view omits explanatory copy
The back-office production view SHALL NOT display an explanatory paragraph
describing what the list contains (e.g. `Artículos a producir el … (órdenes
pendientes, emitidas y finalizadas).`). The day picker and the per-item list
convey the content on their own. The empty-state message shown when there is
nothing to produce is not explanatory copy and SHALL remain.

#### Scenario: No explanatory paragraph above the production list
- **WHEN** the manager opens the production view for a day with items to produce
- **THEN** no explanatory paragraph is shown between the day picker and the list

#### Scenario: Empty-state message is retained
- **WHEN** the production view is shown for a day with nothing to produce
- **THEN** the empty-state message is still shown
