## ADDED Requirements

### Requirement: Content step uses three regions with only items scrollable
When the order-creation modal has loaded content (the items list is shown), the modal body SHALL be laid out as three regions: the phone-entry control fixed at the top, the catalog items list in the middle, and the optional message field fixed at the bottom. The items list SHALL be the only scrollable region; the phone-entry control and the message field SHALL remain visible regardless of how far the items list is scrolled. The modal title/close header and the action buttons SHALL remain pinned as before, above and below these regions respectively.

#### Scenario: Three regions are present after loading content
- **WHEN** the manager has activated Cargar contenido and the items list is shown
- **THEN** the phone-entry control is shown fixed at the top of the modal body
- **AND** the catalog items list is shown between the phone and the message
- **AND** the optional message field is shown fixed at the bottom of the modal body

#### Scenario: Only the items list scrolls
- **WHEN** the manager scrolls the loaded content because the items list exceeds the available height
- **THEN** only the items list scrolls within its region
- **AND** the phone-entry control stays visible at the top
- **AND** the message field stays visible at the bottom
- **AND** the action buttons stay pinned below

#### Scenario: Phone and message remain reachable without scrolling the items list
- **WHEN** the items list is scrolled to any position
- **THEN** the phone-entry control and the message field are still on screen without needing to scroll the items list back
