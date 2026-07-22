## MODIFIED Requirements

### Requirement: Creation modal is client-first with a two-path choice
The order-creation modal SHALL present a client selector first — a control that lists the directory's selectable clients and lets the manager narrow them by typing part of a name — together with a product search for adding items, and exactly two action buttons labelled **Generar link** and **Agregar pedido**. The modal SHALL NOT list the full catalog; items are added individually through the product search (see *Order contents are entered by searching and adding products*). Both buttons SHALL require a client to be selected before they can act.

#### Scenario: Modal opens on the client-selection step
- **WHEN** the order-creation modal opens
- **THEN** it shows the client selector, the product search, and the two buttons Generar link and Agregar pedido
- **AND** it does not list the full catalog

#### Scenario: Manager filters the client list by typing
- **WHEN** the manager types part of a client name into the selector
- **THEN** the selector narrows to the clients whose name matches what was typed

#### Scenario: Path buttons gated by client selection
- **WHEN** no client is selected
- **THEN** the Generar link and Agregar pedido actions are unavailable until a client is selected

### Requirement: Content step uses three regions with only items scrollable
The order-creation modal SHALL be laid out as three regions between its pinned title/close header and its pinned action buttons: the client selector and the product search fixed at the top, the list of added products in the middle, and the optional message field fixed at the bottom. The added-products list SHALL be the only scrollable region; the top selectors and the bottom message field SHALL remain visible regardless of how far the list is scrolled.

#### Scenario: Three regions are present
- **WHEN** the order-creation modal is shown
- **THEN** the client selector and product search are shown fixed at the top
- **AND** the added-products list is shown between them and the message
- **AND** the optional message field is shown fixed at the bottom

#### Scenario: Only the added-products list scrolls
- **WHEN** the manager scrolls because the added-products list exceeds the available height
- **THEN** only that list scrolls within its region
- **AND** the client selector and product search stay visible at the top
- **AND** the message field stays visible at the bottom
- **AND** the action buttons stay pinned below

#### Scenario: Selectors and message remain reachable without scrolling the list
- **WHEN** the added-products list is scrolled to any position
- **THEN** the top selectors and the message field are still on screen without needing to scroll the list back

## REMOVED Requirements

### Requirement: Cargar contenido reveals the items list for direct entry
**Reason**: The modal no longer has a separate "Cargar contenido" step that reveals the full catalog. Order entry is shown up-front, and items are added individually through a product search — see the added requirement *Order contents are entered by searching and adding products*, which carries the create-the-order behavior forward.

## ADDED Requirements

### Requirement: Order contents are entered by searching and adding products
The order-creation modal SHALL let the manager build the order by adding products one at a time through a product search that filters the catalog by name (accent/case-insensitive); picking a result SHALL add that product to the order. The modal SHALL show only the products already added — each with a quantity control and a control to remove it — and SHALL NOT display the full catalog. A product already on the order SHALL NOT appear in the search results. Activating **Agregar pedido** SHALL create the order for the selected client with the added products and the optional message, reusing the existing manual order-creation behavior, and on success the new order SHALL appear in the bloque's orders view.

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
