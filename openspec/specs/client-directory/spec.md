# client-directory Specification

## Purpose

Defines the directory of clients that orders are attached to — each with a display name, a normalized slug, an active flag and an optional phone number — how the manager maintains it from the back office, how it is seeded by Prisma data migrations, and the back-office endpoints that expose the active clients an order can be attached to and the whole directory for managing it.
## Requirements
### Requirement: Back office lists selectable clients
The system SHALL expose the active clients from the directory to the back office so the manager can attach an order to one. Inactive clients SHALL NOT be offered for selection.

The system SHALL separately expose the **whole** directory — active and inactive alike, each with its display name, phone number if any, active flag, and whether any order references it — for the view that manages the directory. Attaching an order and managing the directory are different questions of the same data, and the selection list must not start including retired clients in order to serve the second.

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

### Requirement: The client directory is managed from the back office
The system SHALL maintain a directory of clients that orders are attached to, and
SHALL let the manager maintain it from the back office. Each client SHALL have a
stable identifier, a display name, a normalized slug used as its natural key, an
active flag, and an optional phone number.

The manager SHALL be able to **add** a client by supplying a display name and,
optionally, a phone number; **edit** an existing client's display name and phone
number; **retire** a client; and **reinstate** a retired client.

A client's display name SHALL be unique, and so SHALL its slug, which the system
SHALL derive from the display name when the client is created. The slug SHALL NOT
be editable afterwards: it is what data migrations upsert on, and changing it
would make a later migration insert a duplicate instead of matching the existing
row. Renaming a client therefore leaves its identity — and every order pointing
at it — untouched.

The system MUST reject an add or an edit that would duplicate an existing
client's name or slug, persisting nothing, and MUST say which of the two
collided: two names that differ only in case or punctuation are distinct names
but the same slug, and reporting that as a name collision describes a conflict
the manager cannot see.

A phone number SHALL be stored normalized to its digits, so that one number is
one stored value however it was typed, and SHALL be unique across clients when
present — an inbound message resolves to at most one client. Absent or blank
means no phone, and any number of clients MAY have none.

Removing a client SHALL depend on whether any order references it:

- With **no orders**, the client SHALL be deleted outright.
- With **one or more orders**, the client SHALL NOT be deleted; it SHALL be
  retired by being marked inactive, so those orders keep their reference and
  closed bloques stay intact.

The back office SHALL show which of the two a client's removal control will
perform before it is activated.

A retired client SHALL NOT be offered for new orders, SHALL remain in the
directory listing, and SHALL be reinstatable.

The directory SHALL continue to be seedable by Prisma data migrations, which
remain the way the initial directory is loaded; a migration inserting a client
whose slug already exists SHALL leave the existing client untouched.

#### Scenario: Manager adds a client
- **WHEN** the manager supplies a display name for a new client
- **THEN** the client is added to the directory, active, with a slug derived from
  that name
- **AND** it is offered for new orders

#### Scenario: Manager adds a client with a phone number
- **WHEN** the manager supplies a display name and a phone number
- **THEN** the client is added with that number stored as its digits

#### Scenario: A client may have no phone number
- **WHEN** the manager adds a client without a phone number
- **THEN** the client is added with no phone number recorded

#### Scenario: Duplicate name is rejected
- **WHEN** the manager supplies a display name that an existing client already has
- **THEN** the system rejects it, reporting the name as the conflict
- **AND** no client is added

#### Scenario: Colliding slug is rejected as a slug conflict
- **WHEN** the manager supplies a display name that differs from an existing
  client's only in case or punctuation, so both normalize to the same slug
- **THEN** the system rejects it, reporting the slug as the conflict rather than
  the name
- **AND** no client is added

#### Scenario: Duplicate phone number is rejected
- **WHEN** the manager supplies a phone number another client already has
- **THEN** the system rejects it
- **AND** no client is added or changed

#### Scenario: Manager renames a client
- **WHEN** the manager changes an existing client's display name
- **THEN** the client's display name changes
- **AND** its identifier and slug are unchanged
- **AND** orders already attached to it still resolve to it

#### Scenario: Manager edits a client's phone number
- **WHEN** the manager changes an existing client's phone number
- **THEN** the stored number is replaced by the digits of the new one

#### Scenario: Removing a client with no orders deletes it
- **WHEN** the manager removes a client that no order references
- **THEN** the client is deleted from the directory

#### Scenario: Removing a client with orders retires it instead
- **WHEN** the manager removes a client that one or more orders reference
- **THEN** the client is not deleted
- **AND** it is marked inactive
- **AND** those orders still resolve to it

#### Scenario: The removal control says which it will do
- **WHEN** the manager looks at a client's removal control
- **THEN** it indicates whether activating it will delete the client or retire it

#### Scenario: A retired client stays listed and can be reinstated
- **WHEN** a client has been retired
- **THEN** it is still shown in the directory listing, distinguished from the
  active ones
- **AND** a control is offered to reinstate it
- **AND** activating that control makes it selectable for new orders again

#### Scenario: Slug is a stable natural key
- **WHEN** a data migration inserts a client that already exists by slug
- **THEN** the existing client is preserved and no duplicate is created

