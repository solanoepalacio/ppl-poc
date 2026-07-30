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
The system SHALL compute, for a given production bloque, the demand for each product by summing the quantities of that product across every order in that bloque. There is no status filter; to exclude a mistaken order from the totals the manager deletes it. The result SHALL contain one entry per product with positive demand, each carrying the product's identifier, its name, the summed demand, the bloque's recorded existencia for that product, and the net quantity to produce (see *Production totals expose existencia and the net to produce*). Products with no demand SHALL be omitted.

#### Scenario: Quantities for the same product are summed across orders
- **WHEN** two orders in the bloque each contain product P, with quantities 3 and 2
- **THEN** the production totals include a single entry for product P with demand 5

#### Scenario: Every order in the bloque contributes
- **WHEN** any order in the bloque contains product P
- **THEN** that order's quantity of P is included in P's demand, regardless of how the order was created

#### Scenario: Each entry carries the product name
- **WHEN** an order in the bloque contains product P
- **THEN** the production totals entry for P includes P's identifier and its product name

#### Scenario: Products with no demand are omitted
- **WHEN** no order in the bloque contains product Q
- **THEN** the production totals contain no entry for product Q

#### Scenario: A deleted order drops out of the totals
- **WHEN** the manager deletes an order that contained product P
- **THEN** that order's quantity of P no longer contributes to P's demand

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
The back office SHALL present the per-item production totals on two dedicated production views, one per production category — **Producción salados** (`salty`) and **Producción dulces** (`sweet`) — each reachable from the persistent back-office navigation alongside the orders view and the bloques view. Each view SHALL show only the totals for products in its category, always for the currently open (latest) bloque, reflecting the current totals each time the view is loaded. For each product the view SHALL show three figures: the total needed (demand), the existing stock (existencia), and the difference (net to produce), which is never negative — a product covered by existencia shows zero. The production views SHALL NOT offer a bloque selector.

#### Scenario: Manager views one line's production totals
- **WHEN** the manager opens the **Producción salados** view
- **THEN** the system shows each `salty` product ordered for the open bloque with its demand, its existencia, and the net to produce
- **AND** no `sweet` products are shown

#### Scenario: Each line has its own view
- **WHEN** the manager opens the **Producción dulces** view
- **THEN** the system shows each `sweet` product ordered for the open bloque with its demand, its existencia, and the net to produce
- **AND** no `salty` products are shown

#### Scenario: Each product shows needed, stock, and difference
- **WHEN** product P is ordered for a total of 8 in the open bloque and the bloque records existencia of 3 for P
- **THEN** P's row shows a demand of 8, an existencia of 3, and a net to produce of 5

#### Scenario: A covered product shows zero to produce
- **WHEN** product P is ordered in the open bloque and its existencia meets or exceeds its demand
- **THEN** P's row shows its demand and existencia with a net to produce of 0

#### Scenario: The production views always show the open bloque
- **WHEN** the manager opens a production view
- **THEN** the production totals shown are for the currently open bloque and that view's category
- **AND** the view offers no control to select a different bloque

### Requirement: Production totals expose existencia and the net to produce
For each product with demand, the system SHALL report the bloque's recorded existencia (stock already on hand) and the net quantity to produce, computed as demand minus existencia and floored at zero. When existencia meets or exceeds demand the net to produce SHALL be zero, never negative — surplus stock is not counted against other products. A product with demand SHALL remain in the totals regardless of whether existencia meets or exceeds it; only products with no demand are omitted. A product without a recorded existencia entry SHALL be treated as existencia zero, so its net equals its demand.

#### Scenario: Existencia reduces the net to produce
- **WHEN** product P is ordered for a total of 8 in the bloque and the bloque records existencia of 3 for P
- **THEN** the production totals entry for P has demand 8, existencia 3, and a net to produce of 5

#### Scenario: Existencia equal to demand nets zero but stays
- **WHEN** product P is ordered for a total of 8 in the bloque and the bloque records existencia of exactly 8 for P
- **THEN** the production totals still include P, with demand 8, existencia 8, and a net to produce of 0

#### Scenario: Existencia exceeding demand floors the net at zero
- **WHEN** product P is ordered for a total of 4 in the bloque and the bloque records existencia of 9 for P
- **THEN** the production totals include P with demand 4, existencia 9, and a net to produce of 0

#### Scenario: A product with no recorded existencia defaults to zero
- **WHEN** product P is ordered in the bloque and the bloque records no existencia for P
- **THEN** P's existencia is 0 and its net to produce equals its demand

