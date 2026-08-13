## MODIFIED Requirements

### Requirement: Production totals aggregate item quantities for a bloque
The system SHALL compute, for a given production bloque, the demand for each product by summing the quantities of that product across every order in that bloque. There is no status filter; to exclude a mistaken order from the totals the manager deletes it. The result SHALL contain one entry per product with positive demand **or a positive threshold**, each carrying the product's identifier, its name, the summed demand, the bloque's recorded existencia for that product, the bloque's recorded real production for that product, and the net quantity to produce (see *Production totals expose existencia, real production, and the net to produce*). A product with neither demand nor a threshold SHALL be omitted.

A product SHALL therefore be able to reach the totals without appearing in a single order. That is the point of a threshold: the product nobody ordered today is exactly the one that quietly runs out, and a list built only from orders can never mention it. An inactive product SHALL NOT be added to the totals by its threshold — it is not to be baked — though one already ordered in the bloque SHALL keep its entry, since that demand is real and somebody is waiting for it.

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
- **WHEN** no order in the bloque contains product Q, and Q's threshold is zero
- **THEN** the production totals contain no entry for product Q

#### Scenario: A product with a threshold appears without any orders
- **WHEN** no order in the bloque contains product Q, and Q has a positive threshold
- **THEN** the production totals include an entry for Q with demand 0

#### Scenario: A retired product is not raised by its threshold
- **WHEN** product Q is inactive and has a positive threshold, and no order in the bloque contains it
- **THEN** the production totals contain no entry for product Q

#### Scenario: A deleted order drops out of the totals
- **WHEN** the manager deletes an order that contained product P
- **THEN** that order's quantity of P no longer contributes to P's demand

### Requirement: Production totals expose existencia, real production, and the net to produce
For each product in the totals, the system SHALL report the bloque's recorded
existencia (stock already on hand), the bloque's recorded real production (how
much has actually been produced so far), and the net quantity to produce,
computed as the product's threshold plus demand, minus existencia, minus real
production, and floored at zero.

Equivalently, it is what the product is short of its threshold once the orders
are served — with a threshold of zero, which is the default, it reduces to demand
minus the two deductions, the rule that held before thresholds existed. The two
add rather than compete: the units a customer ordered leave the shelf, so covering
an order and holding a threshold are both to be baked.

The net to produce SHALL therefore express what is **still missing**, not what
was originally needed: it falls as real production is recorded and reaches zero
once the product is covered.

When the deductions together meet or exceed threshold plus demand the net to
produce SHALL be zero, never negative — surplus is not counted against other
products. A product with demand SHALL remain in the totals regardless of whether
the deductions meet or exceed it; only products with neither demand nor a
threshold are omitted. This is deliberately independent of what the production
views display: the totals keep reporting a covered product at zero so the figure
remains available and auditable on the orders view, while the views choose not to
show it (see *Back office surfaces the bloque's outstanding production in two
columns*). A product without a recorded existencia entry SHALL be treated as
existencia zero, and one without recorded real production as real production
zero.

#### Scenario: Existencia reduces the net to produce
- **WHEN** product P is ordered for a total of 8 in the bloque, the bloque records existencia of 3 for P, and no real production for P
- **THEN** the production totals entry for P has demand 8, existencia 3, real production 0, and a net to produce of 5

#### Scenario: Real production reduces the net to produce
- **WHEN** product P is ordered for a total of 8 in the bloque, the bloque records no existencia for P, and real production of 3 for P
- **THEN** the production totals entry for P has demand 8, existencia 0, real production 3, and a net to produce of 5

#### Scenario: Both deductions apply together
- **WHEN** product P is ordered for a total of 10 in the bloque, the bloque records existencia of 2 for P, and real production of 6 for P
- **THEN** the production totals entry for P has demand 10, existencia 2, real production 6, and a net to produce of 2

#### Scenario: A threshold raises the net to produce
- **WHEN** product P has a threshold of 100, no orders in the bloque, existencia of 50 and no real production
- **THEN** the production totals entry for P has a net to produce of 50

#### Scenario: A threshold and demand add
- **WHEN** product P has a threshold of 100, is ordered for a total of 20 in the bloque, and the bloque records existencia of 50 and no real production
- **THEN** the production totals entry for P has a net to produce of 70

#### Scenario: A product at its threshold nets zero
- **WHEN** product P has a threshold of 100, no orders in the bloque, and existencia of 100
- **THEN** the production totals entry for P has a net to produce of 0

#### Scenario: Existencia equal to demand nets zero but stays
- **WHEN** product P is ordered for a total of 8 in the bloque, has no threshold, and the bloque records existencia of exactly 8 for P
- **THEN** the production totals still include P, with demand 8, existencia 8, and a net to produce of 0

#### Scenario: Existencia exceeding demand floors the net at zero
- **WHEN** product P is ordered for a total of 4 in the bloque, has no threshold, and the bloque records existencia of 9 for P
- **THEN** the production totals include P with demand 4, existencia 9, and a net to produce of 0

#### Scenario: Deductions exceeding demand floor the net at zero
- **WHEN** product P is ordered for a total of 4 in the bloque, has no threshold, the bloque records existencia of 3 for P, and real production of 5 for P
- **THEN** the production totals include P with demand 4, existencia 3, real production 5, and a net to produce of 0

#### Scenario: A product with no recorded existencia defaults to zero
- **WHEN** product P is ordered in the bloque and the bloque records no existencia for P
- **THEN** P's existencia is 0 and its net to produce equals its threshold plus its demand minus its real production

#### Scenario: A product with no recorded real production defaults to zero
- **WHEN** product P is ordered in the bloque and the bloque records no real production for P
- **THEN** P's real production is 0 and its net to produce equals its threshold plus its demand minus its existencia

#### Scenario: A fully produced product nets zero and stays in the totals
- **WHEN** product P is ordered for a total of 12 in the bloque, has no threshold, and the bloque records real production of exactly 12 for P
- **THEN** the production totals still include P, with demand 12, real production 12, and a net to produce of 0
