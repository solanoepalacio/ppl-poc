# order-create-presentation Specification

## Purpose

Defines how order creation is presented in the back office: launched as a modal from the orders view, client-first, for recording an order's contents directly. Issuing a shareable customer link is a separate, single-purpose trigger and modal in the bloque toolbar next to it.
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
The orders view SHALL present a **Generar link** trigger in the bloque toolbar, next to the **Agregar pedido** trigger. Activating it SHALL open a dedicated link-generation modal — separate from the order-creation modal — in which the manager selects a client and generates a shareable tokenized order link bound to that client. The generated link SHALL be presented in that modal for the manager to copy and share, without revealing or requiring the catalog items list. After the link is generated, the selected client SHALL remain shown as a locked (read-only) selection so it is clear who the link is for, and a copy control SHALL sit directly with the generated link. This reuses the existing order-link generation behavior. The trigger is only meaningful for the open bloque, so it SHALL be grayed out and unclickable when the selected bloque is not the open one.

#### Scenario: Generar link trigger is present next to Agregar pedido
- **WHEN** the manager opens the orders-by-day view
- **THEN** a Generar link trigger is shown in the bloque toolbar next to the Agregar pedido trigger

#### Scenario: Manager generates a link from its own modal
- **WHEN** the manager activates Generar link, selects a client, and confirms
- **THEN** the system generates a tokenized order link bound to that client
- **AND** presents the link in the dedicated link-generation modal for the manager to copy and share
- **AND** the order-creation modal is not involved

#### Scenario: Client stays locked with the generated link
- **WHEN** the manager has generated the link
- **THEN** the selected client is still shown as a locked, read-only selection
- **AND** a copy control sits directly with the generated link

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

### Requirement: Adding a product gives placement feedback
When the manager picks a product from the search results, the system SHALL close the search results and SHALL reveal that product's row in the added-products list — scrolling it into view when it is off-screen — and SHALL briefly highlight the row, so the manager can see that the product was added and where it landed. The highlight is transient and SHALL fade on its own.

#### Scenario: Picking closes the results and reveals the row
- **WHEN** the manager picks a product from the search results
- **THEN** the search results close
- **AND** the product's row in the added-products list is shown and briefly highlighted

#### Scenario: An off-screen added product is scrolled into view
- **WHEN** the picked product's row would fall outside the visible area of the added-products list
- **THEN** the list scrolls so that the product's row is brought into view

#### Scenario: The highlight is temporary
- **WHEN** a product's row has been highlighted after being added
- **THEN** the highlight fades on its own without further action

### Requirement: Escape closes an open picker before the modal
While a picker's dropdown — the client selector or the product search — is open, pressing Escape SHALL close only that dropdown and SHALL NOT close the order-creation modal. When no picker dropdown is open, pressing Escape SHALL close the modal as usual.

#### Scenario: Escape with a picker dropdown open closes only the dropdown
- **WHEN** the client selector's or product search's dropdown is open and the manager presses Escape
- **THEN** that dropdown closes
- **AND** the order-creation modal stays open

#### Scenario: Escape with no dropdown open closes the modal
- **WHEN** no picker dropdown is open and the manager presses Escape
- **THEN** the order-creation modal closes

### Requirement: Creation modal is client-first for direct order entry
The order-creation modal SHALL present a client selector first — a control that lists the directory's selectable clients and lets the manager narrow them by typing part of a name — together with a product search for adding items, and a single action button labelled **Agregar pedido**. The modal SHALL NOT offer link generation; that path has its own trigger and modal (see *Generar link produces a shareable customer link*). The modal SHALL NOT list the full catalog; items are added individually through the product search (see *Order contents are entered by searching and adding products*). The Agregar pedido action SHALL require a client to be selected before it can act.

#### Scenario: Modal opens on the client-selection step
- **WHEN** the order-creation modal opens
- **THEN** it shows the client selector, the product search, and the single Agregar pedido button
- **AND** it does not list the full catalog
- **AND** it does not present a Generar link action

#### Scenario: Manager filters the client list by typing
- **WHEN** the manager types part of a client name into the selector
- **THEN** the selector narrows to the clients whose name matches what was typed

#### Scenario: Agregar pedido gated by client selection
- **WHEN** no client is selected
- **THEN** the Agregar pedido action is unavailable until a client is selected

### Requirement: Creation modal omits explanatory copy
The order-creation modal SHALL NOT display explanatory paragraphs framing how to use it (e.g. "Ingresá la orden directamente cuando la tomás vos.", "Registrá una orden recibida por teléfono, WhatsApp o en persona."). The **Agregar pedido** action together with the client selector and product search SHALL communicate what the modal does on their own.

#### Scenario: No explanatory paragraphs in the modal
- **WHEN** the order-creation modal is shown
- **THEN** it does not present explanatory framing paragraphs

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

