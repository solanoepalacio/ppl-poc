# production-totals Specification

## Purpose

Defines how the system aggregates per-product quantities to produce for a production bloque from qualifying orders, and how the back office surfaces these production totals to the manager.

## Requirements

### Requirement: Catalog products carry a production category
Every catalog product SHALL belong to exactly one production category, either `sweet` (*dulces*) or `salty` (*salados*), reflecting the production line it is baked on. The category SHALL be part of the product's representation wherever the catalog is served.

#### Scenario: Each product has a category
- **WHEN** the catalog is served
- **THEN** every product carries a category of either `sweet` or `salty`

#### Scenario: Category distinguishes the two production lines
- **WHEN** a product is baked on the savory line
- **THEN** its category is `salty`
- **AND** a product baked on the sweet line has category `sweet`

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

### Requirement: Only production-relevant statuses are counted
The system SHALL include in the production totals only orders whose status is `pending`, `issued`, or `finished`. Orders with status `denied` or `ignored` MUST be excluded from the totals.

#### Scenario: Issued and finished orders contribute
- **WHEN** an `issued` order and a `finished` order in the bloque each contain product P
- **THEN** both orders' quantities of P are included in P's total

#### Scenario: Denied and ignored orders are excluded
- **WHEN** a `denied` order and an `ignored` order in the bloque reference product P
- **THEN** neither order's quantities contribute to P's total

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

### Requirement: Production totals can be scoped to a category
The system SHALL support computing production totals for a single production category. When a category is specified, only products in that category SHALL contribute to the totals; when no category is specified, products of both categories contribute.

#### Scenario: Totals scoped to one category exclude the other
- **WHEN** production totals are requested for the `salty` category
- **THEN** only `salty` products appear in the totals
- **AND** `sweet` products in the bloque do not contribute

#### Scenario: Unscoped totals include both categories
- **WHEN** production totals are requested without specifying a category
- **THEN** products of both categories contribute to the totals

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
