# production-slots Specification

## Purpose

Defines the production "bloque" (slot) — the container that orders are grouped into for a production run. It replaces the previous implicit day-based grouping with an explicit, manually-closed entity: at any moment exactly one bloque is open and receives new orders, and the manager closes it when the run is done, which atomically opens a fresh one. Also defines the back-office view for managing bloques.
## Requirements
### Requirement: Exactly one open bloque exists at all times
The system SHALL maintain exactly one production bloque in the `open` status at any time. On startup, if no open bloque exists, the system MUST create one. The single-open invariant MUST be enforced such that two open bloques can never coexist.

#### Scenario: A system without an open bloque self-heals
- **WHEN** the system starts and no bloque is currently open
- **THEN** the system creates a new open bloque

#### Scenario: Never two open bloques
- **WHEN** the set of bloques is inspected at any time
- **THEN** exactly one bloque has status `open`

### Requirement: A bloque carries an identity, sequence, status, and timestamps
Every bloque SHALL have a stable identifier, a human-facing sequence number, a status that is exactly one of `open` or `closed`, the instant it was opened, and the instant it was closed. A bloque's closed instant SHALL be absent while it is open and set when it is closed.

#### Scenario: An open bloque has no closed instant
- **WHEN** an open bloque is read
- **THEN** its status is `open` and it has an opened instant and no closed instant

#### Scenario: A closed bloque records when it was closed
- **WHEN** a closed bloque is read
- **THEN** its status is `closed` and it carries both its opened and closed instants

### Requirement: New orders are placed in the open bloque
Every newly created order SHALL be associated with the currently open bloque, whether it originates from the customer-link path (the customer confirms an order) or from the back-office manual-creation path.

#### Scenario: A customer-confirmed order lands in the open bloque
- **WHEN** a customer confirms an order via their link
- **THEN** the created order is associated with the currently open bloque

#### Scenario: A manually created order lands in the open bloque
- **WHEN** the manager creates an order manually from the back office
- **THEN** the created order is associated with the currently open bloque

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

### Requirement: Bloques can be listed for selection
The system SHALL expose all bloques, newest first, each with its status, sequence number, and timestamps, so the orders view can present them in a bloque selector for viewing and management. There is no dedicated bloques view.

#### Scenario: The orders view lists every bloque newest first
- **WHEN** the manager opens the back-office orders view
- **THEN** its bloque selector lists all bloques ordered newest first
- **AND** each entry shows its sequence number and status

### Requirement: Back office surfaces bloque closing on the orders view
The orders view SHALL present a control (**Cerrar producción**) to close the currently open bloque — which atomically opens a fresh one. The control SHALL always be present but SHALL be disabled (visibly grayed and unclickable) unless the open bloque is selected.

#### Scenario: Manager closes the current bloque from the orders view
- **WHEN** the manager activates the **Cerrar producción** control on the orders view while the open bloque is selected
- **THEN** the system closes the open bloque and opens a fresh one
- **AND** the orders view reflects the newly closed bloque and the new open bloque

#### Scenario: The close control is disabled for a closed bloque
- **WHEN** the manager selects a closed bloque in the orders view
- **THEN** the **Cerrar producción** control is shown disabled and cannot be activated

### Requirement: A bloque carries a real-production history per product
The system SHALL let the manager record *producción real* — how much of a product
has actually been baked — as a **history of entries** on a production bloque.
Each entry SHALL carry a quantity and the moment it was recorded. A product MAY
have many entries in a bloque, one per batch recorded.

A product's real production for the bloque SHALL be the **sum of its entries**. A
product with no entries SHALL be treated as zero. A freshly opened bloque SHALL
start with no entries at all.

Entries SHALL belong to the bloque they were recorded in. Although each entry
carries a timestamp, the history is scoped to the bloque and never spans bloques:
a bloque's totals SHALL be computed only from its own entries, regardless of the
dates those entries carry.

The history SHALL be editable only while the bloque is open — adding, changing and
deleting entries alike. The system MUST reject any of those on a closed bloque,
leaving its history unchanged.

