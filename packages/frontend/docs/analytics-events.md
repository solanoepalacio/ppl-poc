# Analytics events

Pannico's frontend reports usage to [umami](https://umami.is). This document is
the source of truth for the analytics taxonomy. Keep it in sync with the
`AnalyticsEvent` union in [`src/lib/analytics.ts`](../src/lib/analytics.ts) and
the call sites that emit each event.

## Configuration & enablement

- The umami `<script>` is injected only on **production builds**
  (`NODE_ENV=production`), by `src/app/UmamiScript.tsx`. Local development
  (`next dev`) never loads the script and sends no analytics traffic.
- Host and website id default to the homelab umami instance
  (`http://umami.home:3000`, website id `92aac9e1-8f20-4385-ad2d-df7e99619fdf`)
  and can be overridden with `NEXT_PUBLIC_UMAMI_HOST` /
  `NEXT_PUBLIC_UMAMI_WEBSITE_ID`.
- Custom events are emitted via `trackEvent(name, props?)`, which is a safe no-op
  when umami is not present.

## Page views

Page views are tracked **automatically** by umami for every route — no in-app
code is involved. This covers the customer order form (`/order/[token]`), the
back-office orders view (`/orders`), and the production view (`/production`).
The custom events below capture actions and conversions that page views can't.

## Custom events

| Event | When it fires | Properties | Source |
|-------|---------------|------------|--------|
| `order_confirmed` | Customer successfully confirms an order via the form | `itemCount`, `totalQuantity` | `order/[token]/OrderForm.tsx` |
| `order_link_invalid` | The invalid / expired / already-used link page renders | — | `order/[token]/TrackInvalidLink.tsx` |
| `order_link_generated` | Manager generates a shareable order link | — | `(backoffice)/orders/CreateOrderModal.tsx` |
| `order_link_copied` | Manager copies a generated link to the clipboard | — | `(backoffice)/orders/CreateOrderModal.tsx` |
| `order_created_direct` | Manager creates an order directly from the back-office | `itemCount`, `totalQuantity` | `(backoffice)/orders/CreateOrderModal.tsx` |
| `order_items_edited` | Manager saves an edit to an order's items | `itemCount`, `totalQuantity` | `(backoffice)/orders/OrderActions.tsx` |
| `order_deleted` | Manager deletes an order | — | `(backoffice)/orders/OrderActions.tsx` |

## Adding or changing an event

1. Add/rename the event in the `AnalyticsEvent` union in `src/lib/analytics.ts`.
2. Emit it with `trackEvent(...)` at the call site.
3. Update the table above (name, trigger, properties, source).
