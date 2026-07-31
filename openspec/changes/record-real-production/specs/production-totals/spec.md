## MODIFIED Requirements

### Requirement: Production totals aggregate item quantities for a bloque
The system SHALL compute, for a given production bloque, the demand for each product by summing the quantities of that product across every order in that bloque. There is no status filter; to exclude a mistaken order from the totals the manager deletes it. The result SHALL contain one entry per product with positive demand, each carrying the product's identifier, its name, the summed demand, the bloque's recorded existencia for that product, the bloque's recorded real production for that product, and the net quantity to produce (see *Production totals expose existencia, real production, and the net to produce*). Products with no demand SHALL be omitted.

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

## REMOVED Requirements

### Requirement: Production totals expose existencia and the net to produce
**Reason**: It defines the net to produce as `demand − existencia`, and every one
of its scenarios asserts that two-term formula against specific numbers. Real
production is now a third term, so those scenarios do not merely need extra
detail — the arithmetic they state is no longer the arithmetic the system
performs. The requirement is replaced rather than edited because its subject
changes from one deduction to two, which its title also names.
**Migration**: See the new *Production totals expose existencia, real production,
and the net to produce* requirement below. Everything it guaranteed is carried
over: the floor at zero, surplus never charged against another product, a
product with demand staying in the totals regardless of the deductions, and a
missing entry counting as zero.

### Requirement: Back office surfaces the bloque's production totals in two columns
**Reason**: One of its scenarios guarantees that a product covered by its
existencia still shows a row reading zero. That no longer holds: now that real
production counts down against demand during the bloque, a product reaching zero
means it is *finished*, and a finished product is removed from the view instead
of occupying a row. The scenario has to disappear rather than change, and the
requirement's subject shifts from "the bloque's totals" to "what is still
outstanding", which its title names.
**Migration**: See the new *Back office surfaces the bloque's outstanding
production in two columns* requirement below. Everything else it guaranteed is
carried over unchanged: one view per production line, only that line's products,
always the currently open bloque, no bloque selector, the two-table alternating
split, and rows showing only the product name and the quantity to produce.

## ADDED Requirements

### Requirement: Production totals expose existencia, real production, and the net to produce
For each product with demand, the system SHALL report the bloque's recorded
existencia (stock already on hand), the bloque's recorded real production (how
much has actually been produced so far), and the net quantity to produce,
computed as demand minus existencia minus real production and floored at zero.

The net to produce SHALL therefore express what is **still missing**, not what
was originally needed: it falls as real production is recorded and reaches zero
once the product is covered.

When the deductions together meet or exceed demand the net to produce SHALL be
zero, never negative — surplus is not counted against other products. A product
with demand SHALL remain in the totals regardless of whether the deductions meet
or exceed it; only products with no demand are omitted. This is deliberately
independent of what the production views display: the totals keep reporting a
covered product at zero so the figure remains available and auditable, while the
views choose not to show it (see *Back office surfaces the bloque's outstanding
production in two columns*). A product without a recorded existencia entry SHALL
be treated as existencia zero, and one without recorded real production as real
production zero.

#### Scenario: Existencia reduces the net to produce
- **WHEN** product P is ordered for a total of 8 in the bloque, the bloque records existencia of 3 for P, and no real production for P
- **THEN** the production totals entry for P has demand 8, existencia 3, real production 0, and a net to produce of 5

#### Scenario: Real production reduces the net to produce
- **WHEN** product P is ordered for a total of 8 in the bloque, the bloque records no existencia for P, and real production of 3 for P
- **THEN** the production totals entry for P has demand 8, existencia 0, real production 3, and a net to produce of 5

#### Scenario: Both deductions apply together
- **WHEN** product P is ordered for a total of 10 in the bloque, the bloque records existencia of 2 for P, and real production of 6 for P
- **THEN** the production totals entry for P has demand 10, existencia 2, real production 6, and a net to produce of 2

#### Scenario: Existencia equal to demand nets zero but stays
- **WHEN** product P is ordered for a total of 8 in the bloque and the bloque records existencia of exactly 8 for P
- **THEN** the production totals still include P, with demand 8, existencia 8, and a net to produce of 0

