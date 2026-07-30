## MODIFIED Requirements

### Requirement: Back-office views omit titles already conveyed by the navigation
The back-office orders and production views SHALL NOT display a page title that merely repeats the name of the active navigation tab. The persistent navigation's active tab is the sole indicator of which view is shown. This applies to both category production views (**Producción salados** and **Producción dulces**).

#### Scenario: Orders view has no redundant title
- **WHEN** the manager opens the orders view with the Órdenes tab active
- **THEN** no `Órdenes` page title is shown above the view content

#### Scenario: Production views have no redundant title
- **WHEN** the manager opens a production view with its Producción salados or Producción dulces tab active
- **THEN** no page title repeating the active tab's name is shown above the view content

### Requirement: Production view omits explanatory copy
The back-office production views SHALL NOT display an explanatory paragraph describing what the list contains. The bloque picker and the per-item list convey the content on their own. The empty-state message shown when there is nothing to produce is not explanatory copy and SHALL remain. This applies to both category production views.

#### Scenario: No explanatory paragraph above the production list
- **WHEN** the manager opens a production view for a bloque with items to produce
- **THEN** no explanatory paragraph is shown between the bloque picker and the list

#### Scenario: Empty-state message is retained
- **WHEN** a production view is shown for a bloque with nothing to produce in that category
- **THEN** the empty-state message is still shown