Real production is recorded independently of existencia: the two are separate
figures on the same bloque, and writing one SHALL NOT affect the other.

#### Scenario: A freshly opened bloque has no history
- **WHEN** a bloque is opened
- **THEN** every product's real-production history for that bloque is empty
- **AND** every product's real production is zero

#### Scenario: A product's real production is the sum of its entries
- **WHEN** product P has entries of 20 and 30 recorded in the bloque
- **THEN** P's real production for that bloque is 50

#### Scenario: Recording a batch appends an entry
- **WHEN** the manager records 30 of product P on the open bloque
- **THEN** a new entry of 30 is added to P's history for that bloque
- **AND** the entry carries the moment it was recorded
- **AND** entries recorded earlier are left unchanged

#### Scenario: Deleting the last entry clears the product's real production
- **WHEN** every entry for product P in the bloque is deleted
- **THEN** P has no real-production history for that bloque
- **AND** P's real production is zero

#### Scenario: The history is scoped to its bloque
- **WHEN** a bloque's real production is computed
- **THEN** only entries recorded in that bloque contribute
- **AND** entries in other bloques are excluded whatever their timestamps

#### Scenario: Changing the history on a closed bloque is rejected
- **WHEN** an entry is added, changed or deleted on a bloque that is already closed
- **THEN** the system rejects the request
- **AND** leaves that bloque's history unchanged

#### Scenario: Real production and existencia are independent
- **WHEN** the manager records real production for a product on the open bloque
- **THEN** that product's existencia for the bloque is unchanged
- **AND** recording existencia likewise leaves its real-production history unchanged

### Requirement: Back office surfaces the real-production history on the open bloque
The orders view SHALL present a control (**Producción Real**) to record and review
per-product real production for the open bloque. The control SHALL always be
present but SHALL be disabled (visibly grayed and unclickable) unless the open
bloque is selected.

The control SHALL list every product with real production recorded in the bloque
— that is, an accumulated quantity above zero — showing the product's name and
its accumulated quantity. **The accumulated quantity SHALL NOT be editable**: it
is a sum, and the way to change it is to change the entries it is a sum of.

Products SHALL be listed in the order production was first recorded for them in
the bloque — earliest first — and MUST NOT be re-sorted alphabetically: the list
reads as a log of the bloque's baking. A product whose history is removed and
recorded again later re-enters at the end, since its earlier entries no longer
exist.

Each listed product SHALL offer a way to expand its history (**Ver detalle**),
revealing that product's entries with, for each one, the date and time it was
recorded and its quantity. Within the expanded history:

- The quantity of an entry SHALL be editable, so a batch entered wrongly can be
  corrected where the mistake actually is.
- Each entry SHALL offer a control to delete that entry alone.

Each listed product SHALL also offer a control to remove the product, which SHALL
delete that product's **entire** history for the bloque and therefore clear its
real production.

Separately from the list, the control SHALL offer an entry area for recording a
new batch, which SHALL start empty each time the control is opened so that a
quantity entered there is unambiguously an addition and never a total.

#### Scenario: Products with recorded production are listed with their totals
- **WHEN** the manager opens the control and product P has entries of 20 and 30
- **THEN** P is listed with an accumulated quantity of 50

#### Scenario: A product with no production is not listed
- **WHEN** the manager opens the control and product Q has no entries in the bloque
- **THEN** Q is not listed

#### Scenario: The accumulated quantity cannot be edited directly
- **WHEN** a product is listed with its accumulated quantity
- **THEN** that quantity is presented as a figure and offers no way to change it

#### Scenario: Expanding a product reveals its entries
- **WHEN** the manager expands a listed product's detail
- **THEN** each of that product's entries is shown with the date and time it was
  recorded and its quantity

#### Scenario: An entry's quantity can be corrected
- **WHEN** product P has an entry of 30 that should have been 3, and the manager
  changes that entry to 3
- **THEN** that entry's quantity becomes 3
- **AND** P's accumulated quantity falls by 27
- **AND** P's other entries are unchanged

#### Scenario: A single entry can be deleted
- **WHEN** product P has entries of 20 and 30 and the manager deletes the entry of 20
- **THEN** only the entry of 30 remains
- **AND** P's accumulated quantity is 30

