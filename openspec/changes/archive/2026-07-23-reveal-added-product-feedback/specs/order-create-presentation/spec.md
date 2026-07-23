## ADDED Requirements

### Requirement: Adding a product gives placement feedback
When the manager picks a product from the search results, the system SHALL close the search results and SHALL reveal that product's row in the added-products list — scrolling it into view when it is off-screen — and SHALL briefly highlight the row, so the manager can see that the product was added and where it landed. The highlight is transient and SHALL fade on its own.

#### Scenario: Picking closes the results and reveals the row
- **WHEN** the manager picks a product from the search results
- **THEN** the search results close
- **AND** the product's row in the added-products list is shown and briefly highlighted

#### Scenario: An off-screen added product is scrolled into view
- **WHEN** the picked product's row would fall outside the visible area of the added-products list
- **THEN** the list scrolls so that the product's row is brought into view

#### Scenario: The highlight is temporary
- **WHEN** a product's row has been highlighted after being added
- **THEN** the highlight fades on its own without further action
