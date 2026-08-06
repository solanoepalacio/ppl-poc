## MODIFIED Requirements

### Requirement: Back office surfaces existencia editing on the open bloque
The orders view SHALL present a control (**Stock**) to record per-product stock inicial for the open bloque and to review each product's stock actual. The control SHALL always be present but SHALL be disabled (visibly grayed and unclickable) unless the open bloque is selected.

The control SHALL list a product when its stock inicial is above zero **or** its stock actual is above zero, so a product that was never given an initial count still appears once it has been produced. For each listed product it SHALL show the stock inicial as an editable quantity and the stock actual as a figure that cannot be edited. Editing a product's stock inicial SHALL update the stock actual shown for it without needing to save first, since one is computed from the other.

Products SHALL be listed in the order they were entered — earliest first — and MUST NOT be re-sorted alphabetically or by any other property of the product: the manager types counts off a physical list, and the on-screen list has to read back in that same sequence to be checkable against it. Adding a product SHALL append it at the end, and the order SHALL survive saving and reopening the control. A product added from the search SHALL hold that position for as long as the control stays open, whatever is typed into its stock inicial — a row MUST NOT move while it is being filled in, including when the same product was listed elsewhere earlier in the session. Products that appear without having been entered here (a product listed only because it has been produced) SHALL come after the entered ones. Stock inherited from the previous bloque at close SHALL keep the order it had there, and products entered afterwards append after it.

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
- **WHEN** the manager sets a listed product's stock inicial to zero, which removes it from the list, adds it again from the search, and types a new initial
- **THEN** it stays at the end of the list rather than returning to its former position

#### Scenario: Inherited stock keeps the previous bloque's order
- **WHEN** a bloque is closed and its positive stock actual carries to the successor
- **THEN** the successor's stock control lists the inherited products in the order the closed bloque listed them

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
