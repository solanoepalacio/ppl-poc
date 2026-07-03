## MODIFIED Requirements

### Requirement: Closing the open bloque atomically opens a fresh one
From the back office, the manager SHALL be able to close the currently open bloque. Closing MUST atomically mark that bloque `closed` (recording its closed instant), transition every order in that bloque that is still `pending` to `ignored` so its order link can no longer be used, and open a new bloque with the next sequence number, so that exactly one open bloque always remains. The system MUST reject a request to close a bloque that does not exist or that is already closed, leaving the bloques unchanged.

#### Scenario: Closing opens a fresh bloque
- **WHEN** the manager closes the currently open bloque
- **THEN** the system marks it closed with a closed instant
- **AND** a new open bloque with the next sequence number exists
- **AND** exactly one bloque remains open

#### Scenario: Closing expires the bloque's unused links
- **WHEN** the manager closes a bloque that still holds `pending` orders
- **THEN** the system transitions each of those orders to `ignored`
- **AND** their order links no longer resolve as valid

#### Scenario: A closed bloque is read-only history
- **WHEN** a bloque has been closed
- **THEN** it no longer receives new orders
- **AND** its orders remain viewable as the bloque's history

#### Scenario: Closing an already-closed bloque is rejected
- **WHEN** a close is requested for a bloque that is already closed or does not exist
- **THEN** the system rejects the request
- **AND** leaves the existing bloques unchanged
