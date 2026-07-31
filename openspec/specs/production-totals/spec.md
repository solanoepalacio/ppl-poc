# production-totals Specification

## Purpose

Defines how the system aggregates per-product quantities to produce for a production bloque from qualifying orders, and how the back office surfaces these production totals to the manager.
## Requirements
### Requirement: Catalog products carry a production category
Every catalog product SHALL belong to exactly one production category, either `sweet` (*dulces*) or `salty` (*salados*), reflecting the production line it is baked on. The category SHALL be part of the product's representation wherever the catalog is served.

#### Scenario: Each product has a category
- **WHEN** the catalog is served
- **THEN** every product carries a category of either `sweet` or `salty`

#### Scenario: Category distinguishes the two production lines
- **WHEN** a product is baked on the savory line
- **THEN** its category is `salty`
- **AND** a product baked on the sweet line has category `sweet`

### Requirement: Production totals aggregate item quantities for a bloque
The system SHALL compute, for a given production bloque, the demand for each product by summing the quantities of that product across every order in that bloque. There is no status filter; to exclude a mistaken order from the totals the manager deletes it. The result SHALL contain one entry per product with positive demand, each carrying the product's identifier, its name, the summed demand, the bloque's recorded existencia for that product, and the net quantity to produce (see *Production totals expose existencia and the net to produce*). Products with no demand SHALL be omitted.

#### Scenario: Quantities for the same product are summed across orders
- **WHEN** two orders in the bloque each contain product P, with quantities 3 and 2
- **THEN** the production totals include a single entry for product P with demand 5

#### Scenario: Every order in the bloque contributes
- **WHEN** any order in the bloque contains product P
- **THEN** that order's quantity of P is included in P's demand, regardless of how the order was created

#### Scenario: Each entry carries the product name
- **WHEN** an order in the bloque contains product P
- **THEN** the production totals entry for P includes P's identifier and its product name

#### Scenario: Products with no demand are omitted
- **WHEN** no order in the bloque contains product Q
- **THEN** the production totals contain no entry for product Q

#### Scenario: A deleted order drops out of the totals
- **WHEN** the manager deletes an order that contained product P
- **THEN** that order's quantity of P no longer contributes to P's demand

### Requirement: Production totals are scoped by bloque
The system SHALL compute production totals over the orders belonging to a single production bloque. When no bloque is specified, the system SHALL use the currently open bloque. When a bloque is specified by its identifier, the system SHALL use that bloque; if the identifier does not match a bloque, the system MUST reject the request. The response SHALL carry the resolved bloque alongside the totals.

#### Scenario: Defaults to the open bloque
- **WHEN** production totals are requested without specifying a bloque
- **THEN** the system returns totals for the orders in the currently open bloque
- **AND** the response identifies that bloque

#### Scenario: A specific bloque can be requested
- **WHEN** production totals are requested for a specified bloque identifier
- **THEN** the system returns totals for the orders in that bloque
- **AND** orders in other bloques do not contribute

#### Scenario: An unknown bloque is rejected
- **WHEN** production totals are requested for an identifier that matches no bloque
- **THEN** the system rejects the request

### Requirement: Production totals can be scoped to a category
The system SHALL support computing production totals for a single production category. When a category is specified, only products in that category SHALL contribute to the totals; when no category is specified, products of both categories contribute.

#### Scenario: Totals scoped to one category exclude the other
- **WHEN** production totals are requested for the `salty` category
- **THEN** only `salty` products appear in the totals
- **AND** `sweet` products in the bloque do not contribute

#### Scenario: Unscoped totals include both categories
- **WHEN** production totals are requested without specifying a category
- **THEN** products of both categories contribute to the totals

### Requirement: Production totals expose existencia and the net to produce
For each product with demand, the system SHALL report the bloque's recorded existencia (stock already on hand) and the net quantity to produce, computed as demand minus existencia and floored at zero. When existencia meets or exceeds demand the net to produce SHALL be zero, never negative — surplus stock is not counted against other products. A product with demand SHALL remain in the totals regardless of whether existencia meets or exceeds it; only products with no demand are omitted. A product without a recorded existencia entry SHALL be treated as existencia zero, so its net equals its demand.

