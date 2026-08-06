## MODIFIED Requirements

### Requirement: Closing the open bloque atomically opens a fresh one
From the back office, the manager SHALL be able to close the currently open bloque. Closing MUST atomically mark that bloque `closed` (recording its closed instant) and open a new bloque with the next sequence number, so that exactly one open bloque always remains. Closing writes no order state: a closed bloque's order links are invalid purely because the bloque is `closed`. The system MUST reject a request to close a bloque that does not exist or that is already closed, leaving the bloques unchanged.

Closing SHALL additionally carry the closing bloque's stock forward: each product's **stock actual** is written as that product's **stock inicial** on the bloque being opened (see *Closing carries the stock actual forward as the next bloque's stock inicial*). The carry happens within the same atomic operation, so a bloque is never left closed without its successor having received the stock.

#### Scenario: Closing opens a fresh bloque
- **WHEN** the manager closes the currently open bloque
- **THEN** the system marks it closed with a closed instant
- **AND** a new open bloque with the next sequence number exists
- **AND** exactly one bloque remains open

#### Scenario: Closing invalidates the bloque's unused links
- **WHEN** the manager closes a bloque that still holds unused order links
- **THEN** those order links no longer resolve as valid
- **AND** the system changes no order's state

#### Scenario: A closed bloque is read-only history
- **WHEN** a bloque has been closed
- **THEN** it no longer receives new orders
- **AND** its orders remain viewable as the bloque's history

#### Scenario: Closing an already-closed bloque is rejected
- **WHEN** a close is requested for a bloque that is already closed or does not exist
- **THEN** the system rejects the request
- **AND** leaves the existing bloques unchanged

#### Scenario: A failed carry leaves the bloque open
- **WHEN** closing cannot complete the stock carry
- **THEN** the bloque remains open and no successor is created

### Requirement: Back office surfaces existencia editing on the open bloque
The orders view SHALL present a control (**Stock**) to record per-product stock inicial for the open bloque and to review each product's stock actual. The control SHALL always be present but SHALL be disabled (visibly grayed and unclickable) unless the open bloque is selected.

The control SHALL list a product when its stock inicial is above zero **or** its stock actual is above zero, so a product that was never given an initial count still appears once it has been produced. For each listed product it SHALL show the stock inicial as an editable quantity and the stock actual as a figure that cannot be edited. Editing a product's stock inicial SHALL update the stock actual shown for it without needing to save first, since one is computed from the other.

Products whose stock inicial and stock actual are both zero or below SHALL NOT be listed. A shortfall is visible where it can be acted on — the production views and the orders list — rather than here.

#### Scenario: Manager edits existencia for the open bloque
- **WHEN** the manager opens the stock editor on the orders view while the open bloque is selected and saves per-product quantities
- **THEN** the system stores them as that bloque's existencia

#### Scenario: The stock control is disabled for a closed bloque
- **WHEN** the manager selects a closed bloque in the orders view
- **THEN** the **Editar stock** control is shown disabled and cannot be activated

#### Scenario: A product with only production appears
- **WHEN** product P has no stock inicial recorded but has been produced, leaving a stock actual above zero
- **THEN** P is listed, with a stock inicial of zero and its stock actual

#### Scenario: Both figures are shown per product
- **WHEN** a product is listed in the stock control
- **THEN** its stock inicial is shown as an editable quantity
- **AND** its stock actual is shown as a figure with no way to edit it

#### Scenario: Editing the initial updates the current figure immediately
- **WHEN** the manager changes a product's stock inicial in the control
- **THEN** that product's stock actual updates to match, before anything is saved

#### Scenario: A product in shortfall is not listed
- **WHEN** product Q has no stock inicial and its stock actual is below zero
- **THEN** Q is not listed in the stock control

## REMOVED Requirements

### Requirement: A bloque carries manually-entered existencia
**Reason**: Its *A freshly opened bloque starts at zero existencia* scenario is
now false. A bloque opened by closing its predecessor inherits that predecessor's
stock actual as its stock inicial, which is the whole point of the change. The
scenario has to disappear rather than be reworded, and the requirement's subject
widens from a single typed figure to a figure that is typed *or* inherited.
**Migration**: See the new *A bloque carries a stock inicial, typed or inherited*
requirement below. Everything else is carried over unchanged: a product with no
record is treated as zero, the figure is editable only while the bloque is open,
setting it on a closed bloque is rejected, and quantities are never negative.

## ADDED Requirements

### Requirement: A bloque carries a stock inicial, typed or inherited
The system SHALL let the manager record, per product, the **stock inicial** (the
stock on hand as the bloque begins) for a production bloque. A product with no
recorded stock inicial SHALL be treated as zero.

