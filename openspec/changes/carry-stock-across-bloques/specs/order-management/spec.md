## MODIFIED Requirements

### Requirement: Manager can edit an order's items
From the back office, the manager SHALL be able to replace the list of items on any persisted order **belonging to the open bloque**. The submitted list MAY add products, remove products, and change quantities; submitting an empty list clears the order's items. The system MUST validate every submitted item against the active catalog, MUST reject the edit if any item is not in the catalog (leaving the order's existing items unchanged), and MUST otherwise persist the new item list as the order's complete set of items.

The system MUST reject an edit to an order in a closed bloque, leaving its items unchanged, and the back office SHALL NOT offer the control for such an order. A closed bloque's demand was used to compute the stock inicial carried to its successor, so a later change to that demand would leave the two disagreeing with nothing to detect it.

#### Scenario: Manager replaces an order's items
- **WHEN** the manager submits a new list of active-catalog items with quantities for an existing order
- **THEN** the system persists exactly those items as the order's items, replacing any previous items

#### Scenario: Manager clears an order's items
- **WHEN** the manager submits an empty item list for an existing order
- **THEN** the system removes all items from the order

#### Scenario: Item edit references a product outside the catalog
- **WHEN** an item edit includes a product that is not in the active catalog
- **THEN** the system rejects the edit
- **AND** the order's existing items are left unchanged

#### Scenario: Item edit targets a missing order
- **WHEN** an item edit references an order that does not exist
- **THEN** the system rejects the edit

#### Scenario: Item edit targets an order in a closed bloque
- **WHEN** an item edit references an order whose bloque is closed
- **THEN** the system rejects the edit
- **AND** the order's items are left unchanged

#### Scenario: The edit control is not offered on a closed bloque
- **WHEN** the manager views the orders of a closed bloque
- **THEN** no control to edit an order's items is available

### Requirement: Manager can delete an order
From the back office, the manager SHALL be able to delete a persisted order **belonging to the open bloque**. Deleting an order MUST remove the order and all of its items, and the deleted order MUST no longer appear in the back-office view or be counted in production totals.

The system MUST reject deleting an order in a closed bloque, leaving it in place, and the back office SHALL NOT offer the control for such an order — for the same reason its items can no longer be edited: the bloque's demand is now baked into the stock its successor inherited.

#### Scenario: Manager deletes an order
- **WHEN** the manager deletes an existing order
- **THEN** the system removes the order and its items
- **AND** the order no longer appears in the back-office view

#### Scenario: Delete targets a missing order
- **WHEN** a delete references an order that does not exist
- **THEN** the system rejects the request

#### Scenario: Delete targets an order in a closed bloque
- **WHEN** a delete references an order whose bloque is closed
- **THEN** the system rejects the request
- **AND** the order remains in place

#### Scenario: The delete control is not offered on a closed bloque
- **WHEN** the manager views the orders of a closed bloque
- **THEN** no control to delete an order is available
