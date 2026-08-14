# Analytics events

Pannico's frontend reports usage to [umami](https://umami.is). This document is
the source of truth for the analytics taxonomy. Keep it in sync with the
`AnalyticsEvent` union in [`src/lib/analytics.ts`](../src/lib/analytics.ts) and
the call sites that emit each event.

## Configuration & enablement

- The umami `<script>` is injected only on **production builds**
  (`NODE_ENV=production`), by `src/app/UmamiScript.tsx`. Local development
  (`next dev`) never loads the script and sends no analytics traffic.
- It is also withheld on the **unattended views** — `/production/*` and
  `/revisar-pedidos` — which are therefore not tracked at all. See *Unattended
  displays* below.
- Host and website id default to the homelab umami instance
  (`http://umami.home:3000`, website id `92aac9e1-8f20-4385-ad2d-df7e99619fdf`)
  and can be overridden with `NEXT_PUBLIC_UMAMI_HOST` /
  `NEXT_PUBLIC_UMAMI_WEBSITE_ID`.
- Custom events are emitted via `trackEvent(name, props?)`, which is a safe no-op
  when umami is not present.

## Page views

Page views are tracked **automatically** by umami on every route that loads the
script — no in-app code is involved. That is the customer order form
(`/order/[token]`), the login page (`/login`), and the back-office views
`/orders` and `/clientes`. The custom events below capture actions and
conversions that page views can't.

`/production/*` and `/revisar-pedidos` load no script and so produce no page
views at all — see *Unattended displays*.

## Custom events

Properties never carry a client's name, phone number, or a product's identity —
only counts, flags, and quantities. The back office is a single shared login, so
there is no per-user dimension to any of this.

### Customer order form

| Event | When it fires | Properties | Source |
|-------|---------------|------------|--------|
| `order_confirmed` | Customer successfully confirms an order via the form | `itemCount`, `totalQuantity` | `order/[token]/OrderForm.tsx` |
| `order_confirm_failed` | A confirmation attempt fails for any reason other than an invalid link | `reason` (`server`/`network`), `status`, `itemCount` | `order/[token]/OrderForm.tsx` |
| `order_summary_toggled` | Customer opens or closes the order summary | `open`, `itemCount` | `order/[token]/OrderForm.tsx` |
| `order_filter_used` | Customer types in the catalog filter (once per visit) | — | `order/[token]/OrderForm.tsx` |
| `order_link_invalid` | The invalid / expired / already-used link view renders, on load or mid-form | — | `order/[token]/TrackInvalidLink.tsx` |

`order_review_raised` is **gone**, along with the review gate that produced it.
Confirming now submits on its first activation, so there is no intermediate state
left to count, and the drop-off it measured no longer exists. `order_confirmed`
is unaffected and remains the count of orders placed — a comparison against it
that spans the removal will show the gap closing rather than a change in orders.

`order_confirm_failed` now fires only once a submission's retries are exhausted,
not on the first transient failure, so its count is closer to "customers who
could not order" than it used to be.

### Back office — orders

| Event | When it fires | Properties | Source |
|-------|---------------|------------|--------|
| `order_link_generated` | Manager generates a shareable order link | — | `(backoffice)/orders/GenerateLinkModal.tsx` |
| `order_link_copied` | Manager copies a generated link to the clipboard | — | `(backoffice)/orders/GenerateLinkModal.tsx` |
| `order_created_direct` | Manager creates an order directly from the back-office | `itemCount`, `totalQuantity` | `(backoffice)/orders/CreateOrderModal.tsx` |
| `order_items_edited` | Manager saves an edit to an order's items | `itemCount`, `totalQuantity` | `(backoffice)/orders/OrderActions.tsx` |
| `order_deleted` | Manager deletes an order | — | `(backoffice)/orders/OrderActions.tsx` |

### Back office — bloque

