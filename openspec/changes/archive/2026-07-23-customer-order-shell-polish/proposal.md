## Why

Testing the reworked customer page surfaced a few issues: the action bar no longer
stayed pinned to the bottom once the list was short, the search scrolled out of
view as the list grew, and the page carried redundant "add a product" guidance
(the subtitle and an explicit "add at least one product" hint on top of the
disabled button and the empty state).

## What Changes

- **Full-viewport app shell.** The customer page pins the brand header, title, and
  search at the top and the action bar at the bottom, with the added-products list
  as the only scrolling region — so the action bar stays pinned whether the list
  is empty or long, and the search stays reachable.
- **Drop redundant guidance.** Remove the page subtitle and the "add at least one
  product" hint; the disabled **Confirmar pedido** and the empty-state line already
  make it clear. The empty-state guidance and the search placeholder remain.
- **Smaller quantity field** so product names wrap less often.

## Capabilities

### Modified Capabilities

- `order-intake-presentation`: the entry screen no longer shows a subtitle or a
  dedicated "add at least one product" hint (the disabled primary action stands on
  its own); presentation-only.

## Impact

- **Frontend only.** `OrderForm` wraps the entry state in a full-height `customer-
  shell`; `globals.css` makes the customer list the scroll region, pins the header
  /search/action-bar, and narrows the quantity field — all scoped to the customer
  page. No behavior or contract change.
