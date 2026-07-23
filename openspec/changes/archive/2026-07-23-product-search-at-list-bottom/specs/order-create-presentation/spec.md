## MODIFIED Requirements

### Requirement: Content step uses three regions with only items scrollable
The order-creation modal SHALL be laid out between its pinned title/close header and its pinned action buttons as: the client selector fixed at the top, the added-products list in the middle, and the optional message field fixed at the bottom. The product search SHALL be pinned at the bottom of the added-products list — it does not scroll with the list, and when the list is long enough to scroll it stays fixed at the bottom, rendered over the list's contents. The added-products list SHALL be the only scrollable region; the client selector, the product search, and the message field SHALL remain visible regardless of how far the list is scrolled.

#### Scenario: Regions are present
- **WHEN** the order-creation modal is shown
- **THEN** the client selector is shown fixed at the top
- **AND** the added-products list is shown below it, with the product search pinned at the bottom of that list
- **AND** the optional message field is shown fixed at the bottom

#### Scenario: Only the added-products list scrolls
- **WHEN** the manager scrolls because the added-products list exceeds the available height
- **THEN** only that list scrolls within its region
- **AND** the client selector stays visible at the top
- **AND** the product search stays fixed at the bottom of the list, rendered over its contents
- **AND** the message field stays visible at the bottom
- **AND** the action buttons stay pinned below

#### Scenario: Search and message remain reachable without scrolling the list
- **WHEN** the added-products list is scrolled to any position
- **THEN** the client selector, the product search, and the message field are still on screen without needing to scroll the list back
