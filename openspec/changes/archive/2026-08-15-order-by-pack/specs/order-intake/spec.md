## MODIFIED Requirements

### Requirement: Customer submits a structured order
The system SHALL present a predefined catalog of products and let the customer choose one or more of those products, each with a quantity **and the measure that quantity is counted in** — units, or packs where the product has a pack size. The system MUST reject any item that is not in the predefined catalog. On submission with a valid token, the system MUST record the chosen items on the order bound to the token, consume the link so it can no longer be used, and confirm the order immediately without any payment step.

An order SHALL be recorded **in units only**. A quantity submitted in packs SHALL be multiplied by the product's pack size before it is recorded, and the measure the customer chose SHALL NOT be stored. Everything downstream of the order — production totals, existencia, stock actual, the review view, the back-office dialogs — therefore keeps working in one measure, and none of them has to know that packs exist.

The conversion SHALL use the pack size held by the system, not one supplied with the submission. The pack is the bakery's definition of its own product; a submission that carried its own conversion could claim any number of units for any quantity.

The system MUST reject a submission that asks for packs of a product that has no pack size, persisting nothing and leaving the link usable. That is not a customer choice the form can offer, so a submission making it did not come from the form.

#### Scenario: Customer submits an order
- **WHEN** a customer with a valid token chooses one or more catalog products with quantities and submits the form
- **THEN** the system records the chosen items on the order bound to the token
- **AND** consumes the link so it can no longer be used
- **AND** displays an immediate confirmation that the order was received

#### Scenario: A quantity in packs is recorded in units
- **WHEN** a customer submits 4 packs of a product whose pack size is 5
- **THEN** the order records 20 units of that product
- **AND** no record is kept that it was ordered as packs

#### Scenario: A quantity in units is recorded as it was given
- **WHEN** a customer submits 4 units of a product
- **THEN** the order records 4 units, whatever that product's pack size is

#### Scenario: Packs of a product that has none are rejected
- **WHEN** a submission asks for packs of a product whose pack size is zero
- **THEN** the system rejects the submission
- **AND** the link remains usable

#### Scenario: Customer submits an empty order
- **WHEN** a customer submits the form with no items
- **THEN** the system rejects the submission and the link remains usable

#### Scenario: Submission references a product outside the catalog
- **WHEN** a submission includes an item that is not in the predefined catalog
- **THEN** the system rejects the submission and the link remains usable
