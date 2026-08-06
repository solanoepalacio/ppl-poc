## MODIFIED Requirements

### Requirement: Order contents are entered by searching and adding products
The order-creation modal SHALL let the manager build the order by adding products one at a time through a product search that filters the catalog by name (accent/case-insensitive); picking a result SHALL add that product to the order. The modal SHALL show only the products already added — each with a quantity control and a control to remove it — and SHALL NOT display the full catalog. A product already on the order SHALL NOT appear in the search results. Activating **Agregar pedido** SHALL create the order for the selected client with the added products and the optional message, reusing the existing manual order-creation behavior, and on success the new order SHALL appear in the bloque's orders view.

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
- **THEN** the system creates an order for the selected client with the added products and optional message
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
