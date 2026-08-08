## MODIFIED Requirements

### Requirement: Back office lists selectable clients
The system SHALL expose the active clients from the directory to the back office so the manager can attach an order to one. Inactive clients SHALL NOT be offered for selection.

The system SHALL separately expose the **whole** directory — active and inactive alike, each with its display name, phone number if any, active flag, and whether any order references it — for the view that manages the directory. Attaching an order and managing the directory are different questions of the same data, and the selection list must not start including retired clients in order to serve the second.

The system SHALL also be able to resolve a phone number to the **active** client that has it, which is how an inbound WhatsApp message is attributed. A number SHALL resolve to at most one client — which the uniqueness of the stored number already guarantees — and a number belonging to no active client SHALL resolve to none rather than to a guess.

Both the number entered in the directory and the number reported by the messaging platform SHALL be reduced to the **same canonical form** before they are compared, so that resolution is a comparison rather than an interpretation and neither side has to be entered in a particular style. The canonical form SHALL be digits only, and SHALL additionally reconcile the Argentine mobile prefix: a number may be written with the `9` that follows the country code and reported without it, or the reverse, and the two are the same number. A number stored without its country code cannot be canonicalized into anything an inbound sender matches, and will never resolve.

The canonical form SHALL be what is stored, so that the uniqueness of a client's number means one client per real number rather than one per way of writing it — otherwise the same number entered two ways would be two clients, and an inbound message would match both.

#### Scenario: Manager retrieves the selectable clients
- **WHEN** the back office requests the selectable clients
- **THEN** the system returns the active clients, each with its identifier and display name

#### Scenario: Inactive clients are excluded
- **WHEN** the back office requests the selectable clients and some clients are inactive
- **THEN** the returned list omits the inactive clients

#### Scenario: The management view retrieves the whole directory
- **WHEN** the back office requests the directory for management
- **THEN** the system returns every client, active and inactive
- **AND** each carries its phone number if it has one and whether any order references it

#### Scenario: A number resolves to its client
- **WHEN** a phone number matching an active client's stored number is looked up
- **THEN** that client is returned

#### Scenario: The Argentine mobile prefix does not prevent a match
- **WHEN** a client's number was entered with the `9` after the country code and an
  inbound sender is reported without it, or the reverse
- **THEN** both reduce to the same canonical form and the client is resolved

#### Scenario: One number cannot become two clients
- **WHEN** a number is entered for a second client in a different style that
  reduces to the same canonical form as an existing one
- **THEN** it is rejected as a duplicate

#### Scenario: An unmatched number resolves to nothing
- **WHEN** a phone number matches no active client
- **THEN** no client is returned

#### Scenario: A retired client's number does not resolve
- **WHEN** a phone number belongs to a client that has been retired
- **THEN** no client is returned