| Event | When it fires | Properties | Source |
|-------|---------------|------------|--------|
| `slot_close_blocked` | A close is refused because products have a negative stock actual | `shortfallCount`, `totalShortfall` | `(backoffice)/orders/CloseSlotButton.tsx` |
| `slot_closed` | A bloque is closed and its successor opened | — | `(backoffice)/orders/CloseSlotButton.tsx` |
| `stock_saved` | Manager saves the bloque's stock inicial | `productCount`, `totalQuantity`, `shortfallCount` | `(backoffice)/orders/ExistenceEditor.tsx` |
| `produced_saved` | Manager saves producción real | `productCount`, `entryCount`, `totalQuantity`, `added`, `removed` | `(backoffice)/orders/ProducedEditor.tsx` |

A bloque with a negative stock actual can no longer be closed, so what is worth
measuring changed with it. `slot_close_blocked` counts how often that refusal
stops a close and how deep the hole was — the signal being whether the rule is a
rare safety net or a daily obstruction. It has no counterpart event: dismissing
the dialog is the only thing left to do, so a second one would just mirror it.
`slot_closed` carries no shortfall properties because a close that succeeds has
none by construction.
On `produced_saved`, `added`/`removed` track entries appended and deleted per
save — the save is deliberately non-idempotent, so a duplicated batch followed
by a deletion is a real pattern worth seeing.

### Back office — client directory

| Event | When it fires | Properties | Source |
|-------|---------------|------------|--------|
| `client_created` | Manager adds a client | `hasPhone` | `(backoffice)/clientes/ClientDirectory.tsx` |
| `client_updated` | Manager saves an in-place row edit | `nameChanged`, `phoneChanged` | `(backoffice)/clientes/ClientDirectory.tsx` |
| `client_deactivated` | A client with orders is retired, or one is retired explicitly | `orderCount` | `(backoffice)/clientes/ClientDirectory.tsx` |
| `client_reactivated` | A retired client is reinstated | `orderCount` | `(backoffice)/clientes/ClientDirectory.tsx` |
| `client_deleted` | A client with no orders is deleted outright | `orderCount` (always `0`) | `(backoffice)/clientes/ClientDirectory.tsx` |

The removal control does two different things depending on `orderCount`, so it
emits two different events — folding them together would hide how much of the
directory is actually being destroyed rather than retired.

## Not instrumented

- **Login and logout.** `/login/submit` and `/logout` are route handlers and
  `trackEvent` is client-only, so reporting them would mean plumbing a marker
  through the redirect. Successful logins are approximated by back-office page
  views. Deliberate omission, not an oversight.
- **Sidebar navigation and collapse.** Navigation is already page views.
- **`AutoRefresh` / `AutoScroll` ticks.** Unattended machinery, not user actions.

## Unattended displays

`/production/salados`, `/production/dulces`, and `/revisar-pedidos` sit on TV
screens in the production area that are opened once and left for the day. Those
are real page views but not real visits, and left tracked they distort session
duration, bounce rate, and visitors-per-day for the whole site.

**`UmamiScript` does not inject the tracker on those routes**, so they report
nothing — no page views and no custom events. The exclusion is by route rather
than by device, which means the occasional visit a person makes to one of these
screens from a desk is dropped along with the kiosk's. That is deliberate: the
views are read-only, so there is nothing to measure on them worth skewing every
other figure for.

Two consequences to know about:

- **Navigating into one of these routes from a tracked one still counts a view.**
  The tracker is already loaded and umami follows client-side route changes; only
  a fresh load of a kiosk route is silent. That is a manager clicking the sidebar
  — real traffic, and it holds no session open.
- **The exclusion is not why filtering was rejected — it is the alternative to
  it.** Umami's dashboard filters work on its own built-in dimensions, so tagging
  kiosk traffic with an event property would have made it visible without making
  it subtractable from the site-wide numbers that were the problem.

If these views ever need measuring, the way back is a per-device opt-out on the
TVs (umami reads a `umami.disabled` flag from `localStorage`) with the route
exclusion removed — that keeps human visits and drops only the kiosks.

## Adding or changing an event

1. Add/rename the event in the `AnalyticsEvent` union in `src/lib/analytics.ts`.
2. Emit it with `trackEvent(...)` at the call site.
3. Update the table above (name, trigger, properties, source).
