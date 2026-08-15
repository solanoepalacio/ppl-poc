## ADDED Requirements

### Requirement: A product may be produced by the receta
Each product SHALL carry a **receta size**: how many units of that product one
receta yields. It SHALL be a whole number, SHALL NOT be negative, and SHALL
default to zero, meaning the product has no receta recorded.

A receta is how the bakery actually works: a batch is decided by how much goes
into the mixer, not by how many units somebody wants out of it. The figure exists
so the production views can state the work in the terms the line already uses,
without anybody doing the division in their head against a number on a screen.

It SHALL be maintained from the back office alongside the product's other
figures, and SHALL be shown in the catalog listing.

The receta SHALL describe how much one batch yields, and SHALL NOT change what is
stored anywhere: quantities remain units throughout — ordered in units, held in
units, produced in units. A correction to a receta size therefore changes what
future work looks like on screen and never what a past bloque recorded.

#### Scenario: A product has no receta by default
- **WHEN** a product is added without a receta size
- **THEN** its receta size is zero

#### Scenario: A negative receta size is rejected
- **WHEN** the manager supplies a negative receta size
- **THEN** the system rejects it
- **AND** the product's receta size is unchanged

#### Scenario: Changing a receta does not rewrite history
- **WHEN** the manager changes a product's receta size
- **THEN** the quantities recorded on existing orders and bloques are unchanged
