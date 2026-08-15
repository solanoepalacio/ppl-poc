## REMOVED Requirements

### Requirement: The order screen states that quantities are units
**Reason**: It states as a rule of the shop something that is no longer true —
that orders are taken by unit and not by package. With a per-product choice of
measure on the same screen, the notice contradicts the control three centimetres
below it, and a customer who believes the notice will read the control as an
error.

**Migration**: Replaced by *The customer chooses the measure of each product*,
which keeps a notice in the same place and with the same emphasis. What it warns
about changes shape rather than disappearing: not "did they mean packs?" but
"which measure is this row in?" — still the ambiguity whose cost lands on the
bakery after the order is baked.

## ADDED Requirements

### Requirement: The customer chooses the measure of each product
A product that has a pack SHALL offer the customer a choice, beside its quantity,
between ordering **by unit** and **by pack**. It SHALL start on **unidad**: units
are what every product could always be ordered in, so the default is the
behaviour the customer had before, and a default of packs would multiply an
unread choice by five.

A product with no pack SHALL show a plain, non-interactive **unidad** label in the
same position. A disabled control invites the customer to try it and wonder what
is wrong; a label answers the same question — *in what?* — without offering
anything.

Beside the product name SHALL sit a short note, in small type, saying how many
units its pack holds. The choice by itself says a pack exists but not what it is
worth, and a customer who cannot tell whether a pack is five or fifty cannot use
it. It belongs with the name rather than with the control because it describes
the product and does not change when the customer picks something.

Nothing else SHALL be added under the control. The row already carries a name, a
figure and a choice; a line explaining the choice is a fourth thing to read on
every product in a long list, and the choice is legible without it.

The screen SHALL carry, in its header area above the catalog, a notice telling
the customer to check whether they are ordering by unit or by pack. It SHALL be
presented as an alert — coloured and emphasised so it is read before the catalog
is — because the cost of getting it wrong lands on the bakery after the order is
baked, not on the customer while they can still fix it. The notice SHALL be shown
on the order entry screen only; the order-received and invalid-link states carry
no quantities to misread.

#### Scenario: A product with a pack offers the choice
- **WHEN** the customer opens the form and a listed product has a pack size
- **THEN** that product shows a control offering unidad and paquete
- **AND** it is set to unidad

#### Scenario: A product without a pack offers nothing to choose
- **WHEN** a listed product has no pack size
- **THEN** it shows a plain unidad label
- **AND** there is no control to change it

#### Scenario: The product says what its pack is worth
- **WHEN** a product has a pack
- **THEN** a note beside its name states how many units the pack holds

#### Scenario: The header notice is about the choice
- **WHEN** the customer opens the order form with a valid token
- **THEN** a notice telling them to check whether they are ordering by unit or by
  pack is visible in the header area, above the catalog

#### Scenario: The notice is absent from the outcome states
- **WHEN** the page renders the order-received or the invalid-link state
- **THEN** the notice is not shown

### Requirement: The summary states the measure of every line
The order summary SHALL say, for each line, which measure it was chosen in. A
list of names and bare numbers cannot be checked once two of its rows can mean
different things, and checking it is the whole reason the summary is put in front
of the customer before they confirm.

A line chosen in packs SHALL also show what it comes to in units. The customer is
being asked to confirm what the bakery will bake, and what the bakery will bake is
the unit figure.

#### Scenario: A line in units says so
- **WHEN** the summary lists a product ordered by unit
- **THEN** the line states the quantity in units

#### Scenario: A line in packs says so and gives the units
- **WHEN** the summary lists 4 packs of a product whose pack is 5 units
- **THEN** the line states that it is 4 packs
- **AND** that it comes to 20 units