#### Scenario: Removing a product deletes its whole history
- **WHEN** the manager removes a listed product from the control
- **THEN** every entry for that product in the bloque is deleted
- **AND** that product's real production is zero
- **AND** the product is no longer listed

#### Scenario: The entry area starts empty each time
- **WHEN** the manager opens the control on a bloque that already has entries
- **THEN** the recorded products are listed with their accumulated quantities
- **AND** the entry area for a new batch is empty

#### Scenario: Successive batches accumulate as separate entries
- **WHEN** the manager records 20 of product P, and later records 30 of P again on
  the same bloque
- **THEN** P has two entries, of 20 and of 30
- **AND** P's accumulated quantity is 50

#### Scenario: The control is disabled off the open bloque
- **WHEN** a bloque other than the open one is selected on the orders view
- **THEN** the control is present but disabled and cannot be opened

#### Scenario: Saving does not disturb products the control did not show
- **WHEN** the control was opened while product P had production recorded, product
  Q gained production afterwards from elsewhere, and the manager saves without
  having seen Q
- **THEN** P is saved as shown
- **AND** Q's history is left untouched rather than deleted

#### Scenario: Products are listed by first recorded batch
- **WHEN** production is recorded for product Z, then for product A, then for product M
- **THEN** the control lists Z first, then A, then M
- **AND** does not reorder them alphabetically

#### Scenario: Later batches do not move a product
- **WHEN** products Z and A are listed in that order and a new batch is recorded for Z
- **THEN** Z keeps its position at the top of the list

#### Scenario: A product recorded again after removal re-enters at the end
- **WHEN** product Z's whole history is removed and production is later recorded for Z again
- **THEN** Z appears at the end of the list rather than at its former position

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

### Requirement: Back office surfaces stock editing on the open bloque
The orders view SHALL present a control (**Stock**) to record per-product stock inicial for the open bloque and to review each product's stock actual. The control SHALL always be present but SHALL be disabled (visibly grayed and unclickable) unless the open bloque is selected.

The control SHALL list a product when its stock inicial is above zero **or** its stock actual is anything other than zero. A negative stock actual is a real position — it is what the bloque's orders less what is on hand and what has been produced — and hiding it makes the one screen whose subject is stock the one screen that will not say a product is short. A product is omitted only when both figures are zero, which is the case where there is nothing to report.

A product whose stock inicial is above zero SHALL remain listed even when its stock actual works out to exactly zero, so that a figure the manager typed cannot disappear because demand happened to consume all of it.

For each listed product it SHALL show the stock inicial as an editable quantity and the stock actual as a figure that cannot be edited. Editing a product's stock inicial SHALL update the stock actual shown for it without needing to save first, since one is computed from the other.

Products SHALL be listed in the order they were entered — earliest first — and MUST NOT be re-sorted alphabetically or by any other property of the product: the manager types counts off a physical list, and the on-screen list has to read back in that same sequence to be checkable against it. Adding a product SHALL append it at the end, and the order SHALL survive saving and reopening the control. A product added from the search SHALL hold that position for as long as the control stays open, whatever is typed into its stock inicial — a row MUST NOT move while it is being filled in, including when the same product was listed elsewhere earlier in the session. Products that appear without having been entered here SHALL come after the entered ones. Stock inherited from the previous bloque at close SHALL keep the order it had there, and products entered afterwards append after it.

#### Scenario: Manager edits existencia for the open bloque
- **WHEN** the manager opens the stock editor on the orders view while the open bloque is selected and saves per-product quantities
- **THEN** the system stores them as that bloque's existencia

#### Scenario: The stock control is disabled for a closed bloque
- **WHEN** the manager selects a closed bloque in the orders view
- **THEN** the **Editar stock** control is shown disabled and cannot be activated

#### Scenario: A product with only production appears
- **WHEN** product P has no stock inicial recorded but has been produced, leaving a stock actual above zero
- **THEN** P is listed, with a stock inicial of zero and its stock actual

