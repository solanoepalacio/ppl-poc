## ADDED Requirements

### Requirement: Catalog products carry a production category
Every catalog product SHALL belong to exactly one production category, either `sweet` (*dulces*) or `salty` (*salados*), reflecting the production line it is baked on. The category SHALL be part of the product's representation wherever the catalog is served.

#### Scenario: Each product has a category
- **WHEN** the catalog is served
- **THEN** every product carries a category of either `sweet` or `salty`

#### Scenario: Category distinguishes the two production lines
- **WHEN** a product is baked on the savory line
- **THEN** its category is `salty`
- **AND** a product baked on the sweet line has category `sweet`

### Requirement: Production totals can be scoped to a category
The system SHALL support computing production totals for a single production category. When a category is specified, only products in that category SHALL contribute to the totals; when no category is specified, products of both categories contribute.

#### Scenario: Totals scoped to one category exclude the other
- **WHEN** production totals are requested for the `salty` category
- **THEN** only `salty` products appear in the totals
- **AND** `sweet` products in the bloque do not contribute

#### Scenario: Unscoped totals include both categories
- **WHEN** production totals are requested without specifying a category
- **THEN** products of both categories contribute to the totals

## MODIFIED Requirements

### Requirement: Back office surfaces the bloque's production totals
The back office SHALL present a bloque's per-item production totals on two dedicated production views, one per production category — **Producción salados** (`salty`) and **Producción dulces** (`sweet`) — each reachable from the persistent back-office navigation alongside the orders view and the bloques view. Each view SHALL show only the totals for products in its category, defaulting to the open bloque and reflecting the current totals each time the view is loaded for the selected bloque. Selecting a bloque on a production view SHALL apply immediately, without any explicit submit action.

#### Scenario: Manager views one line's production totals
- **WHEN** the manager opens the **Producción salados** view for a bloque
- **THEN** the system shows each `salty` product to be produced for that bloque with its summed quantity
- **AND** no `sweet` products are shown

#### Scenario: Each line has its own view
- **WHEN** the manager opens the **Producción dulces** view for a bloque
- **THEN** the system shows each `sweet` product to be produced for that bloque with its summed quantity
- **AND** no `salty` products are shown

#### Scenario: Totals reflect the selected bloque
- **WHEN** the manager selects a different bloque on a production view
- **THEN** the production totals shown correspond to that bloque and that view's category
- **AND** no separate submit action is required to render them
