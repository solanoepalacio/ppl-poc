## ADDED Requirements

### Requirement: All back-office visible text is in Spanish
Every piece of visible text in the back-office SHALL be presented in Spanish, including page headings, section copy, button labels, busy/loading states, empty states, field labels, placeholders, and instructional text. This covers the orders view, the create-order/links view, the production view, and the back-office navigation. The wording SHALL use the same informal voice as the customer-facing order page (sentence case, informal voseo) and a consistent glossary (orden, artículo, producto, enlace, teléfono).

#### Scenario: Navigation and page headings are Spanish
- **WHEN** a staff member opens any back-office page
- **THEN** the navigation links and the page heading are presented in Spanish

#### Scenario: Buttons and busy states are Spanish
- **WHEN** the back-office renders an action button (e.g. view, generate link, create order, edit items, delete, save, cancel, copy link) in its idle or busy state
- **THEN** the button label is presented in Spanish

#### Scenario: Empty and instructional states are Spanish
- **WHEN** a back-office view shows an empty state or instructional/help copy
- **THEN** that text is presented in Spanish

#### Scenario: Field labels and placeholders are Spanish
- **WHEN** a back-office form renders an input label or placeholder
- **THEN** the label and placeholder are presented in Spanish

### Requirement: Back-office feedback messages are in Spanish
All confirmation dialogs, validation errors, catch-fallback error messages, and success messages shown in the back-office SHALL be presented in Spanish.

#### Scenario: Confirmation dialogs are Spanish
- **WHEN** the back-office asks the user to confirm a destructive or clearing action (e.g. deleting an order or saving with no items)
- **THEN** the confirmation prompt is presented in Spanish

#### Scenario: Error and success feedback is Spanish
- **WHEN** a back-office action fails or succeeds and surfaces a message to the user (e.g. failed to save/create/delete, incomplete phone number, order created)
- **THEN** the message is presented in Spanish

### Requirement: Back-office accessibility strings are in Spanish
All accessibility text in the back-office, including aria-labels and accessible names for controls and regions, SHALL be presented in Spanish (e.g. phone area code, local number, order status, close, navigation region).

#### Scenario: Control aria-labels are Spanish
- **WHEN** a screen reader reads a back-office control that exposes an aria-label (e.g. area-code input, local-number input, order-status select, modal close button)
- **THEN** the accessible name is presented in Spanish

### Requirement: Order status is shown with Spanish display labels
Where an order status is shown to a user in the back-office, it SHALL be presented with a Spanish display label mapped from the stored status value, without changing the stored value or the API contract.

#### Scenario: Status is displayed in Spanish
- **WHEN** the back-office renders an order's status (pending, issued, finished, or ignored)
- **THEN** a corresponding Spanish display label is shown to the user

#### Scenario: Stored value is unchanged
- **WHEN** a status is displayed or changed through the back-office
- **THEN** the value stored and sent to the API remains the original enum value, not the Spanish label

### Requirement: Document metadata is in Spanish
The application document metadata that is human-readable (e.g. the page description) SHALL be presented in Spanish.

#### Scenario: Metadata description is Spanish
- **WHEN** the application document metadata is rendered
- **THEN** the human-readable description is presented in Spanish
