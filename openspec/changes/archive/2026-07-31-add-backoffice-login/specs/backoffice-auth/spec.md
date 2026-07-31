## ADDED Requirements

### Requirement: Back office requires an authenticated session
The system SHALL require an authenticated session for every back-office route
and every API call those routes make. A request without a valid session MUST be
rejected and MUST NOT reach the back-office page or its data. Session validity
SHALL be established by a cookie the system itself issued and can verify as
unmodified; a cookie whose contents have been altered or forged MUST NOT be
accepted.

#### Scenario: Request without a session
- **WHEN** a request to a back-office route carries no session cookie
- **THEN** the system rejects the request and does not render the route

#### Scenario: Request with a tampered session cookie
- **WHEN** a request carries a session cookie whose value was altered or
  fabricated rather than issued by the system
- **THEN** the system rejects the request

#### Scenario: Request with a valid session
- **WHEN** a request to a back-office route carries a session cookie the system
  issued
- **THEN** the system allows the request to reach the route

### Requirement: Unauthenticated page requests go to the login page, API requests get an error
The system SHALL send an unauthenticated request for a back-office **page** to
the login page, and SHALL reject an unauthenticated request for an **API** path
with a 401 status instead of redirecting it. An API caller MUST NOT be answered
with the login page's markup, which it would try to interpret as data.

#### Scenario: Unauthenticated page request
- **WHEN** an unauthenticated request asks for a back-office page
- **THEN** the system sends it to the login page

#### Scenario: Unauthenticated API request
- **WHEN** an unauthenticated request asks for a gated API path
- **THEN** the system responds with a 401 status
- **AND** does not respond with the login page's markup

### Requirement: The login page is reachable without a session
The login page and the endpoint its form submits to SHALL be reachable without a
session. They MUST NOT be gated, since gating them would send the login page to
itself and leave no way to authenticate at all.

#### Scenario: Visiting the login page with no session
- **WHEN** a request with no session cookie asks for the login page
- **THEN** the login page is served

#### Scenario: Submitting credentials with no session
- **WHEN** the login form is submitted by a request with no session cookie
- **THEN** the submission is processed rather than rejected or redirected away

### Requirement: The login form authenticates against configured credentials
The login page SHALL present a form for a username and a password, submitted
without requiring client-side scripting. When the submitted values match the
configured credentials, the system SHALL start a session and send the visitor to
the back office. When they do not match, the system SHALL return to the login
page reporting the failure as text and SHALL NOT start a session.

#### Scenario: Correct credentials start a session
- **WHEN** the login form is submitted with the configured username and password
- **THEN** the system starts a session
- **AND** sends the visitor to a back-office page

#### Scenario: Incorrect credentials are refused
- **WHEN** the login form is submitted with a wrong username or password
- **THEN** no session is started
- **AND** the login page is shown again with a message explaining the attempt
  failed

#### Scenario: Login does not depend on client-side scripting
- **WHEN** the login form is submitted in a browser that runs no client-side
  scripting
- **THEN** the submission is still processed and a valid attempt starts a session

### Requirement: Login returns the visitor to the page they asked for
When an unauthenticated request for a specific back-office page is sent to the
login page, a successful login SHALL return the visitor to that originally
requested page. The system MUST only honour a requested destination that is a
local path within the application; any other destination MUST be ignored in
favour of a default back-office page, so the login page cannot be used to send
visitors to an unrelated site.

#### Scenario: Returning to the requested page
- **WHEN** an unauthenticated visitor asks for a specific back-office page and
  then logs in successfully
- **THEN** they arrive at that page rather than a default one

#### Scenario: An external destination is ignored
- **WHEN** a login is completed with a requested destination that points outside
  the application
- **THEN** the visitor is sent to a default back-office page instead

### Requirement: The session persists across browser restarts
A started session SHALL remain valid after the browser is closed and reopened,
including after the device it runs on is powered off and on, so that a display
left in the production area does not have to be logged in again each time it is
switched on. The system SHALL NOT require the visitor to re-authenticate on a
schedule of its own.

#### Scenario: Session survives a browser restart
- **WHEN** a visitor logs in, then closes and reopens the browser
- **THEN** the back office is still reachable without logging in again

#### Scenario: Session survives a device power cycle
- **WHEN** the device showing the back office is switched off and on again
- **THEN** the back office is still reachable without logging in again

### Requirement: The manager can end the session from the sidebar
The back-office sidebar SHALL present a control to end the session. Activating
it MUST invalidate the visitor's session so that back-office routes are no
longer reachable, and SHALL leave them at the login page.

#### Scenario: Ending the session
- **WHEN** the manager activates the end-session control in the sidebar
- **THEN** the session is ended and the login page is shown

#### Scenario: Back office is gated again after ending the session
- **WHEN** the manager has ended the session and then requests a back-office
  page
- **THEN** the request is sent to the login page rather than served

### Requirement: Customer order-token flow is excluded from the gate
The system SHALL NOT require a session for the customer order form route or for
the API calls it makes to act on a token (validating the token or confirming an
order). This exclusion SHALL apply even while the back office is gated, and the
customer SHALL never be shown the login page.

#### Scenario: Customer opens an order link
- **WHEN** a customer requests the order form route for a token, with no session
  cookie
- **THEN** the system serves the route without requiring a session

#### Scenario: Customer confirms an order
- **WHEN** a customer submits the order confirmation for a token, with no
  session cookie
- **THEN** the system processes the request without requiring a session

#### Scenario: The customer is never sent to the login page
- **WHEN** a customer uses their order link while the back office is gated
- **THEN** they are never redirected to the login page

### Requirement: Missing credential configuration denies all back-office access
When any part of the configuration the gate depends on — the username, the
password, or the secret used to sign the session cookie — is absent or blank,
the system MUST reject every request to a gated back-office route and MUST NOT
allow a login to succeed. It MUST NOT fall back to comparing against empty
values, since that would leave the back office reachable with a trivially
guessable credential whenever the configuration is missing. A deployment that
forgets to configure the gate therefore denies access rather than granting it.

#### Scenario: No credentials configured at all
- **WHEN** neither the username nor the password is configured and a login is
  attempted with empty values
- **THEN** no session is started and access is refused

#### Scenario: Only part of the configuration is present
- **WHEN** some but not all of the username, password, and signing secret are
  configured
- **THEN** every request to a gated back-office route is refused
- **AND** no login can succeed

#### Scenario: The customer flow is unaffected by missing configuration
- **WHEN** the gate's configuration is missing
- **THEN** the customer order-token flow remains reachable as always
