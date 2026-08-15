## ADDED Requirements

### Requirement: A product may be sold by the pack
Each product SHALL carry a **pack size**: how many units make up one pack of it.
It SHALL be a whole number, SHALL NOT be negative, and SHALL default to zero.

Zero means the product has no pack and is ordered by the unit — which is every
product until somebody says otherwise, so the field is inert on the existing
catalog.

The pack size SHALL be maintained from the back office alongside the product's
other fields, and SHALL be shown in the catalog listing, since it is what decides
whether the customer is offered a choice of measure at all (see *The customer
chooses the measure of each product*).

It SHALL describe the product rather than any one order: a pack is how the bakery
packs that product, and it does not change from one order to the next.

#### Scenario: A product has no pack by default
- **WHEN** a product is added without a pack size
- **THEN** its pack size is zero
- **AND** it is ordered by the unit only

#### Scenario: A negative pack size is rejected
- **WHEN** the manager supplies a negative pack size
- **THEN** the system rejects it
- **AND** the product's pack size is unchanged

#### Scenario: The manager sets a pack size
- **WHEN** the manager gives a product a pack size of five
- **THEN** one pack of that product is five units
- **AND** the catalog listing shows it
