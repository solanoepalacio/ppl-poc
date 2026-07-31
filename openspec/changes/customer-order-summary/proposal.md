## Why

The customer form now lists the whole catalog, so ordering means scrolling a long
list and typing quantities as you go. By the time you reach the bottom you cannot
see what you picked at the top, and the only thing the screen tells you is a
count — *"7 productos"*. Seven of what? Confirming is an act of faith, on a phone,
with no way to check without scrolling back up and losing your place.

What is missing is the order itself: the products chosen and how many of each,
readable before committing.

The WhatsApp fallback, meanwhile, has stopped earning its place. It exists so a
customer who cannot get through the form can bail out to a channel that works —
but choosing it burns the single-use link and records nothing, so the bakery gets
a consumed order with no items and has to transcribe by hand anyway, which is
exactly the transcription this product exists to remove. It also sits in the
action bar as a permanent second option next to the one action that matters.

## What Changes

- **Show an itemised order summary** above the action bar: every product with a
  quantity above zero, with its name and that quantity, under the heading
  **Resumen de su pedido**.
- **Keep the summary collapsed by default** behind a **Ver Pedido** control, so
  it costs no screen height until asked for, and close it with an **Ocultar
  Resumen** control at the end of the list. On a phone the list is what the
  customer scrolls; the summary is a check they perform once.
- **Keep the running total** in the action bar as the always-visible indicator,
  unchanged in role: the summary answers *what*, the total answers *how many*.
- **Shrink the brand header and the "Tu pedido" title** so more of the screen
  belongs to the catalog and the summary on a phone.
- **Remove the WhatsApp fallback entirely** — the control, the outcome screen it
  led to, the endpoint behind it, and its analytics event.

## Capabilities

### Modified Capabilities
- `order-intake`: drops the WhatsApp fallback requirement.
- `order-intake-presentation`: replaces the running-summary requirement with one
  covering the itemised, expandable summary; replaces the outcome-states
  requirement so it no longer describes a WhatsApp state; adds a requirement for
  the compact header; and amends the brand and Spanish-copy requirements, which
  both enumerate the states the page can render.
- `order-links`: amends the single-use requirement, which names the WhatsApp
  fallback as one of the two ways a link is consumed.
- `analytics`: drops the WhatsApp fallback event.

## Impact

- **Frontend:** `OrderForm.tsx` (the summary, and the removal), `BrandHeader.tsx`,
  `globals.css`, `lib/api.ts`, `lib/analytics.ts`, `docs/analytics-events.md`.
- **Backend:** the `POST /orders/by-token/:token/whatsapp` route,
  `denyForWhatsapp` in `orders.service.ts`, its tests, and the comments in
  `token.service.ts` / `token.guard.ts` that describe consumption as
  "confirm or WhatsApp".
- **No data model change.** `Order.consumedAt` keeps its meaning; there is simply
  one fewer way to set it. Orders consumed by the old fallback in the past stay
  exactly as they are — consumed, with no items — and remain valid history.
- **This removes a customer escape hatch.** A customer who cannot complete the
  form now has no in-app way out; they will phone or message the bakery, which
  the manager already handles via **Agregar pedido**. That path is better than
  the fallback was, because it captures the items instead of discarding them —
  but it is worth naming that the form is now the only route through the link.
- **The endpoint disappears rather than being deprecated.** A customer with a
  stale page open who taps a cached button would get a 404, which the form
  already renders as the branded invalid-link state. Acceptable for a PoC with
  single-use links measured in hours.
