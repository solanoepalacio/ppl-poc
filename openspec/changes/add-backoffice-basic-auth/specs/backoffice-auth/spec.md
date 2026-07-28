## ADDED Requirements

### Requirement: Back office requires HTTP Basic Auth
The system SHALL require HTTP Basic Auth credentials — a single shared username
and password configured via environment variables — for every back-office
route and every API call those routes make. A request without valid
credentials MUST be rejected and MUST NOT reach the back-office page or its
data.

#### Scenario: Unauthenticated request to a back-office route
- **WHEN** a request to a back-office route carries no `Authorization` header
- **THEN** the system rejects the request and does not render the route

#### Scenario: Request with incorrect credentials
- **WHEN** a request to a back-office route carries an `Authorization` header
  whose username or password does not match the configured credentials
- **THEN** the system rejects the request

#### Scenario: Request with correct credentials
- **WHEN** a request to a back-office route carries an `Authorization` header
  matching the configured username and password
- **THEN** the system allows the request to reach the route

### Requirement: Rejected requests receive a Basic Auth challenge, not a login page
The system SHALL respond to a rejected back-office request with HTTP 401 and a
`WWW-Authenticate: Basic` header, so the browser's native credential prompt
collects the username and password. The system SHALL NOT render or redirect to
a custom login page.

#### Scenario: Missing credentials trigger the browser's native prompt
- **WHEN** a request to a back-office route is rejected for missing or
  invalid credentials
- **THEN** the response has status 401 and a `WWW-Authenticate: Basic` header
- **AND** no custom login page is rendered

### Requirement: Customer order-token flow is excluded from the auth gate
The system SHALL NOT require Basic Auth credentials for the customer order
form route or for the API calls it makes to act on a token (validating the
token, confirming an order, or choosing the WhatsApp fallback). This exclusion
SHALL apply even when back-office credentials are configured and enforced.

#### Scenario: Customer opens an order link
- **WHEN** a customer requests the order form route for a token, with no
  `Authorization` header
- **THEN** the system serves the route without requiring credentials

#### Scenario: Customer confirms an order
- **WHEN** a customer submits the order confirmation for a token, with no
  `Authorization` header
- **THEN** the system processes the request without requiring credentials

#### Scenario: Customer chooses the WhatsApp fallback
- **WHEN** a customer activates the WhatsApp fallback for a token, with no
  `Authorization` header
- **THEN** the system processes the request without requiring credentials
