## MODIFIED Requirements

### Requirement: Generar link produces a shareable customer link
The orders view SHALL present a **Generar link** trigger in the bloque toolbar, next to the **Agregar pedido** trigger. Activating it SHALL open a dedicated link-generation modal — separate from the order-creation modal — in which the manager selects a client and generates a shareable tokenized order link bound to that client. The generated link SHALL be presented in that modal for the manager to copy and share, without revealing or requiring the catalog items list. This reuses the existing order-link generation behavior. The trigger is only meaningful for the open bloque, so it SHALL be grayed out and unclickable when the selected bloque is not the open one.

#### Scenario: Generar link trigger is present next to Agregar pedido
- **WHEN** the manager opens the orders-by-day view
- **THEN** a Generar link trigger is shown in the bloque toolbar next to the Agregar pedido trigger

#### Scenario: Manager generates a link from its own modal
- **WHEN** the manager activates Generar link, selects a client, and confirms
- **THEN** the system generates a tokenized order link bound to that client
- **AND** presents the link in the dedicated link-generation modal for the manager to copy and share
- **AND** the order-creation modal is not involved

## REMOVED Requirements

### Requirement: Creation modal is client-first with a two-path choice
**Reason**: Link generation moved out of the order-creation modal into its own toolbar trigger and modal (see the modified *Generar link produces a shareable customer link*). The creation modal is no longer a two-path choice; its single-path behavior is carried forward by the added requirement *Creation modal is client-first for direct order entry*.

## ADDED Requirements

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
