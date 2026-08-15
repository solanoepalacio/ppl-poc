# back-office-localization Specification

## Purpose

Defines that all human-facing content in the back-office is presented in Spanish, using the same informal voice and glossary as the customer-facing order page. This covers visible UI text, feedback messages, accessibility strings, order-status display labels, and document metadata, without altering stored values or the API contract.
## Requirements
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
All accessibility text in the back-office, including aria-labels and accessible names for controls and regions, SHALL be presented in Spanish (e.g. phone area code, local number, close, navigation region).

#### Scenario: Control aria-labels are Spanish
- **WHEN** a screen reader reads a back-office control that exposes an aria-label (e.g. area-code input, local-number input, modal close button)
- **THEN** the accessible name is presented in Spanish

### Requirement: Document metadata is in Spanish
The application document metadata that is human-readable (e.g. the page description) SHALL be presented in Spanish.

#### Scenario: Metadata description is Spanish
- **WHEN** the application document metadata is rendered
- **THEN** the human-readable description is presented in Spanish

### Requirement: Dates and times are shown on a 24-hour clock
Every date and time the back office displays SHALL use the Argentine
convention — `dd/mm/aaaa` — and, where a time of day is shown, a **24-hour**
clock: `21:05`, never `09:05` for the evening.

A 12-hour clock SHALL NOT be used. Left to the runtime's default, the locale
produces a 12-hour time and omits the a. m./p. m. marker, so nine in the morning
and nine at night render as the same string — an order taken in the evening and
one taken at breakfast become indistinguishable in the very column that exists to
tell them apart. Stating the hour on a 24-hour clock removes the ambiguity
without depending on a marker the platform may or may not include.

The formatting SHALL be defined in one place and used by every view, so that the
same instant reads the same way wherever it appears.

Both the locale and the time zone SHALL be stated explicitly rather than taken
from the environment. The server renders with no locale configured and would pick
a foreign one — producing text that disagrees with the browser's and, for a
component rendered on both, a hydration mismatch. The time zone SHALL be
Argentina's, so a deployment whose clock is set to UTC does not shift every hour
displayed, and a date near midnight does not fall on the previous day.

#### Scenario: Morning and evening are distinguishable
- **WHEN** the back office shows a time of 09:05 and a time of 21:05
- **THEN** the two are rendered differently

#### Scenario: One format across the views
- **WHEN** the same instant is shown on more than one back-office view
- **THEN** it is rendered the same way in each

#### Scenario: The displayed hour does not follow the server's clock setting
- **WHEN** the application runs on a host whose time zone is not Argentina's
- **THEN** the times shown are still Argentine local time

