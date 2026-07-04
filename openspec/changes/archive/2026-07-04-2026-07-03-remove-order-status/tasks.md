## 1. Data model & migration

- [x] 1.1 On `Order` in `schema.prisma`: remove the `status` column (and its default); add a
  nullable `consumedAt DateTime?`
- [x] 1.2 Author migration `<ts>_remove_order_status`: rebuild `Order`
  (`PRAGMA foreign_keys=OFF`) without `status` and with `consumedAt`, backfilling
  `consumedAt = createdAt` for rows whose old status was `issued`, `denied`, or `finished`
  (already acted on) and leaving `consumedAt` null otherwise; recreate all `Order` indexes
- [x] 1.3 `prisma generate` so backend code typechecks against the status-free model

## 2. Shared contract

- [x] 2.1 `models.ts`: remove `OrderStatus`/the status union from `Order`. Do NOT expose
  `consumedAt` in the shared model — it is backend-internal (no DTO carries it), so the API
  contract simply drops `status`
- [x] 2.2 `dtos.ts`: drop `status` from the confirm response, the WhatsApp-fallback response,
  and the back-office order shape (`SlotViewOrder`); remove the manual status-update request
- [x] 2.3 Remove `isOrderStatus` (and any status-label helper) and its barrel export
- [x] 2.4 Build the shared package (`tsc`) so both sides consume the new contract

## 3. Backend

- [x] 3.1 Delete the `expiry/` module (the sweep) and remove its registration from
  `AppModule` — this reverses `slot-scoped-link-validity` task 3.4
- [x] 3.2 `slots.service.closeSlot`: remove the `pending→ignored` flip so closing writes no
  order state — this reverses `slot-scoped-link-validity` task 3.3
- [x] 3.3 `orders.service`: stop reading/writing `status` everywhere; set `consumedAt = now`
  on customer confirm and on the WhatsApp fallback; return no `status` in either response
- [x] 3.4 Token validity (`validateToken` and the confirm/whatsapp guards): a token is valid
  only while `consumedAt IS NULL` and its bloque is `open`; a consumed or closed-bloque token
  is invalid
- [x] 3.5 Production totals: drop the status `WHERE` filter so every order in the bloque
  contributes; exclusion is by order deletion only
- [x] 3.6 Remove the manual status-update endpoint/handler from the orders controller/service
- [x] 3.7 Remove the `order_status_changed` analytics event emission and drop `order status`
  from the localized accessibility strings

## 4. Frontend

- [x] 4.1 Delete `OrderStatusControl` and its usage in the order card
- [x] 4.2 Order card / back-office order list: stop rendering an order status (label, dot, and
  the `Estado` control)
- [x] 4.3 Remove the Spanish order-status label map and any `status`-typed fields from
  `lib/api.ts` order/confirm/whatsapp shapes
- [x] 4.4 Remove the `order_status_changed` umami event call and update the analytics docs
  file to drop it
- [x] 4.5 `globals.css`: remove now-dead status-control / status-dot styles

## 5. Tests & verification

- [x] 5.1 Backend specs: confirm sets `consumedAt` and the token is then invalid; the
  WhatsApp fallback sets `consumedAt` and records no items; a closed-bloque token is invalid
  with no order state written; an empty/invalid submission leaves the link usable
- [x] 5.2 Backend specs: production totals sum every order's items in the bloque (no status
  filter) and a deleted order drops out of the totals
- [x] 5.3 Delete the now-obsolete status-flip (closeSlot) and expiry-sweep tests
- [x] 5.4 Build shared, run `prisma migrate` + `db:setup`, typecheck backend & frontend, run
  backend tests
- [x] 5.5 Run dev and exercise the flow: open a valid link → confirm (link now invalid) →
  totals include the order; close the bloque → its links no longer resolve, no order changes
- [x] 5.6 `openspec validate 2026-07-03-remove-order-status --strict` and
  `openspec validate --all`
