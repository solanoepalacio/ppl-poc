## REMOVED Requirements

### Requirement: Content step uses three regions with only items scrollable
**Reason**: the third region was the optional message field, which this change
removes; both the requirement's title and half its scenarios are named after it.
Replaced by *Content step uses two regions with only items scrollable*, which
keeps every other guarantee — the pinned client selector, the search pinned at
the foot of the list, and the list as the only scrolling region.

## ADDED Requirements

### Requirement: Content step uses two regions with only items scrollable
The order-creation modal SHALL be laid out between its pinned title/close header and its pinned action buttons as: the client selector fixed at the top and the added-products list filling the rest. The product search SHALL be pinned at the bottom of the added-products list — it does not scroll with the list, and when the list is long enough to scroll it stays fixed at the bottom, rendered over the list's contents. The added-products list SHALL be the only scrollable region; the client selector and the product search SHALL remain visible regardless of how far the list is scrolled.

The modal SHALL NOT offer a field for the order's originating message. The height it occupied belongs to the added-products list, which is the region that runs out of room.

#### Scenario: Regions are present
- **WHEN** the order-creation modal is shown
- **THEN** the client selector is shown fixed at the top
- **AND** the added-products list is shown below it, with the product search pinned at the bottom of that list

#### Scenario: Only the added-products list scrolls
- **WHEN** the manager scrolls because the added-products list exceeds the available height
- **THEN** only that list scrolls within its region
- **AND** the client selector stays visible at the top
- **AND** the product search stays fixed at the bottom of the list, rendered over its contents
- **AND** the action buttons stay pinned below

#### Scenario: Search remains reachable without scrolling the list
- **WHEN** the added-products list is scrolled to any position
- **THEN** the client selector and the product search are still on screen without needing to scroll the list back

#### Scenario: No message field is offered
- **WHEN** the order-creation modal is shown
- **THEN** it presents no field for entering the order's originating message

## MODIFIED Requirements

### Requirement: Order contents are entered by searching and adding products
The order-creation modal SHALL let the manager build the order by adding products one at a time through a product search that filters the catalog by name (accent/case-insensitive); picking a result SHALL add that product to the order. The modal SHALL show only the products already added — each with a quantity control and a control to remove it — and SHALL NOT display the full catalog. A product already on the order SHALL NOT appear in the search results. Activating **Agregar pedido** SHALL create the order for the selected client with the added products, reusing the existing manual order-creation behavior, and on success the new order SHALL appear in the bloque's orders view.

The added-products list SHALL be ordered by **when each product was added** — earliest first — and MUST NOT be re-sorted alphabetically or by any other property of the product: the manager keys an order in as it is dictated, and the list has to read back in that sequence. Adding a product SHALL append it at the end; removing a product and adding it again SHALL append it as a new entry. This holds for every surface that shares the added-products list: when the item-edit dialog opens prefilled from an existing order, it SHALL list the items in the order they are stored on the order.

#### Scenario: Adding a product from the search
- **WHEN** the manager types part of a product name and picks a result
- **THEN** that product is added to the order and appears in the added-products list with a quantity control

#### Scenario: Only added products are shown
- **WHEN** the order-creation modal is shown
- **THEN** it lists only the products already added to the order
- **AND** it does not list the rest of the catalog

#### Scenario: An added product can be adjusted or removed
- **WHEN** the manager changes an added product's quantity or activates its remove control
- **THEN** the order reflects the new quantity, or the product is removed from the order

#### Scenario: Already-added products are excluded from the search
- **WHEN** a product is already on the order
- **THEN** it does not appear in the product-search results

#### Scenario: Submitting creates the order
- **WHEN** the manager has selected a client, added products, and activates Agregar pedido
- **THEN** the system creates an order for the selected client with the added products
- **AND** the new order appears in the orders view for its bloque

#### Scenario: Products are listed in the order they were added
- **WHEN** the manager adds product Z, then product A, then product M
- **THEN** the added-products list shows Z first, then A, then M
- **AND** does not reorder them alphabetically

#### Scenario: Changing a quantity does not move a product
- **WHEN** the manager changes the quantity of a product already on the list
- **THEN** that product keeps its position
- **AND** only its quantity changes

#### Scenario: A re-added product goes to the end
- **WHEN** a product is removed from the list and later added again
- **THEN** it appears at the end of the list rather than at its former position

#### Scenario: The edit dialog opens in the order's stored item order
- **WHEN** the manager opens the item-edit dialog for an order whose items were stored as Z, then A
- **THEN** the list shows Z first, then A
