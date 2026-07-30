## MODIFIED Requirements

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
