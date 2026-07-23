## ADDED Requirements

### Requirement: Production-facing labels are hidden from the customer
The customer order screen SHALL NOT display product metadata that exists only for the back office's production planning and is irrelevant to placing an order — in particular the salado/dulce (savory/sweet) production-line category label. The customer sees each added product by name and quantity, not by which production line it belongs to.

#### Scenario: No production category label on an added product
- **WHEN** the customer adds a product to the order
- **THEN** the product's row shows its name and quantity
- **AND** it does not show the product's salado/dulce production-line category
