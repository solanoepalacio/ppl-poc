## ADDED Requirements

### Requirement: Analytics properties carry no personal data

Event properties SHALL be limited to counts, flags, quantities, and fixed
enumerated reasons. Client names, phone numbers, product names, product ids, and
order ids SHALL NOT be sent to the analytics host.

#### Scenario: A client edit is reported without its contents
- **WHEN** a manager saves an edit to a client's name or phone number
- **THEN** the event reports which fields changed
- **AND** it carries neither the previous nor the new value

#### Scenario: An order event is reported without its products
- **WHEN** any event describing an order is emitted
- **THEN** it carries item counts and quantities only, never product identities

### Requirement: Instrumented customer review gate

The customer order flow SHALL emit events for the review step that precedes the
first confirmation, so the gate's effect on completion can be measured.

#### Scenario: Review raised on first confirm
- **WHEN** a customer presses confirm for the first time and the review summary
  is raised instead of the order being submitted
- **THEN** an `order_review_raised` event is emitted with the item count, the
  total quantity, and whether the summary was already open
- **AND** the count of these events against `order_confirmed` gives the
  drop-off through the gate

#### Scenario: Summary opened or closed
- **WHEN** a customer opens or closes the order summary
- **THEN** an `order_summary_toggled` event is emitted carrying which of the two
  it was and the item count

#### Scenario: Catalog filter used
- **WHEN** a customer types into the catalog filter
- **THEN** an `order_filter_used` event is emitted at most once per visit
- **AND** no further event is emitted for subsequent keystrokes

### Requirement: Instrumented customer confirmation failures

The customer order flow SHALL report confirmations that fail, since a customer
who cannot submit has no other way to tell the bakery.

#### Scenario: Confirmation rejected or unreachable
- **WHEN** a confirmation fails for any reason other than the link being invalid
- **THEN** an `order_confirm_failed` event is emitted distinguishing a server
  rejection from an unreachable server, with the HTTP status and the item count

#### Scenario: Invalid link is not double-reported
- **WHEN** a confirmation fails because the link is no longer valid
- **THEN** `order_confirm_failed` is NOT emitted
- **AND** the invalid-link view emits `order_link_invalid` as it already does

### Requirement: Instrumented bloque close and shortfall discard

The back office SHALL report each outcome of the close-bloque decision
separately, because closing discards any negative stock actual and that loss is
irreversible.

#### Scenario: Shortfall warning shown
- **WHEN** closing the open bloque would discard a shortfall and the warning is
  raised
- **THEN** a `slot_close_shortfall_shown` event is emitted with the number of
  products short and the total units short

#### Scenario: Close abandoned after the warning
- **WHEN** the manager dismisses the warning without closing — by the cancel
  control, the dialog's close control, escape, or the backdrop
- **THEN** exactly one `slot_close_cancelled` event is emitted, carrying the
  shortfall that was on screen

#### Scenario: Bloque closed
- **WHEN** a bloque is closed
- **THEN** a `slot_closed` event is emitted carrying whether a shortfall was
  discarded, how many products were short, and the total units lost
- **AND** a close with nothing short reports a zero shortfall rather than being
  omitted

#### Scenario: A failed close does not consume the prompt
- **WHEN** a close attempted over the warning fails and the manager retries
- **THEN** the retry's `slot_closed` event still reports the shortfall being
  discarded

### Requirement: Instrumented bloque stock and production saves

The back office SHALL report saves to the two figures that feed a bloque's stock
position.

#### Scenario: Stock inicial saved
- **WHEN** a manager saves the bloque's stock inicial
- **THEN** a `stock_saved` event is emitted with the number of products carrying
  an initial, the total quantity, and how many products stand at a negative
  stock actual

#### Scenario: Producción real saved
- **WHEN** a manager saves producción real
- **THEN** a `produced_saved` event is emitted with the product count, entry
  count, and total quantity
- **AND** it separately reports entries added and entries removed by this save,
  so the duplicates the non-idempotent save can produce are observable

### Requirement: Instrumented client directory

The back office SHALL emit an event for every mutation of the client directory,
keeping retirement and deletion distinct.

#### Scenario: Client added
- **WHEN** a manager adds a client
- **THEN** a `client_created` event is emitted recording whether a phone number
  was supplied

#### Scenario: Client edited
- **WHEN** a manager saves an in-place edit to a client row
- **THEN** a `client_updated` event is emitted recording which fields changed

#### Scenario: Removal reports which operation occurred
- **WHEN** a manager removes a client that no order references
- **THEN** a `client_deleted` event is emitted
- **AND WHEN** a manager removes a client that orders reference, so it is
  retired instead, a `client_deactivated` event is emitted
- **AND** both carry the client's order count

#### Scenario: Client reinstated
- **WHEN** a retired client is reactivated
- **THEN** a `client_reactivated` event is emitted

### Requirement: Uninstrumented surfaces are documented

Surfaces deliberately left untracked SHALL be recorded as such, so a later reader
can tell an omission from an oversight.

#### Scenario: Authentication is listed as a deliberate omission
- **WHEN** a developer looks for login and logout events
- **THEN** the event reference states that they are not instrumented and why —
  both are server route handlers and the tracker is client-only

#### Scenario: Unattended displays are described
- **WHEN** a developer wonders why the production and order-review screens report
  no traffic
- **THEN** the event reference states that the tracker is withheld on those
  routes and why
- **AND** it records what the exclusion costs — visits people make to those
  screens are dropped too — and the per-device opt-out that would recover them

## MODIFIED Requirements

### Requirement: Umami script injection on deployed environments

The frontend SHALL load the umami tracking script on deployed environments so
that page views are recorded automatically, and SHALL NOT load it during local
development.

The script SHALL NOT be loaded on the unattended production-area views, whatever
the environment, so that displays left open all day cannot distort site-wide
session duration, bounce rate, or visitor counts. Those views are read-only and
have nothing to measure that would justify the distortion.

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

#### Scenario: Unattended view loaded directly
- **WHEN** a browser loads `/production/salados`, `/production/dulces`, or
  `/revisar-pedidos` on a deployed build
- **THEN** the umami script is absent from the document
- **AND** neither a page view nor any custom event is reported for that visit

#### Scenario: Attended views are unaffected
- **WHEN** a browser loads the customer order form, `/login`, `/orders`, or
  `/clientes` on a deployed build
- **THEN** the script is present and page views are reported as before

#### Scenario: Prefix matching respects path boundaries
- **WHEN** a path is tested against the untracked prefixes
- **THEN** a route nested under one of them is untracked
- **AND** a route whose name merely begins with those characters is not
