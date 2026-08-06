## REMOVED Requirements

### Requirement: Back office surfaces existencia editing on the open bloque
**Reason**: the requirement states that a product whose figures are "zero or
below" is not listed, and carries a scenario — *A product in shortfall is not
listed* — whose name asserts exactly the behaviour this change reverses. Amending
it would leave a scenario whose title contradicts its body. Replaced by
*Back office surfaces stock editing on the open bloque*, which keeps every other
guarantee it made: the two figures, the live recomputation, the entry ordering,
and the control being disabled off the open bloque.

## ADDED Requirements

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
