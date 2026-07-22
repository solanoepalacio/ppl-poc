# order-create-presentation Specification

## Purpose

Defines how order creation is presented in the back office: launched as a modal from the orders view, client-first with a two-path choice between generating a shareable customer link and loading content for direct entry.
## Requirements
### Requirement: Order creation is launched from the orders view
The back office SHALL let the manager start creating an order from the orders-by-day view, without navigating to a separate page. The orders view SHALL present an order-creation trigger positioned near the day picker at the top of the view. Activating the trigger SHALL open the order-creation modal over the orders view. There SHALL NOT be a separate route or page dedicated to order creation.

#### Scenario: Trigger is present on the orders view
- **WHEN** the manager opens the orders-by-day view
- **THEN** an order-creation trigger is shown near the day picker at the top of the view

#### Scenario: Trigger opens the creation modal
- **WHEN** the manager activates the order-creation trigger
- **THEN** the order-creation modal opens over the orders view
- **AND** the manager remains on the orders view behind it

#### Scenario: Closing the modal returns to the orders view
- **WHEN** the manager closes the order-creation modal
- **THEN** the modal is dismissed and the orders view is shown unchanged

### Requirement: Generar link produces a shareable customer link
From the order-creation modal, choosing **Generar link** SHALL generate a shareable tokenized order link bound to the selected client and present that link to the manager to share, without revealing or requiring the catalog items list. This reuses the existing order-link generation behavior.

#### Scenario: Manager generates a link from the modal
- **WHEN** the manager selects a client and activates Generar link
- **THEN** the system generates a tokenized order link bound to that client
- **AND** presents the link in the modal for the manager to copy and share

### Requirement: Creation modal omits per-path explanatory copy
The order-creation modal SHALL NOT display the explanatory paragraphs that previously framed the two paths (e.g. "Ingresá la orden directamente cuando la tomás vos.", "Generá un enlace para compartir con el cliente…", "Registrá una orden recibida por teléfono, WhatsApp o en persona."). The two labelled buttons SHALL communicate the available paths on their own. Inline result text (e.g. the generated link) is not explanatory copy and SHALL remain.

#### Scenario: No explanatory paragraphs in the modal
- **WHEN** the order-creation modal is shown
- **THEN** it does not present the previous per-path explanatory paragraphs

#### Scenario: Functional inline text is retained
- **WHEN** a link has been generated
- **THEN** the generated-link result is still shown

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

