## ADDED Requirements

### Requirement: Escape closes an open picker before the modal
While a picker's dropdown — the client selector or the product search — is open, pressing Escape SHALL close only that dropdown and SHALL NOT close the order-creation modal. When no picker dropdown is open, pressing Escape SHALL close the modal as usual.

#### Scenario: Escape with a picker dropdown open closes only the dropdown
- **WHEN** the client selector's or product search's dropdown is open and the manager presses Escape
- **THEN** that dropdown closes
- **AND** the order-creation modal stays open

#### Scenario: Escape with no dropdown open closes the modal
- **WHEN** no picker dropdown is open and the manager presses Escape
- **THEN** the order-creation modal closes
