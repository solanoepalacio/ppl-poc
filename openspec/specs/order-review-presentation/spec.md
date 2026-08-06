# order-review-presentation Specification

## Purpose
TBD - created by archiving change review-orders-by-client. Update Purpose after archive.
## Requirements
### Requirement: A read-only view lists a bloque's orders grouped by client
The back office SHALL present a **Revisar Pedidos** view showing what each client
ordered in a production bloque. It exists for the people packing and baking, who
need to read the bloque while they work rather than change it.

The view SHALL show **one record per client**, not one per order. A client with
several orders in the bloque SHALL appear once, and the quantities of a product
ordered across those orders SHALL be summed into a single figure — a client who
ordered 100 of product A, then 100 of product B, then 100 of product A again is
one record reading `A × 200` and `B × 100`.

Only clients with at least one product in the bloque SHALL appear. A client who
ordered nothing is absent rather than shown empty.

Each record SHALL show the client's name and every product they ordered with its
summed quantity.

#### Scenario: Orders from one client are merged into one record
- **WHEN** the bloque holds three orders from client A — 100 of product A, 100 of
  product B, and another 100 of product A
- **THEN** the view shows a single record for client A
- **AND** it lists product A with 200 and product B with 100

#### Scenario: Each client is its own record
- **WHEN** the bloque holds orders from several clients
- **THEN** each client appears as its own record with only its own products

#### Scenario: A client with no products is absent
- **WHEN** a client has no products in the bloque
- **THEN** no record is shown for that client

### Requirement: Products are laid out across the record, not stacked
Within a client's record the products SHALL be laid out **horizontally, three to
a row**, rather than one under another. A record is read at a glance by someone
holding a tray; stacking a dozen products makes it a dozen lines tall and pushes
the next client off the screen. Three across turns the same dozen into four
lines, so more clients are visible at once.

A row with fewer than three products SHALL keep the same column positions rather
than stretching its products across the full width, so the products of every
record line up down the page and can be scanned column-wise.

Consecutive rows SHALL alternate their colour treatment, as the production views
do: from across the room a band of colour is what tells the reader which products
belong to the same line, and without it three columns of similar text run
together. The alternation SHALL follow the rows **as laid out**, so that when the
column count changes with the viewport the banding regroups with it rather than
striping mid-row. The colour is a reading aid only and SHALL carry no meaning
about the product.

Consecutive rows SHALL also be separated by a hairline rule. The two separations
work at different distances: the colour is what carries across the room, while up
close two soft tints read as one block and the line is what divides them.

A product's quantity SHALL sit immediately after its name rather than pushed to
the far edge of its cell, including when the name wraps: across a wide screen a
name and a figure separated by empty space have to be paired up by eye. The
spacing *between* products SHALL be unaffected — closing the gap inside a cell
must not close the gap that separates one product from the next.

#### Scenario: Products flow three to a row
- **WHEN** a client's record lists six products
- **THEN** they are shown as two rows of three, not as six stacked lines

#### Scenario: A partial row keeps its columns
- **WHEN** a client's record lists four products
- **THEN** the fourth product sits in the first column of a second row
- **AND** it does not stretch across the width the three above it occupy

#### Scenario: Consecutive rows alternate colour
- **WHEN** a client's record spans more than one row of products
- **THEN** every product in a row shares one colour treatment
- **AND** a row's treatment differs from the row above it
- **AND** a hairline rule separates it from the row above

#### Scenario: The band covers the whole row, short rows included
- **WHEN** a client's last row holds fewer products than a full row
- **THEN** its colour still runs the full width of the record
- **AND** does not stop where the products run out

#### Scenario: The banding follows the column count
- **WHEN** the viewport narrows and the products regroup into fewer columns
- **THEN** the alternation regroups with them, so each laid-out row is still one
  colour

#### Scenario: The quantity sits next to its product
- **WHEN** a product and its quantity are shown
- **THEN** the quantity follows the name closely rather than at the far edge of
  the cell
- **AND** the spacing between one product and the next is unchanged

#### Scenario: A wrapped name keeps its quantity close
- **WHEN** a product's name is long enough to wrap onto a second line
- **THEN** the quantity follows the last word of the name

