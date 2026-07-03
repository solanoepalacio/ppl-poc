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

### Requirement: Cargar contenido reveals the items list for direct entry
From the order-creation modal, choosing **Cargar contenido** SHALL reveal the catalog items list with per-item quantity controls and the optional free-text message field, allowing the manager to record the order directly. Submitting the loaded content SHALL create the order for the selected client, the chosen items, and the optional message, reusing the existing manual order-creation behavior, and on success SHALL reflect the new order in the bloque's orders view.

#### Scenario: Loading content reveals the items list
- **WHEN** the manager selects a client and activates Cargar contenido
- **THEN** the modal reveals the catalog items list with quantity controls and the optional message field

#### Scenario: Submitting loaded content creates the order
- **WHEN** the manager, having loaded content, sets quantities and submits
- **THEN** the system creates an order for the selected client with the chosen items and optional message
- **AND** the new order appears in the orders view for its bloque

### Requirement: Creation modal omits per-path explanatory copy
The order-creation modal SHALL NOT display the explanatory paragraphs that previously framed the two paths (e.g. "Ingresá la orden directamente cuando la tomás vos.", "Generá un enlace para compartir con el cliente…", "Registrá una orden recibida por teléfono, WhatsApp o en persona."). The two labelled buttons SHALL communicate the available paths on their own. Inline result text (e.g. the generated link) is not explanatory copy and SHALL remain.

#### Scenario: No explanatory paragraphs in the modal
- **WHEN** the order-creation modal is shown
- **THEN** it does not present the previous per-path explanatory paragraphs

#### Scenario: Functional inline text is retained
- **WHEN** a link has been generated
- **THEN** the generated-link result is still shown

### Requirement: Content step uses three regions with only items scrollable
When the order-creation modal has loaded content (the items list is shown), the modal body SHALL be laid out as three regions: the client selector fixed at the top, the catalog items list in the middle, and the optional message field fixed at the bottom. The items list SHALL be the only scrollable region; the client selector and the message field SHALL remain visible regardless of how far the items list is scrolled. The modal title/close header and the action buttons SHALL remain pinned as before, above and below these regions respectively.

#### Scenario: Three regions are present after loading content
- **WHEN** the manager has activated Cargar contenido and the items list is shown
- **THEN** the client selector is shown fixed at the top of the modal body
- **AND** the catalog items list is shown between the selector and the message
- **AND** the optional message field is shown fixed at the bottom of the modal body

#### Scenario: Only the items list scrolls
- **WHEN** the manager scrolls the loaded content because the items list exceeds the available height
- **THEN** only the items list scrolls within its region
- **AND** the client selector stays visible at the top
- **AND** the message field stays visible at the bottom
- **AND** the action buttons stay pinned below

#### Scenario: Selector and message remain reachable without scrolling the items list
- **WHEN** the items list is scrolled to any position
- **THEN** the client selector and the message field are still on screen without needing to scroll the items list back

### Requirement: Creation modal is client-first with a two-path choice
The order-creation modal SHALL present a client selector first — a control that lists the directory's selectable clients and lets the manager narrow them by typing part of a name — followed by exactly two action buttons labelled **Generar link** and **Cargar contenido**. The modal SHALL NOT show the catalog items list until the manager chooses to load content. Both buttons SHALL require a client to be selected before they can act.

#### Scenario: Modal opens on the client-selection step
- **WHEN** the order-creation modal opens
- **THEN** it shows the client selector and the two buttons Generar link and Cargar contenido
- **AND** it does not yet show the catalog items list

#### Scenario: Manager filters the client list by typing
- **WHEN** the manager types part of a client name into the selector
- **THEN** the selector narrows to the clients whose name matches what was typed

#### Scenario: Path buttons gated by client selection
- **WHEN** no client is selected
- **THEN** the Generar link and Cargar contenido actions are unavailable until a client is selected