#### Scenario: Existencia reduces the net to produce
- **WHEN** product P is ordered for a total of 8 in the bloque and the bloque records existencia of 3 for P
- **THEN** the production totals entry for P has demand 8, existencia 3, and a net to produce of 5

#### Scenario: Existencia equal to demand nets zero but stays
- **WHEN** product P is ordered for a total of 8 in the bloque and the bloque records existencia of exactly 8 for P
- **THEN** the production totals still include P, with demand 8, existencia 8, and a net to produce of 0

#### Scenario: Existencia exceeding demand floors the net at zero
- **WHEN** product P is ordered for a total of 4 in the bloque and the bloque records existencia of 9 for P
- **THEN** the production totals include P with demand 4, existencia 9, and a net to produce of 0

#### Scenario: A product with no recorded existencia defaults to zero
- **WHEN** product P is ordered in the bloque and the bloque records no existencia for P
- **THEN** P's existencia is 0 and its net to produce equals its demand

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

### Requirement: Production views refresh their totals automatically
Each production view SHALL re-read the open bloque's production totals on its
own every two minutes while it is open, so orders that arrive after the view was
opened are reflected without anyone reloading the page. The refresh SHALL
replace the displayed figures in place, preserving the viewer's scroll position
and presenting no spinner, flash, or other visible interruption. This composes
with the existing load-time behavior, which is unchanged: the view still shows
the open bloque's current totals whenever it is loaded.

#### Scenario: A new order appears without reloading
- **WHEN** an order is added to the open bloque while a production view is left
  open
- **THEN** that order's quantities are reflected in the view's totals within
  two minutes
- **AND** the viewer took no action to make that happen

#### Scenario: Refreshing does not disturb the view
- **WHEN** an automatic refresh occurs
- **THEN** the figures update in place
- **AND** the scroll position is preserved and no spinner or flash is shown

#### Scenario: Totals that have not changed stay as they are
- **WHEN** an automatic refresh occurs and no order in the bloque has changed
- **THEN** the displayed totals remain the same

### Requirement: Automatic refreshing pauses while the view is not visible
A production view SHALL stop its automatic refreshing while its tab or window is
hidden, and SHALL resume when it becomes visible again. On becoming visible the
view SHALL refresh immediately rather than waiting for the next interval, so a
returning viewer is never shown totals from before they left. A view that is
navigated away from SHALL stop refreshing altogether.

#### Scenario: A hidden tab stops polling
- **WHEN** the tab or window showing a production view becomes hidden
- **THEN** the view stops re-reading the totals until it is visible again

#### Scenario: Returning to the tab shows current totals at once
- **WHEN** a hidden tab showing a production view becomes visible again
- **THEN** the view refreshes its totals immediately
- **AND** does not wait for the next interval

#### Scenario: Leaving the view stops its refreshing
- **WHEN** the manager navigates from a production view to another view
- **THEN** that view's automatic refreshing stops

### Requirement: Production views scroll themselves when the list does not fit
When a production view's content is taller than the screen, the view SHALL cycle
through it on its own so every product becomes visible without anyone touching
the display. The cycle SHALL be: hold still for a settling period, scroll
gradually to the bottom, hold there for the same period, scroll gradually back
to the top, hold again, and repeat for as long as the view is open. The movement
SHALL be gradual rather than a jump, so the list stays readable while it moves.

A view whose content fits on the screen SHALL NOT scroll at all — there is
nothing to reveal, and movement with no purpose is a distraction on a display
people glance at.

#### Scenario: A long list cycles on its own
- **WHEN** a production view's content is taller than the screen and it is left
  open
- **THEN** the view scrolls to the bottom on its own, and later back to the top
- **AND** the viewer took no action to make that happen

#### Scenario: The movement is gradual
- **WHEN** the view scrolls itself
- **THEN** it moves progressively rather than jumping straight to the end

#### Scenario: A short list does not move
- **WHEN** a production view's content fits within the screen
- **THEN** the view never scrolls itself

#### Scenario: Self-scrolling pauses while the view is not visible
- **WHEN** the tab or window showing a production view becomes hidden
- **THEN** the view stops scrolling itself until it is visible again

#### Scenario: Leaving the view stops its scrolling
- **WHEN** the manager navigates from a production view to another view
- **THEN** that view's self-scrolling stops