### Requirement: The review view is read-only
The Revisar Pedidos view SHALL offer no way to change anything: no control to
edit or delete an order, no control to add one, and no control to change a
quantity. It is a reading surface for people whose job is not to maintain the
data, and an editing control they did not mean to press is a cost with no
matching benefit.

Its records SHALL NOT expand or collapse. Every product SHALL be visible as soon
as the view is rendered, so nothing has to be pressed to read the bloque.

#### Scenario: No editing controls are present
- **WHEN** the view is rendered
- **THEN** it presents no control to edit, delete or create an order
- **AND** no quantity on it can be changed

#### Scenario: Products need no interaction to be read
- **WHEN** the view is rendered
- **THEN** every client's products are already visible
- **AND** there is no expand or collapse control

### Requirement: The review view selects a bloque like the orders view
The view SHALL default to the open bloque and SHALL let a bloque be chosen, using
the same URL-held selection as the orders view so a chosen bloque survives a
reload and can be linked to. Choosing a closed bloque SHALL show its orders; the
view is read-only regardless, so a closed bloque needs no further restriction.

The view SHALL state which bloque is being shown, and SHALL say plainly when the
selected bloque has no orders rather than rendering an empty page.

#### Scenario: Defaults to the open bloque
- **WHEN** the view is opened without a bloque selected
- **THEN** it shows the open bloque's orders

#### Scenario: A bloque can be selected
- **WHEN** a bloque is chosen
- **THEN** the view shows that bloque's orders grouped by client
- **AND** the selection is held in the URL

#### Scenario: An empty bloque says so
- **WHEN** the selected bloque holds no orders
- **THEN** the view says there are none rather than showing an empty list

### Requirement: The review view is sized to be read from across the room
The view is shown on the screens mounted in the factory, so its type SHALL be
sized for reading at a distance rather than at a desk — the client name, each
product and each quantity alike — in the same spirit as the production views.

Its type SHALL be sized in viewport-relative units, so the physical size on a
mounted panel is the same whatever CSS viewport width that panel's browser
reports. It MAY be smaller than the production views' type: this view puts three
products across where those put one, and past a point larger type buys less
legibility than the wrapping it causes costs.

On viewports too small to be a mounted screen the type SHALL fall back to
ordinary sizes, since viewport-relative type on a phone produces sizes nobody
asked for.

#### Scenario: Type is sized for distance on a mounted screen
- **WHEN** the view is shown on a screen-sized viewport
- **THEN** the client names, product names and quantities are rendered
  substantially larger than the back office's ordinary body text

#### Scenario: Type scales with the panel, not with its reported width
- **WHEN** the same view is rendered on panels reporting different CSS viewport
  widths
- **THEN** its type is sized relative to the viewport rather than fixed in pixels

#### Scenario: Small viewports get ordinary type
- **WHEN** the view is opened on a phone-sized viewport
- **THEN** its type falls back to ordinary back-office sizes

### Requirement: The review view keeps itself current and cycles when it overflows
The view is shown on screens nobody touches, so it SHALL NOT depend on anyone
refreshing or scrolling it.

It SHALL re-read the bloque periodically, so orders placed after the screen was
opened appear on their own. It SHALL do so without reloading the page, so the
scroll position and anything else on screen survive the update, and it SHALL NOT
poll while the view is not visible, refreshing instead when it becomes visible
again so nobody returns to figures from before they left.

When there are more clients than fit, the view SHALL cycle through them —
holding, moving to the end, holding, returning — so the clients at the bottom
are not permanently unread. When everything already fits it SHALL NOT move:
motion with nothing to reveal is a distraction on a screen people glance at.

#### Scenario: A new order appears without anyone touching the screen
- **WHEN** an order is placed after the view was opened
- **THEN** the view shows it within its refresh interval
- **AND** the page is not reloaded to do so

#### Scenario: An overflowing list cycles
- **WHEN** the bloque holds more clients than fit on the screen
- **THEN** the view moves through the list and returns to the top, repeatedly

#### Scenario: A list that fits does not move
- **WHEN** every client already fits on the screen
- **THEN** the view does not scroll on its own

