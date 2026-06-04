# order-create-presentation Specification

## Purpose

Defines how order creation is presented in the back office: launched as a modal from the orders-by-day view, phone-first with a two-path choice between generating a shareable customer link and loading content for direct entry.

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

### Requirement: Creation modal is phone-first with a two-path choice
The order-creation modal SHALL present the back-office phone-entry control first, followed by exactly two action buttons labelled **Generar link** and **Cargar contenido**. The modal SHALL NOT show the catalog items list until the manager chooses to load content. Both buttons SHALL require a valid phone entry before they can act, consistent with the existing phone-entry validation.

#### Scenario: Modal opens on the phone-first step
- **WHEN** the order-creation modal opens
- **THEN** it shows the phone-entry control and the two buttons Generar link and Cargar contenido
- **AND** it does not yet show the catalog items list

#### Scenario: Path buttons gated by phone validity
- **WHEN** the phone entry is missing or does not form a valid number
- **THEN** the Generar link and Cargar contenido actions are unavailable until a valid phone is entered

### Requirement: Generar link produces a shareable customer link
From the order-creation modal, choosing **Generar link** SHALL generate a shareable tokenized order link bound to the entered phone number and present that link to the manager to share, without revealing or requiring the catalog items list. This reuses the existing order-link generation behavior.

#### Scenario: Manager generates a link from the modal
- **WHEN** the manager enters a valid phone and activates Generar link
- **THEN** the system generates a tokenized order link bound to that phone
- **AND** presents the link in the modal for the manager to copy and share

### Requirement: Cargar contenido reveals the items list for direct entry
From the order-creation modal, choosing **Cargar contenido** SHALL reveal the catalog items list with per-item quantity controls and the optional free-text message field, allowing the manager to record the order directly. Submitting the loaded content SHALL create the order from the entered phone, the chosen items, and the optional message, reusing the existing manual order-creation behavior, and on success SHALL reflect the new order in the day's orders view.

#### Scenario: Loading content reveals the items list
- **WHEN** the manager enters a valid phone and activates Cargar contenido
- **THEN** the modal reveals the catalog items list with quantity controls and the optional message field

#### Scenario: Submitting loaded content creates the order
- **WHEN** the manager, having loaded content, sets quantities and submits
- **THEN** the system creates an order bound to the entered phone with the chosen items and optional message
- **AND** the new order appears in the orders view for its day

### Requirement: Creation modal omits per-path explanatory copy
The order-creation modal SHALL NOT display the explanatory paragraphs that previously framed the two paths (e.g. "Ingresá la orden directamente cuando la tomás vos.", "Generá un enlace para compartir con el cliente…", "Registrá una orden recibida por teléfono, WhatsApp o en persona."). The two labelled buttons SHALL communicate the available paths on their own. Inline validation and result text (e.g. an invalid-number hint or the generated link) are not explanatory copy and SHALL remain.

#### Scenario: No explanatory paragraphs in the modal
- **WHEN** the order-creation modal is shown
- **THEN** it does not present the previous per-path explanatory paragraphs

#### Scenario: Functional inline text is retained
- **WHEN** the phone entry is invalid or a link has been generated
- **THEN** the corresponding inline validation hint or generated-link result is still shown