#### Scenario: Existencia exceeding demand floors the net at zero
- **WHEN** product P is ordered for a total of 4 in the bloque and the bloque records existencia of 9 for P
- **THEN** the production totals include P with demand 4, existencia 9, and a net to produce of 0

#### Scenario: Deductions exceeding demand floor the net at zero
- **WHEN** product P is ordered for a total of 4 in the bloque, the bloque records existencia of 3 for P, and real production of 5 for P
- **THEN** the production totals include P with demand 4, existencia 3, real production 5, and a net to produce of 0

#### Scenario: A product with no recorded existencia defaults to zero
- **WHEN** product P is ordered in the bloque and the bloque records no existencia for P
- **THEN** P's existencia is 0 and its net to produce equals its demand minus its real production

#### Scenario: A product with no recorded real production defaults to zero
- **WHEN** product P is ordered in the bloque and the bloque records no real production for P
- **THEN** P's real production is 0 and its net to produce equals its demand minus its existencia

#### Scenario: A fully produced product nets zero and stays in the totals
- **WHEN** product P is ordered for a total of 12 in the bloque and the bloque records real production of exactly 12 for P
- **THEN** the production totals still include P, with demand 12, real production 12, and a net to produce of 0

### Requirement: Back office surfaces the bloque's outstanding production in two columns
The back office SHALL present what is still to be produced on two dedicated
production views, one per production category — **Producción salados** (`salty`)
and **Producción dulces** (`sweet`) — each reachable from the persistent
back-office navigation. Each view SHALL show only products in its category,
always for the currently open (latest) bloque, and SHALL NOT offer a bloque
selector.

Each view SHALL show **only products whose quantity to produce is greater than
zero**. A product covered by its existencia and its real production is finished,
and a finished product SHALL be omitted from the view rather than shown as a row
reading zero. The list is therefore a work queue that empties as the bloque is
worked through, not a record of everything ordered.

Each view SHALL lay its products out as **two tables side by side**, each
occupying half the available width, so that roughly twice as many products are
visible before the content scrolls. Products SHALL be distributed alternately
between the two tables — the first to the left, the second to the right, the
third to the left, and so on — so the list reads across before it reads down.

Each row SHALL show exactly two things: the product's name and the quantity to
produce. The demand, the recorded existencia and the recorded real production
SHALL NOT be displayed on these views.

#### Scenario: Manager views one line's outstanding production
- **WHEN** the manager opens the **Producción salados** view
- **THEN** the system shows each `salty` product still to produce for the open
  bloque with its quantity to produce
- **AND** no `sweet` products are shown

#### Scenario: Each line has its own view
- **WHEN** the manager opens the **Producción dulces** view
- **THEN** the system shows each `sweet` product still to produce for the open bloque
- **AND** no `salty` products are shown

#### Scenario: A finished product is not shown
- **WHEN** product P is ordered in the open bloque and its existencia and real
  production together meet or exceed its demand
- **THEN** P is not shown on the production view

#### Scenario: A partially produced product stays with what is left
- **WHEN** product P is ordered for a total of 10 and 4 have been produced
- **THEN** P is shown with a quantity to produce of 6

#### Scenario: A product reappears if its demand grows
- **WHEN** product P was finished and no longer shown, and a new order in the
  bloque raises its demand above what has been produced
- **THEN** P is shown again with the difference

#### Scenario: Everything finished leaves the view empty
- **WHEN** every product ordered in the open bloque has been fully produced
- **THEN** the view shows no products
- **AND** it says there is nothing to produce in that bloque

#### Scenario: Products are split across two tables
- **WHEN** a production view renders more than one product
- **THEN** the products are laid out in two tables side by side
- **AND** consecutive products alternate between the left and the right table

#### Scenario: Two products land one per table
- **WHEN** exactly two products have a quantity to produce
- **THEN** the left table shows the first and the right table shows the second

#### Scenario: Only the product and the quantity to produce are shown
- **WHEN** a product's row is rendered
- **THEN** it shows the product's name and its quantity to produce
- **AND** it shows neither the demand, nor the existencia, nor the real production

#### Scenario: The production views always show the open bloque
- **WHEN** the manager opens a production view
- **THEN** the products shown are for the currently open bloque and that view's
  category
- **AND** the view offers no control to select a different bloque
