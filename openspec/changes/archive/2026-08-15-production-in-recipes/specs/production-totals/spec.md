## MODIFIED Requirements

### Requirement: Back office surfaces the bloque's outstanding production in two columns
The back office SHALL present what is still to be produced on two dedicated
production views, one per production category — **Producción salados** (`salty`)
and **Producción dulces** (`sweet`) — each reachable from the persistent
back-office navigation. Each view SHALL show only products in its category,
always for the currently open (latest) bloque, and SHALL NOT offer a bloque
selector.

Each view SHALL show **only products whose quantity to produce is greater than
zero**. A product covered by its existencia and its real production is finished,
and a finished product SHALL be omitted from the view rather than shown as a row
reading zero. The list is therefore a work queue that empties as the bloque is
worked through, not a record of everything ordered.

Each view SHALL lay its products out as **two tables side by side**, each
occupying half the available width, so that roughly twice as many products are
visible before the content scrolls. Products SHALL be distributed alternately
between the two tables — the first to the left, the second to the right, the
third to the left, and so on — so the list reads across before it reads down.

Each row SHALL show the product's name, the quantity to produce, and — for a
product that has a receta — how many recetas that quantity comes to. The demand,
the recorded existencia and the recorded real production SHALL NOT be displayed
on these views.

The quantity in units stays, beside the receta figure rather than replaced by it.
It is what the order was placed in and what the stock is counted in, so dropping
it would leave the line unable to check its own work against anything else in the
building.

#### Scenario: Manager views one line's outstanding production
- **WHEN** the manager opens the **Producción salados** view
- **THEN** the system shows each `salty` product still to produce for the open
  bloque with its quantity to produce
- **AND** no `sweet` products are shown

#### Scenario: Each line has its own view
- **WHEN** the manager opens the **Producción dulces** view
- **THEN** the system shows each `sweet` product still to produce for the open bloque
- **AND** no `salty` products are shown

#### Scenario: A finished product is not shown
- **WHEN** product P is ordered in the open bloque and its existencia and real
  production together meet or exceed its demand
- **THEN** P is not shown on the production view

#### Scenario: A partially produced product stays with what is left
- **WHEN** product P is ordered for a total of 10 and 4 have been produced
- **THEN** P is shown with a quantity to produce of 6

#### Scenario: A product reappears if its demand grows
- **WHEN** product P was finished and no longer shown, and a new order in the
  bloque raises its demand above what has been produced
- **THEN** P is shown again with the difference

#### Scenario: Everything finished leaves the view empty
- **WHEN** every product ordered in the open bloque has been fully produced
- **THEN** the view shows no products
- **AND** it says there is nothing to produce in that bloque

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
- **AND** it shows neither the demand, nor the existencia, nor the real production

#### Scenario: The production views always show the open bloque
- **WHEN** the manager opens a production view
- **THEN** the products shown are for the currently open bloque and that view's
  category
- **AND** the view offers no control to select a different bloque

#### Scenario: A row states the work in recetas
- **WHEN** a product with a receta of 100 units has 25 to produce
- **THEN** its row shows 25 to produce and 0,25 recetas

#### Scenario: A product without a receta shows no receta figure
- **WHEN** a product has no receta
- **THEN** its row shows the quantity to produce and no receta figure