A bloque's stock inicial SHALL come from either of two places: typed in by the
manager, or inherited from the bloque it succeeded (see *Closing carries the stock
actual forward as the next bloque's stock inicial*). The very first bloque, having
no predecessor, starts at zero everywhere.

Stock inicial SHALL be a counted quantity and therefore never negative. The system
MUST reject an attempt to set it below zero.

Stock inicial SHALL be editable only while the bloque is open, whichever way it
arrived; the system MUST reject setting it on a closed bloque, leaving that
bloque's stock inicial unchanged. An inherited figure is ordinary editable data,
so a carry the manager disagrees with is corrected on the new bloque.

#### Scenario: The first bloque starts at zero
- **WHEN** a bloque is opened with no predecessor
- **THEN** every product's stock inicial for that bloque is zero

#### Scenario: The manager records stock inicial on the open bloque
- **WHEN** the manager records stock inicial quantities for products on the open bloque
- **THEN** the system stores those quantities as that bloque's stock inicial
- **AND** a product left at zero is stored as no stock inicial

#### Scenario: An inherited stock inicial can be corrected
- **WHEN** a bloque inherited a stock inicial of 200 for product P and the manager
  changes it to 180
- **THEN** that bloque's stock inicial for P is 180

#### Scenario: Setting stock inicial on a closed bloque is rejected
- **WHEN** stock inicial is set for a bloque that is already closed
- **THEN** the system rejects the request
- **AND** leaves that bloque's stock inicial unchanged

#### Scenario: A negative stock inicial is rejected
- **WHEN** a stock inicial below zero is submitted
- **THEN** the system rejects the request

### Requirement: A bloque's stock actual is derived from its three figures
For a given product and bloque, the system SHALL report a **stock actual**
computed as `stock inicial + producción real − pedidos`, where *pedidos* is the
demand summed across that bloque's orders.

Stock actual SHALL NOT be stored. It is a reading of three figures that each have
their own control, so it SHALL NOT be directly editable — it changes only by
changing one of the three.

Stock actual MAY be negative, and a negative is meaningful: real production is
recorded after orders arrive, so a product legitimately sits in shortfall until it
is baked. This is the exact negative of the un-floored quantity to produce, and
the two SHALL never disagree: a product whose stock actual is `−n` has `n` left to
produce, and a product whose stock actual is positive has nothing left to produce.

#### Scenario: Stock actual sums the three figures
- **WHEN** product P in the bloque has a stock inicial of 100, real production of
  300, and demand of 200
- **THEN** P's stock actual is 200
- **AND** P's stock inicial is still 100

#### Scenario: Stock actual is negative while a product is unbaked
- **WHEN** product P has a stock inicial of 0, demand of 200, and no real production
- **THEN** P's stock actual is −200

#### Scenario: Stock actual agrees with the quantity to produce
- **WHEN** a product's stock actual is below zero
- **THEN** its quantity to produce equals that shortfall
- **AND** a product whose stock actual is zero or above has nothing left to produce

#### Scenario: Stock actual follows a change to any of its inputs
- **WHEN** the stock inicial, the real production, or the orders of a bloque change
- **THEN** that product's stock actual reflects the change
- **AND** no separate stored value has to be updated

### Requirement: Closing carries the stock actual forward as the next bloque's stock inicial
When a bloque is closed, the system SHALL write each product's stock actual from
the closing bloque as that product's **stock inicial** on the bloque being opened,
so a count continues across bloques instead of restarting.

A stock actual of zero or below SHALL NOT be carried: stock inicial is never
negative, so a shortfall is discarded rather than turned into a debt the next
bloque would try to bake without an order asking for it. A product left at zero
carries no record, as with any other stock inicial of zero.

Producción real SHALL NOT be carried. The bloque being opened starts with no
entries; what mattered from its predecessor is already inside the inherited stock
inicial.

#### Scenario: A positive stock actual becomes the next stock inicial
- **WHEN** a bloque with a stock actual of 200 for product P is closed
- **THEN** the bloque it opens has a stock inicial of 200 for P

#### Scenario: A shortfall does not carry
- **WHEN** a bloque with a stock actual of −50 for product Q is closed
- **THEN** the bloque it opens has no stock inicial for Q
- **AND** its stock inicial for Q is treated as zero

#### Scenario: The closed bloque keeps its own figures
- **WHEN** a bloque is closed and its stock is carried
- **THEN** the closed bloque's own stock inicial, real production and orders are unchanged

#### Scenario: Real production does not carry
- **WHEN** a bloque with recorded real production is closed
- **THEN** the bloque it opens has no real-production entries

### Requirement: Closing warns about products in shortfall before it happens
Because a shortfall is discarded rather than carried, the system SHALL let the
manager see it coming. Before closing, the back office SHALL report which products
of the closing bloque have a stock actual below zero, and by how much, and SHALL
require the manager to confirm the close or cancel it.

Cancelling SHALL leave the bloque open and change nothing. When no product is in
shortfall, no confirmation is required and closing proceeds as before.

#### Scenario: Closing with a shortfall asks for confirmation
- **WHEN** the manager closes a bloque in which product Q has a stock actual of −50
- **THEN** the system shows that Q is short by 50 and asks whether to continue

#### Scenario: Confirming closes and discards the shortfall
- **WHEN** the manager confirms a close that was reported as having a shortfall
- **THEN** the bloque closes and its successor receives no stock inicial for the
  short products

#### Scenario: Cancelling changes nothing
- **WHEN** the manager cancels at the shortfall warning
- **THEN** the bloque remains open
- **AND** no successor bloque is created

#### Scenario: No shortfall means no warning
- **WHEN** the manager closes a bloque in which no product's stock actual is below zero
- **THEN** the close proceeds without asking for confirmation
