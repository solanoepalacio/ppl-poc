## MODIFIED Requirements

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