#### Scenario: A product in shortfall is listed
- **WHEN** product Q has no stock inicial and one unit of it has been ordered, leaving a stock actual of −1
- **THEN** Q is listed, with a stock inicial of zero and a stock actual of −1

#### Scenario: A product with a typed initial stays listed at zero
- **WHEN** product P has a stock inicial of 50 and 50 of it have been ordered, leaving a stock actual of zero
- **THEN** P is still listed, with its stock inicial of 50 available to edit

#### Scenario: A product with nothing to report is omitted
- **WHEN** product R has no stock inicial, no production and no orders
- **THEN** R is not listed

#### Scenario: Both figures are shown per product
- **WHEN** a product is listed in the stock control
- **THEN** its stock inicial is shown as an editable quantity
- **AND** its stock actual is shown as a figure with no way to edit it

#### Scenario: Editing the initial updates the current figure immediately
- **WHEN** the manager changes a product's stock inicial in the control
- **THEN** that product's stock actual updates to match, before anything is saved

#### Scenario: Products are listed in the order they were entered
- **WHEN** the manager adds product Z, then product A, then product M to the stock control and saves
- **THEN** the control lists Z first, then A, then M
- **AND** does not reorder them alphabetically

#### Scenario: The entry order survives saving and reopening
- **WHEN** the manager saves the stock control and opens it again
- **THEN** the products are listed in the same order they were before saving

#### Scenario: A newly added product appends to the end
- **WHEN** the control already lists products and the manager adds another from the search
- **THEN** the new product appears at the end of the list

#### Scenario: An added product does not move while its initial is typed
- **WHEN** the manager adds a product from the search and then types a stock inicial into it
- **THEN** it stays where it was added
- **AND** does not jump to a position it held earlier in the session

#### Scenario: A product zeroed and added again stays at the end
- **WHEN** the manager sets a listed product's stock inicial to zero — which, for a product with no orders and no production, removes it from the list — adds it again from the search, and types a new initial
- **THEN** it stays at the end of the list rather than returning to its former position

#### Scenario: Inherited stock keeps the previous bloque's order
- **WHEN** a bloque is closed and its positive stock actual carries to the successor
- **THEN** the successor's stock control lists the inherited products in the order the closed bloque listed them

### Requirement: Closing is refused while any product is in shortfall
A bloque in which any product's stock actual is below zero SHALL NOT be closed.
The attempt SHALL be rejected, the bloque SHALL remain open, and no successor
bloque SHALL be created.

A shortfall means the bakery owes units it has not baked. Closing used to discard
it behind a confirmation, which made the loss a click rather than a decision; the
work does not disappear because the bloque did, so the bloque waits for the work.

The refusal SHALL be enforced where the close is performed, not only by the
control that offers it — a guard applied by one caller is not a guard.

The system SHALL report which products are short and by how much, so the manager
knows what to produce to unblock the close. Recording the missing production, or
correcting the stock inicial when the shortfall is a counting error, SHALL be
enough to allow it.

When no product is in shortfall, closing SHALL proceed as before, with no
confirmation asked for.

#### Scenario: A bloque with a shortfall cannot be closed
- **WHEN** the manager closes a bloque in which product Q has a stock actual of −50
- **THEN** the close is rejected
- **AND** the bloque remains open
- **AND** no successor bloque is created

#### Scenario: The refusal names what is short
- **WHEN** a close is refused for shortfall
- **THEN** the products in shortfall and their amounts are reported

#### Scenario: Producing the shortfall allows the close
- **WHEN** the missing units of product Q are recorded as real production, raising
  its stock actual to zero or above, and no other product is short
- **THEN** the bloque closes

#### Scenario: Correcting the stock inicial also allows it
- **WHEN** the shortfall came from a miscounted stock inicial and the manager
  corrects it so no product is below zero
- **THEN** the bloque closes

#### Scenario: No shortfall closes as before
- **WHEN** the manager closes a bloque in which no product's stock actual is below zero
- **THEN** the close proceeds without asking for confirmation

#### Scenario: The refusal is enforced beyond the control
- **WHEN** a close is requested for a bloque in shortfall by any means, including
  one that never showed the warning
- **THEN** it is rejected just the same

