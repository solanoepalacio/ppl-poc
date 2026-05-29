## ADDED Requirements

### Requirement: Manager can create an order manually
From the back office, the manager SHALL be able to create an order by providing a phone number and an optional list of catalog items with quantities, without generating or sending a customer link. The system MUST persist the created order so it appears in the day's back-office view, MUST record the supplied items, and MUST reject any item that is not in the active catalog, persisting nothing on rejection. A manually created order SHALL carry a valid status from the order status model.

#### Scenario: Manager creates an order with items
- **WHEN** the manager submits a phone number and one or more active-catalog items with quantities
- **THEN** the system persists a new order bound to that phone number with the supplied items
- **AND** the order appears in the back-office view for the day it was created

#### Scenario: Manager creates an order with no items
- **WHEN** the manager submits a phone number with no items
- **THEN** the system persists a new order with that phone number and no items

#### Scenario: Manual order references a product outside the catalog
- **WHEN** a manual order creation includes an item that is not in the active catalog
- **THEN** the system rejects the creation
- **AND** persists no order

### Requirement: Manager can edit an order's items
From the back office, the manager SHALL be able to replace the list of items on any persisted order, regardless of the order's current status. The submitted list MAY add products, remove products, and change quantities; submitting an empty list clears the order's items. The system MUST validate every submitted item against the active catalog, MUST reject the edit if any item is not in the catalog (leaving the order's existing items unchanged), and MUST otherwise persist the new item list as the order's complete set of items. The order's status MUST NOT be changed by an item edit.

#### Scenario: Manager replaces an order's items
- **WHEN** the manager submits a new list of active-catalog items with quantities for an existing order
- **THEN** the system persists exactly those items as the order's items, replacing any previous items
- **AND** leaves the order's status unchanged

#### Scenario: Manager clears an order's items
- **WHEN** the manager submits an empty item list for an existing order
- **THEN** the system removes all items from the order
- **AND** leaves the order's status unchanged

#### Scenario: Item edit references a product outside the catalog
- **WHEN** an item edit includes a product that is not in the active catalog
- **THEN** the system rejects the edit
- **AND** the order's existing items are left unchanged

#### Scenario: Item edit targets a missing order
- **WHEN** an item edit references an order that does not exist
- **THEN** the system rejects the edit

### Requirement: Manager can delete an order
From the back office, the manager SHALL be able to delete a persisted order. Deleting an order MUST remove the order and all of its items, and the deleted order MUST no longer appear in the back-office view or be counted in production totals.

#### Scenario: Manager deletes an order
- **WHEN** the manager deletes an existing order
- **THEN** the system removes the order and its items
- **AND** the order no longer appears in the back-office view

#### Scenario: Delete targets a missing order
- **WHEN** a delete references an order that does not exist
- **THEN** the system rejects the request
