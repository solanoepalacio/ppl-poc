## 1. Remove the WhatsApp fallback (backend)

- [x] 1.1 `orders.controller.ts`: drop the `POST /orders/by-token/:token/whatsapp`
  route.
- [x] 1.2 `orders.service.ts`: drop `denyForWhatsapp`.
- [x] 1.3 `orders.service.spec.ts`: drop its `describe('denyForWhatsapp')` block.
- [x] 1.4 `token.service.ts` / `token.guard.ts`: fix the comments describing
  consumption as "confirming or choosing the WhatsApp fallback" — confirming is
  now the only way. Leave the behaviour alone; `consumedAt` is unchanged.

## 2. Remove the WhatsApp fallback (frontend)

- [x] 2.1 `lib/api.ts`: drop `continueOnWhatsapp`.
- [x] 2.2 `OrderForm.tsx`: drop the secondary button, the `whatsapp()` handler, the
  `'denied'` outcome and the branded state it rendered, and the `whatsapp` copy key.
- [x] 2.3 `lib/analytics.ts` and `docs/analytics-events.md`: drop
  `whatsapp_fallback_selected`.
- [x] 2.4 `BrandHeader.tsx`: its doc comment lists the states it is shared across;
  drop the WhatsApp one.
- [x] 2.5 `globals.css`: drop `.action-bar .btn-secondary`, which only styled the
  removed fallback control.
- [x] 2.6 `middleware.ts`: exempt `pannico-wordmark.png`. Pre-existing bug, found
  while checking the header: `_next/image` is exempt but the *source* file is not,
  so the optimizer fetched it back through the gate, got the login redirect and
  answered 400 — the public customer page was rendering with no logo at all.

## 3. Itemised order summary

- [x] 3.1 `OrderForm.tsx`: derive the summary rows from `quantities` in catalog
  order, keeping only quantities above zero, so the list reads in the same order
  as the catalog the customer just scrolled.
- [x] 3.2 Render it collapsed by default behind a **Ver Pedido** control, headed
  **Resumen de su pedido**, with a **Ocultar Resumen** control at the end of the
  list.
- [x] 3.3 Keep the running count in the action bar exactly as it is, and keep
  **Confirmar pedido** always reachable — the summary must not push it off screen.
  Cap the summary's height and let it scroll internally.
- [x] 3.4 Hide the reveal control when nothing is selected: an empty summary is
  not worth a control, and the count already reads zero.
- [x] 3.5 `globals.css`: styles for the summary block, its heading, rows and the
  two controls. Rows are name + quantity, sized for a thumb on a phone.

## 4. Compact header

- [x] 4.1 `globals.css`: reduce `.brand-header` padding and wordmark height, and
  the `h1` on the customer shell, so both take a small share of a phone viewport.
- [x] 4.2 Measure the result at a phone viewport rather than eyeballing it —
  report what fraction of the height the header plus title occupy, before and
  after.

## 5. Verify

- [x] 5.1 `lint` and `test` on the backend; `lint` on the frontend.
- [x] 5.2 Confirm no reference to the removed endpoint, helper or event survives
  anywhere in the repo.
- [x] 5.3 Drive the form in a phone-sized browser: quantities typed, **Ver
  Pedido** reveals exactly the selected products with their quantities, changing a
  quantity while open updates the summary, **Ocultar Resumen** collapses it, the
  count and **Confirmar pedido** stay visible throughout, and confirming still
  succeeds end to end.
- [x] 5.4 Confirm the WhatsApp button is gone from the form and the endpoint
  returns 404.
