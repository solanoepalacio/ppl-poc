## REMOVED Requirements

### Requirement: Order status is shown with Spanish display labels
**Reason**: Order status is removed, so there is no stored status value to map to a Spanish display label anywhere in the back office.
**Migration**: The Spanish status-label map is deleted; no order status is shown to the user.

## MODIFIED Requirements

### Requirement: Back-office accessibility strings are in Spanish
All accessibility text in the back-office, including aria-labels and accessible names for controls and regions, SHALL be presented in Spanish (e.g. phone area code, local number, close, navigation region).

#### Scenario: Control aria-labels are Spanish
- **WHEN** a screen reader reads a back-office control that exposes an aria-label (e.g. area-code input, local-number input, modal close button)
- **THEN** the accessible name is presented in Spanish
