## REMOVED Requirements

### Requirement: Back office surfaces the bloque's production totals
**Reason**: One of its scenarios specifies that each product's row shows the
three figures — needed, stock, and difference — which no longer holds now that
the view shows only the quantity to produce. The requirement is replaced rather
than edited because that scenario has to disappear entirely, not change, and the
single-table layout it describes is being replaced by a two-table split.
**Migration**: See the new *Back office surfaces the bloque's production totals
in two columns* requirement below. Everything else it guaranteed is carried over
unchanged: one view per production line, only that line's products, always the
currently open bloque, and no bloque selector.

## ADDED Requirements

### Requirement: Back office surfaces the bloque's production totals in two columns
The back office SHALL present the per-item production totals on two dedicated
production views, one per production category — **Producción salados** (`salty`)
and **Producción dulces** (`sweet`) — each reachable from the persistent
back-office navigation. Each view SHALL show only the totals for products in its
category, always for the currently open (latest) bloque, and SHALL NOT offer a
bloque selector.

Each view SHALL lay its products out as **two tables side by side**, each
occupying half the available width, so that roughly twice as many products are
visible before the content scrolls. Products SHALL be distributed alternately
between the two tables — the first to the left, the second to the right, the
third to the left, and so on — so the list reads across before it reads down.

Each row SHALL show exactly two things: the product's name and the quantity to
produce. The demand and the recorded existencia SHALL NOT be displayed on these
views.

#### Scenario: Manager views one line's production totals
- **WHEN** the manager opens the **Producción salados** view
- **THEN** the system shows each `salty` product ordered for the open bloque with
  its quantity to produce
- **AND** no `sweet` products are shown

#### Scenario: Each line has its own view
- **WHEN** the manager opens the **Producción dulces** view
- **THEN** the system shows each `sweet` product ordered for the open bloque
- **AND** no `salty` products are shown

#### Scenario: Products are split across two tables
- **WHEN** a production view renders more than one product
- **THEN** the products are laid out in two tables side by side
- **AND** consecutive products alternate between the left and the right table

#### Scenario: Two products land one per table
- **WHEN** exactly two products have a quantity to produce
- **THEN** the left table shows the first and the right table shows the second

#### Scenario: Only the product and the quantity to produce are shown
- **WHEN** a product's row is rendered
- **THEN** it shows the product's name and its quantity to produce
- **AND** it shows neither the demand nor the existencia

#### Scenario: A covered product shows zero to produce
- **WHEN** product P is ordered in the open bloque and its existencia meets or
  exceeds its demand
- **THEN** P's row shows a quantity to produce of 0

#### Scenario: The production views always show the open bloque
- **WHEN** the manager opens a production view
- **THEN** the production totals shown are for the currently open bloque and that
  view's category
- **AND** the view offers no control to select a different bloque

### Requirement: Production rows alternate their colours
Within each of a production view's two tables, consecutive rows SHALL alternate
between two colour treatments so a row can be tracked across the width of the
screen. A row's treatment SHALL cover its product name, its background — kept
soft, so the rows stay a subdued backdrop for the numbers rather than competing
with them — and the quantity chip in the "A producir" column, whose background
SHALL be the same colour as that row's product name. Every text/background pair
SHALL meet WCAG AA contrast. The colour SHALL carry no meaning about the product
or its quantity — it is a reading aid only, and MAY change for a given product
as the list changes.

#### Scenario: Consecutive rows differ in colour
- **WHEN** a table renders two or more rows
- **THEN** each row's product name colour differs from the row directly above it
- **AND** its background differs from the row directly above it

#### Scenario: The quantity chip matches its row
- **WHEN** a row is rendered in either treatment
- **THEN** the background of its quantity chip is the same colour as that row's
  product name

#### Scenario: Every pairing is legible
- **WHEN** a row is rendered in either treatment
- **THEN** its product name meets WCAG AA contrast against the row background
- **AND** the quantity inside the chip meets WCAG AA contrast against the chip

### Requirement: Production views show no line total
A production view SHALL NOT display a total quantity for the line. The screen is
a per-product work list; a single summed figure is not something the production
line acts on, and it competes for attention with the per-product numbers that
are.

#### Scenario: No total is shown
- **WHEN** a production view is rendered with any number of products
- **THEN** no combined total for the line appears on the view

### Requirement: Production text is sized for reading at a distance
The product names and the quantities on a production view SHALL be sized for
reading from across the production area rather than at a desk. Their size SHALL
be expressed relative to the height of the screen, so that the physical size on
a given display does not change with whatever CSS resolution that display's
browser reports.

#### Scenario: Names and quantities are sized for distance
- **WHEN** a production view is rendered
- **THEN** the product names and the quantities are substantially larger than the
  body text used elsewhere in the back office

#### Scenario: Physical size does not depend on the reported resolution
- **WHEN** the same display reports one CSS resolution rather than another
- **THEN** the product names and quantities occupy the same physical size on that
  display
