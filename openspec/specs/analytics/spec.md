# analytics Specification

## Purpose

Defines how the application records usage analytics via umami: automatic page-view tracking through an injected script on deployed environments, a safe helper for emitting custom events from client components, the custom events instrumented across the customer order flow and the back-office, and a documented taxonomy of every available event.
## Requirements
### Requirement: Umami script injection on deployed environments

The frontend SHALL load the umami tracking script on deployed environments so
that page views are recorded automatically, and SHALL NOT load it during local
development.

The umami host and website id SHALL default to the homelab values
(`http://umami.home:3000` and website id `92aac9e1-8f20-4385-ad2d-df7e99619fdf`)
and MUST be overridable via the `NEXT_PUBLIC_UMAMI_HOST` and
`NEXT_PUBLIC_UMAMI_WEBSITE_ID` environment variables.

#### Scenario: Script loaded on a deployed build
- **WHEN** the app runs in a deployed (production) build
- **THEN** the umami `script.js` is included in the document with the configured
  `data-website-id`
- **AND** page views are reported to the umami host without any in-app code call

#### Scenario: Script absent during local development
- **WHEN** the app runs via the local development server (`next dev`)
- **THEN** the umami script is not present in the document
- **AND** no analytics requests are sent

#### Scenario: Host and website id overridden via env vars
- **WHEN** `NEXT_PUBLIC_UMAMI_HOST` and/or `NEXT_PUBLIC_UMAMI_WEBSITE_ID` are set
- **THEN** the injected script uses the provided values instead of the defaults

### Requirement: Safe custom event helper

The frontend SHALL expose a typed helper for emitting custom umami events that is
safe to call from any client component regardless of environment.

#### Scenario: Event emitted when umami is present
- **WHEN** a tracked action occurs and `window.umami` is available
- **THEN** the helper forwards the event name and properties to umami

#### Scenario: No-op when umami is absent
- **WHEN** a tracked action occurs and `window.umami` is not available (local dev,
  script blocked, or not yet loaded)
- **THEN** the helper does nothing and does not throw

### Requirement: Instrumented back-office events

The back-office SHALL emit custom events for its primary management actions.

#### Scenario: Order link generated and copied
- **WHEN** a manager generates a shareable order link
- **THEN** an `order_link_generated` event is emitted
- **AND** when the manager copies that link, an `order_link_copied` event is emitted

#### Scenario: Direct order created
- **WHEN** a manager creates an order directly from the back-office
- **THEN** an `order_created_direct` event is emitted with the item count and
  total quantity

#### Scenario: Order edited or deleted
- **WHEN** a manager edits an order's items
- **THEN** an `order_items_edited` event is emitted
- **AND WHEN** a manager deletes an order, an `order_deleted` event is emitted

### Requirement: Documented event taxonomy

The repository SHALL contain a documentation file that lists every available
analytics event, its trigger, and its properties, kept in sync with the
instrumented code.

#### Scenario: Event reference exists and is complete
- **WHEN** a developer needs to know which analytics events exist
- **THEN** a docs file enumerates each event name, when it fires, and its
  properties
- **AND** every custom event emitted by the code appears in that document

### Requirement: Instrumented customer order outcomes

The customer-facing order flow SHALL emit custom events at its key outcomes.

#### Scenario: Order confirmed via form
- **WHEN** a customer successfully confirms an order through the form
- **THEN** an `order_confirmed` event is emitted with the item count and total
  quantity

#### Scenario: Invalid order link opened
- **WHEN** a customer opens an order link that is expired or already used
- **THEN** an `order_link_invalid` event is emitted

