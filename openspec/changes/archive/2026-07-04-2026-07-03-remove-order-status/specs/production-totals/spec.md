## REMOVED Requirements

### Requirement: Only production-relevant statuses are counted
**Reason**: Order status is removed, so there is no status to filter production totals by. Totals now sum every order's items in the bloque; a mistaken order is excluded by deleting it, not by re-tagging its status.
**Migration**: The status `WHERE` filter is dropped from the totals computation; managers delete an order to keep its items out of the totals.

## MODIFIED Requirements

### Requirement: Production totals aggregate item quantities for a bloque
The system SHALL compute, for a given production bloque, the total quantity to produce of each product by summing the quantities of that product across every order in that bloque. There is no status filter; to exclude a mistaken order from the totals the manager deletes it. The result SHALL contain one entry per product that has a positive total, each carrying the product's identifier, its name, and the summed quantity.

#### Scenario: Quantities for the same product are summed across orders
- **WHEN** two orders in the bloque each contain product P, with quantities 3 and 2
- **THEN** the production totals include a single entry for product P with quantity 5

#### Scenario: Every order in the bloque contributes
- **WHEN** any order in the bloque contains product P
- **THEN** that order's quantity of P is included in P's total, regardless of how the order was created

#### Scenario: Each entry carries the product name
- **WHEN** an order in the bloque contains product P
- **THEN** the production totals entry for P includes P's identifier and its product name

#### Scenario: Products with no demand are omitted
- **WHEN** no order in the bloque contains product Q
- **THEN** the production totals contain no entry for product Q

#### Scenario: A deleted order drops out of the totals
- **WHEN** the manager deletes an order that contained product P
- **THEN** that order's quantity of P no longer contributes to P's total
