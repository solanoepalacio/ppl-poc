## Why

`Order.status` (`pending|issued|denied|ignored|finished`) exists to drive two things:
single-use link validity and a production-totals filter. Both are now done more simply.
Validity is already slot-scoped — a token is good only while its bloque is `open` — and
totals should just reflect what the bakery has to bake. The status column adds a five-state
lifecycle, a manual status control, an expiry sweep, and a close-time `pending→ignored`
flip: machinery nobody needs. Single-use is really one bit — has this link been used yet?
This change deletes the whole status model and replaces it with a nullable `Order.consumedAt`
timestamp. A token is valid only while `consumedAt` is null and its bloque is `open`.
Confirm and the WhatsApp fallback both set `consumedAt`. Mistaken orders are excluded from
totals by deleting them, not by re-tagging a status.

## What Changes

- **Remove `Order.status` entirely** — the five-value string column, its `@pannico/shared`
  union and `isOrderStatus` guard, and every code path that reads or writes it.
- Add a nullable `Order.consumedAt` timestamp. Single-use link validity becomes
  `consumedAt IS NULL AND slot.status === 'open'`. Confirm and the WhatsApp fallback both
  set `consumedAt`; neither writes any lifecycle status.
- **Production totals sum every order's items in the bloque** — no status filter. To exclude
  a mistaken order the manager deletes it.
- Closing a bloque no longer writes any order state — a closed bloque's links are invalid
  purely because `slot.status === 'closed'`. This **reverses** the `pending→ignored` flip
  added by `2026-07-03-slot-scoped-link-validity` (its task 3.3).
- **Delete the expiry sweep module**, which the same archived change had repurposed (its
  task 3.4). Nothing sweeps order state anymore.
- Remove the manual status control (`OrderStatusControl`), the Spanish status display
  labels, the status presentation requirement, and the `order_status_changed` analytics
  event.
- **BREAKING** (API/wire): `POST /orders/:token/confirm` and the WhatsApp-fallback response
  no longer return a `{ status }` body, and back-office order payloads drop `status`.

## Capabilities

### Modified Capabilities

- `order-management`: orders no longer carry a status; persistence, the back-office grouped
  view, manual creation, and item edits drop all status wording. The "Orders carry a status"
  and "Manager can manually update an order's status" requirements are removed.
- `order-links`: single-use is expressed as "the order has not yet been consumed" instead of
  "still `pending`"; link generation just creates an order (no `pending` status); closing a
  bloque writes no order state.
- `production-slots`: closing the open bloque no longer transitions still-pending orders to
  `ignored` — it writes no order state.
- `production-totals`: totals sum every order's items in the bloque; the
  "Only production-relevant statuses are counted" requirement is removed.
- `order-intake`: confirming records the order and consumes the link (no `issued`); the
  WhatsApp fallback consumes the link (no `denied`); rejection leaves the link usable.
- `back-office-presentation`: the "Order status control is labelled, not color-coded"
  requirement is removed.
- `back-office-localization`: the "Order status is shown with Spanish display labels"
  requirement is removed; accessibility strings no longer enumerate the order-status control.
- `analytics`: the `order_status_changed` event and its scenario are dropped from the
  instrumented back-office events.

### Removed Capabilities

None. `Order.status` is not a standalone capability; its requirements are removed *within*
the capabilities above (see the delta specs). No capability spec is retired wholesale.

## Impact

- **Data**: drop `Order.status` (with its default); add nullable `Order.consumedAt`
  (`DATETIME`). Migration `<ts>_remove_order_status` rebuilds `Order` without `status` and
  with `consumedAt`, backfilling `consumedAt` = the created instant for orders that were
  `issued`/`denied`/`finished` (already acted on) and leaving it null otherwise.
- **Backend**: delete the `expiry/` module (sweep) and its registration; remove the
  `pending→ignored` flip from `slots.service.closeSlot`; `orders.service` stops reading or
  writing `status`, sets `consumedAt` on confirm and on the WhatsApp fallback, and gates
  token validity on `consumedAt IS NULL AND slot open`; production totals drop the status
  `WHERE` filter; remove the manual status-update endpoint/handler.
- **Shared**: remove `OrderStatus`, the status union, `isOrderStatus`; drop `status` from
  `Order` and from confirm/whatsapp/back-office DTOs; add `consumedAt` to `Order`.
- **Frontend**: delete `OrderStatusControl`; the order card and back-office list stop
  rendering a status; drop the Spanish status label map; remove the `order_status_changed`
  event emission.
- **Tests**: update backend specs to assert `consumedAt` semantics (confirm/whatsapp set it,
  a consumed token is invalid, a closed-bloque token is invalid with no state write) and
  totals summing every order; delete status-flip and expiry-sweep tests.
- **Wire contract**: confirm and WhatsApp-fallback responses lose their `{ status }` body;
  clients that read it must stop.
- **Historical data**: a legacy order that was manually set to `denied` or `ignored` *and*
  still carried items would previously have been excluded from totals; under the new rule
  every order's items count, so such an order would now be counted. There are no known such
  orders, but the backfill does not delete anything — a manager who wants one excluded must
  delete it.
