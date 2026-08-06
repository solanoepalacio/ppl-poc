## ADDED Requirements

### Requirement: The order screen states that quantities are units
The order entry screen SHALL display, in its header area above the catalog, a
notice telling the customer that orders are taken **by unit, not by package**.
The quantity typed against a product is a count of individual items, and a
customer used to buying by the tray or the bag has no way to tell from the field
itself; the notice removes an ambiguity whose cost lands on the bakery after the
order is baked.

The notice SHALL be shown on the order entry screen only. The order-received and
invalid-link states carry no quantities to misread.

It SHALL be presented as an alert — coloured and emphasised so it is read before
the catalog is — because the cost of missing it lands on the bakery after the
order is baked, not on the customer while they can still fix it.

#### Scenario: The notice is on the entry screen
- **WHEN** the customer opens the order form with a valid token
- **THEN** a notice stating that orders are taken by unit and not by package is
  visible in the header area, above the catalog

#### Scenario: The notice is absent from the outcome states
- **WHEN** the page renders the order-received or the invalid-link state
- **THEN** the by-unit notice is not shown

## MODIFIED Requirements

### Requirement: Customer-facing copy is in Spanish
All text the customer reads on the order page SHALL be written in Spanish, including the title, the by-unit notice, the primary action label, the busy/submitting state, the review notice and the review label the primary action takes while the review pause is running, the order-summary heading and its show/hide controls, and the confirmation and invalid-link messages.

#### Scenario: Entry screen text is Spanish
- **WHEN** the order entry screen is rendered
- **THEN** the title and action labels are presented in Spanish

#### Scenario: Outcome and error text is Spanish
- **WHEN** either the order-received or invalid-link state is rendered
- **THEN** its heading and body message are presented in Spanish

### Requirement: The customer page header is compact
The brand header, the order screen's title and the by-unit notice SHALL be sized
so that they take a small share of a phone's viewport, leaving the height to the
catalog and the order summary — the parts the customer actually works with. The
brand identity SHALL remain present and legible; this trades ornament for working
space, not the brand itself.

The notice is the one thing here that is not ornament: it is bought with viewport
height on purpose, and SHALL be kept to a single line's worth of copy so the
trade stays small.

#### Scenario: Header and title leave the screen to the list
- **WHEN** the order screen is rendered on a phone-sized viewport
- **THEN** the brand header and the title together occupy a small fraction of the
  viewport height
- **AND** the Pannico wordmark remains visible and legible

#### Scenario: The notice does not crowd out the catalog
- **WHEN** the order screen is rendered on a phone-sized viewport
- **THEN** the header, the title and the by-unit notice together still leave most
  of the viewport to the catalog and the action bar
