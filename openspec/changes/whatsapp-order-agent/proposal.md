## Why

Today a customer who wants to order has to wait for a person to notice, pick
them in the back office, generate a link and paste it into WhatsApp. The bakery
already has the number, the customer already wrote to it, and the link is the
same link every time — the manual step buys nothing but latency, and only works
while somebody is looking at the screen.

## What Changes

- **A webhook the Meta Cloud API can call**, verified on registration and with
  every delivery's signature checked.
- **An inbound message from a known number is answered with an order link.** The
  sender's number resolves to a client in the directory; the reply carries that
  client's link for the open bloque.
- **An inbound message from an unknown number gets a courtesy reply** telling
  them to leave the order in the chat and that a person will take it. Nothing is
  created for them.
- **One link per customer per bloque, not per message.** A client with a link
  already outstanding is sent that link again rather than being given a new one,
  and repeated messages inside a short window are answered once.
- **The manual Generar link control stays**, for unknown numbers and customers
  who are not on WhatsApp.

## Capabilities

### Added Capabilities
- `whatsapp-order-agent`: the webhook, the sender resolution, the replies, and
  the rules that keep one message from becoming three orders.

### Modified Capabilities
- `order-links`: link generation stops being described as something only the
  manager does from the back office.
- `client-directory`: the phone number gains its purpose — resolving an inbound
  message to exactly one client.

## Impact

- **Backend:** a new `whatsapp/` module. `LinksService` grows a "reuse the
  outstanding link" path that the manual control does not use.
- **Config:** `META_VERIFY_TOKEN`, `META_APP_SECRET`,
  `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID`, all from the environment.
  None are ever logged, and the agent is inert unless all are set — an absent
  configuration must not turn into an endpoint that answers Meta with errors.
- **Exposure:** the webhook is the first back-office-adjacent route that must be
  reachable without a session, so it is excluded from the middleware matcher the
  way the customer token routes already are.
- **No template and no per-message cost.** The customer messages first, which
  opens the 24-hour service window, so both replies are free-form text. This is
  also why the courtesy reply is not a template: inside the window it does not
  need to be one, and a template would need Meta's approval before it could be
  sent at all.
- **The reply is best-effort.** If Meta rejects the send, the order and its link
  still exist — the manager can fall back to the manual control. The webhook
  still answers 200, because a non-200 makes Meta retry the same message for up
  to seven days.
- **Local first.** Verified against a Meta test number with ngrok in front, not
  deployed. `FRONTEND_BASE_URL` has to be the public tunnel URL or the link that
  reaches the customer's phone will not open.
