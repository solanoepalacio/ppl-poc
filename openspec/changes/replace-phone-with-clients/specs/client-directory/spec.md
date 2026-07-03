## ADDED Requirements

### Requirement: Clients are a fixed directory loaded by data migration
The system SHALL maintain a fixed directory of clients that orders are attached to. Each client SHALL have a stable identifier, a UI-friendly display name, and a normalized slug used as its natural key. The directory SHALL be populated exclusively by Prisma data migrations — there SHALL be no user-facing flow to create, edit, or delete clients — and additional clients SHALL be added by authoring further data migrations. A client MAY be retired by marking it inactive rather than deleting it, so that orders already attached to it keep their reference.

#### Scenario: Directory populated by migration
- **WHEN** the database is migrated
- **THEN** the client directory contains exactly the clients defined by the data migrations
- **AND** no user-facing flow creates, edits, or deletes clients

#### Scenario: Slug is a stable natural key
- **WHEN** a data migration inserts a client that already exists by slug
- **THEN** the existing client is preserved and no duplicate is created

#### Scenario: Retiring a client
- **WHEN** a client is marked inactive
- **THEN** the client is no longer offered for new orders
- **AND** orders already attached to that client keep their reference

### Requirement: Back office lists selectable clients
The system SHALL expose the active clients from the directory to the back office so the manager can attach an order to one. Inactive clients SHALL NOT be offered for selection.

#### Scenario: Manager retrieves the selectable clients
- **WHEN** the back office requests the selectable clients
- **THEN** the system returns the active clients, each with its identifier and display name

#### Scenario: Inactive clients are excluded
- **WHEN** the back office requests the selectable clients and some clients are inactive
- **THEN** the returned list omits the inactive clients
