## MODIFIED Requirements

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

### Requirement: Back office surfaces the bloque's production totals
The back office SHALL present the per-item production totals on two dedicated production views, one per production category — **Producción salados** (`salty`) and **Producción dulces** (`sweet`) — each reachable from the persistent back-office navigation alongside the orders view and the bloques view. Each view SHALL show only the totals for products in its category, always for the currently open (latest) bloque, reflecting the current totals each time the view is loaded. For each product the view SHALL show three figures: the total needed (demand), the existing stock (existencia), and the difference (net to produce), the last of which MAY be negative. The production views SHALL NOT offer a bloque selector.

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

#### Scenario: The production views always show the open bloque
- **WHEN** the manager opens a production view
- **THEN** the production totals shown are for the currently open bloque and that view's category
- **AND** the view offers no control to select a different bloque

## REMOVED Requirements

### Requirement: Existencia is subtracted from production totals
**Reason**: Replaced by *Production totals expose existencia and the net to produce*. The system no longer collapses demand and existencia into a single floored net, nor drops products whose existencia covers their demand — it reports all three figures and keeps every product with demand.

## ADDED Requirements

### Requirement: Production totals expose existencia and the net to produce
For each product with demand, the system SHALL report the bloque's recorded existencia (stock already on hand) and the net quantity to produce, computed as demand minus existencia. The net SHALL NOT be floored: when existencia exceeds demand the net is negative, signalling surplus stock. A product with demand SHALL remain in the totals regardless of whether existencia meets or exceeds it; only products with no demand are omitted. A product without a recorded existencia entry SHALL be treated as existencia zero, so its net equals its demand.

#### Scenario: Existencia reduces the net to produce
- **WHEN** product P is ordered for a total of 8 in the bloque and the bloque records existencia of 3 for P
- **THEN** the production totals entry for P has demand 8, existencia 3, and a net to produce of 5

#### Scenario: Existencia equal to demand nets zero but stays
- **WHEN** product P is ordered for a total of 8 in the bloque and the bloque records existencia of exactly 8 for P
- **THEN** the production totals still include P, with demand 8, existencia 8, and a net to produce of 0

#### Scenario: Existencia exceeding demand nets negative
- **WHEN** product P is ordered for a total of 4 in the bloque and the bloque records existencia of 9 for P
- **THEN** the production totals include P with demand 4, existencia 9, and a net to produce of -5

#### Scenario: A product with no recorded existencia defaults to zero
- **WHEN** product P is ordered in the bloque and the bloque records no existencia for P
- **THEN** P's existencia is 0 and its net to produce equals its demand
