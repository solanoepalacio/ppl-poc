## MODIFIED Requirements

### Requirement: Customer page carries the Pannico brand identity
The customer order page SHALL present the Pannico brand identity on every state it can render (order entry, order-received confirmation, and invalid/expired link). The page MUST display the Pannico wordmark/logo and apply the brand palette (slate blue `#365566`, white, and golden-amber `#D39B23` accent). Brand typography SHALL use a condensed display style for headings/wordmark and a legible sans for body text.

#### Scenario: Wordmark is present on the entry screen
- **WHEN** a customer opens the order page with a valid token
- **THEN** the Pannico wordmark/logo is visible
- **AND** the page uses the brand palette and typography

#### Scenario: Brand persists across outcome and error screens
- **WHEN** the page renders the order-received or invalid-link state
- **THEN** the Pannico wordmark/logo and brand palette are still present, consistent with the entry screen

### Requirement: Customer-facing copy is in Spanish
All text the customer reads on the order page SHALL be written in Spanish, including the title, the primary action label, the busy/submitting state, the order-summary heading and its show/hide controls, and the confirmation and invalid-link messages.

#### Scenario: Entry screen text is Spanish
- **WHEN** the order entry screen is rendered
- **THEN** the title and action labels are presented in Spanish

#### Scenario: Outcome and error text is Spanish
- **WHEN** either the order-received or invalid-link state is rendered
- **THEN** its heading and body message are presented in Spanish

## REMOVED Requirements

### Requirement: A running selection summary and primary action are always reachable
**Reason**: Two of the things it guarantees no longer hold. Its closing sentence
requires the WhatsApp fallback to be presented as a secondary action, and its
*Actions disabled during submission* scenario asserts that "both actions" are
disabled — there is now only one. Separately, a bare count is no longer the whole
of what the screen must show about the selection. The scenarios have to go rather
than be amended, so the requirement is replaced.
**Migration**: See the new *The order screen shows the order itself, with the
primary action always reachable* requirement below. Everything still true is
carried over: the running count, the pinned action bar, and the primary action
being disabled with nothing selected and while submitting.

### Requirement: Confirmation and fallback states are branded and reassuring
**Reason**: It requires a branded state directing the customer to continue over
WhatsApp, and carries a scenario asserting that state exists. With the fallback
gone the state is unreachable, so the scenario must disappear rather than change,
and the requirement's title names a fallback the page no longer has.
**Migration**: See the new *Confirmation and invalid-link states are branded and
reassuring* requirement below. The success state, the invalid-link state, and the
transition to invalid-link when a link dies mid-form are all carried over
unchanged.

## ADDED Requirements

### Requirement: The order screen shows the order itself, with the primary action always reachable
The order entry screen SHALL keep the primary "confirm order" action reachable
without requiring the customer to scroll the catalog to reach it, and SHALL keep a
running count of how many products are currently selected visible alongside it as
a persistent indicator. The primary action MUST be disabled while no products are
selected and while a submission is in progress.

Beyond the count, the screen SHALL be able to show **the order itself**: a summary
listing every product with a quantity above zero, each with its name and its
quantity, under a heading naming it as the customer's order summary. Products with
no quantity SHALL NOT appear.

Because the screen is read on a phone, the summary SHALL be **collapsed by
default** and revealed by an explicit control, so it costs no screen height until
the customer asks for it. Once expanded it SHALL offer a control at the end of the
list to collapse it again, so a long summary does not have to be scrolled back
past to dismiss.

#### Scenario: Running count reflects the current selection
- **WHEN** the customer has one or more products selected
- **THEN** a running count of selected products is visible without expanding the
  summary

#### Scenario: Primary action reachable without scrolling the catalog
- **WHEN** the catalog is long enough to require scrolling
- **THEN** the primary confirm action remains reachable via a pinned action bar

#### Scenario: Primary action disabled when nothing is selected
- **WHEN** no product has a quantity above zero
- **THEN** the confirm action is disabled

#### Scenario: Primary action disabled during submission
- **WHEN** a confirmation is in progress
- **THEN** the confirm action is disabled and shows a busy/submitting label

#### Scenario: Summary is collapsed until asked for
- **WHEN** the order screen is rendered
- **THEN** the itemised summary is not shown
- **AND** a control is offered to reveal it

#### Scenario: Expanding shows each selected product and its quantity
- **WHEN** the customer reveals the summary having selected 3 of product P and 1
  of product Q
- **THEN** the summary lists P with 3 and Q with 1 under its heading

#### Scenario: Unselected products are absent from the summary
- **WHEN** the summary is shown and product R has no quantity
- **THEN** R does not appear in it

#### Scenario: The summary can be collapsed from its end
- **WHEN** the summary is expanded
- **THEN** a control at the end of the list collapses it again

#### Scenario: The summary tracks the selection while open
- **WHEN** the summary is expanded and the customer changes a product's quantity
- **THEN** the summary reflects the change without being closed and reopened

#### Scenario: The count stays visible whether or not the summary is open
- **WHEN** the summary is expanded or collapsed
- **THEN** the running count remains visible in the action bar

### Requirement: Confirmation and invalid-link states are branded and reassuring
After a successful order confirmation the page SHALL display a branded, prominent
success state confirming the order was received. The invalid-link state SHALL
likewise be branded and explain that a fresh link is needed. The page SHALL reach
the invalid-link state both when it is opened with an already-invalid token and
when an in-progress confirmation is rejected because the link is no longer valid —
for example, because the order's bloque was closed while the customer was filling
out the form. Neither state changes order behavior; they re-present the existing
outcomes.

#### Scenario: Branded success state after confirmation
- **WHEN** the order is confirmed successfully
- **THEN** the page shows a branded success state confirming the order was
  received and indicating no further steps are needed

#### Scenario: Branded invalid-link state on load
- **WHEN** the page is opened with an invalid token
- **THEN** it shows a branded state explaining the link is no longer valid and to
  request a fresh link

#### Scenario: Link becomes invalid while the customer is on the form
- **WHEN** the customer submits their order but the link is no longer valid — e.g.
  its bloque was closed after the form was opened but before the action completed
- **THEN** the page transitions to the branded invalid-link state explaining a
  fresh link is needed
- **AND** does not leave the customer on the form with no feedback

### Requirement: The customer page header is compact
The brand header and the order screen's title SHALL be sized so that they take a
small share of a phone's viewport, leaving the height to the catalog and the order
summary — the parts the customer actually works with. The brand identity SHALL
remain present and legible; this trades ornament for working space, not the brand
itself.

#### Scenario: Header and title leave the screen to the list
- **WHEN** the order screen is rendered on a phone-sized viewport
- **THEN** the brand header and the title together occupy a small fraction of the
  viewport height
- **AND** the Pannico wordmark remains visible and legible
