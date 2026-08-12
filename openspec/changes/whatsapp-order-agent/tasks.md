## 1. Config

- [x] 1.1 `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN` and
  `META_PHONE_NUMBER_ID` in `.env.example` with comments, never values.
- [x] 1.2 A single place that reads them and reports whether the agent is
  configured, logged once at startup — so "the agent did nothing" is answerable
  without reproducing a delivery.

## 2. The webhook

- [x] 2.1 `GET /whatsapp/webhook`: compare `hub.verify_token`, echo
  `hub.challenge` as a plain body only on a match.
- [x] 2.2 `POST /whatsapp/webhook`: verify `X-Hub-Signature-256` as HMAC-SHA256 of
  the **raw** body against the app secret, with `timingSafeEqual`.
- [x] 2.3 Nest parses and discards the raw body by default — capture it (a
  `rawBody` option or a scoped raw parser) or the signature is checked against a
  re-serialisation, which proves nothing.
- [x] 2.4 Always answer 200, even when rejecting or failing: a non-200 makes Meta
  redeliver the same message for up to seven days.
- [ ] 2.5 Exclude the route from the frontend middleware matcher if it is reached
  through the Next proxy — see 6.2.

## 3. Deciding what to do

- [x] 3.1 Ignore payloads carrying `statuses` rather than `messages`: those are
  our own replies, and treating one as inbound is the loop that has the agent
  answer itself.
- [x] 3.2 Dedupe on the message id (`wamid`). Persisted, not in memory — a retry
  can arrive after a restart, and in-memory state also breaks the moment there is
  more than one process.
- [x] 3.3 Resolve the sender to an active client by phone.
- [x] 3.4 Unknown sender → courtesy reply, nothing created. A retired client
  counts as unknown.

## 4. The reply

- [x] 4.1 `LinksService`: reuse the client's unconsumed order for the open bloque
  instead of creating a second one. Only the agent takes this path — the manual
  control keeps creating a link every time it is pressed, which is what the
  manager means by pressing it.
- [x] 4.2 A suppression window per sender, measured from the last reply sent, so
  a burst is answered once.
- [x] 4.3 Send via `POST /<phone-number-id>/messages`, free-form text. No
  template: the customer messaged first, so the service window is open, the
  message costs nothing and needs no approval.
- [x] 4.4 Copy: `Hola {nombre}! Hacé tu pedido acá: {link} — válido para el
  bloque actual`. Provisional, to be reworded.
- [x] 4.5 A send failure must not discard the order: log it and still answer 200.

## 5. Tests

- [x] 5.1 Signature: valid, invalid, absent. An invalid one creates nothing.
- [x] 5.2 A `statuses` payload produces nothing.
- [x] 5.3 A redelivered `wamid` is acted on once.
- [x] 5.4 Known sender gets a link bound to their client; unknown sender gets the
  courtesy reply and creates nothing; a retired client is unknown.
- [x] 5.5 An outstanding link is reused; a consumed one leads to a new order; a
  closed bloque's link is not reused.
- [x] 5.6 A burst inside the window is answered once.
- [x] 5.7 A send failure leaves the order intact and still answers 200.

## 5b. Verified without touching Meta or the real database

- [x] 5.8 An isolated instance on :3010 against a copy of the database, with a
  Graph API mock on :3020, signing every delivery with a real HMAC. Handshake,
  invalid and absent signature, known sender, the same sender reported with and
  without the `9`, a redelivered `wamid`, an unknown sender, and a payload of
  `statuses` only: all as specified.
- [x] 5.9 Three messages from one client left **one** order, not three.
- [x] 5.10 With no credentials the agent starts inert and the webhook answers 404.
- [x] 5.11 A defect found this way and fixed: the suppression window was keyed on
  the raw `from`, so the same sender reported with and without the `9` counted as
  two and got two replies. It is now stored and queried on the canonical
  identity; the reply still goes to the raw `wa_id`, which is what the platform
  delivers to.

## 5c. Handing the conversation to a person

- [x] 5.12 The link message becomes interactive: the link stays in the body — a
  reply choice returns an id, it cannot open a URL — with **Hablar con un asesor**
  and **Pedido enviado** beside it.
- [x] 5.13 Read `interactive.button_reply.id` out of the delivery, so a tap is
  distinguishable from someone typing the same words.
- [x] 5.14 `WhatsappHandoff`, keyed by the canonical sender, with an `expiresAt`
  that is an **idle** deadline: every further message recomputes it from *now*.
  A span fixed at the start would have the agent begin answering in the middle of
  a conversation with a person, which is the one thing the handover exists to
  prevent.
- [x] 5.15 Check the handover **before** anything else the agent might say, so a
  handed-over conversation costs exactly one write and no reply.
- [x] 5.16 Acknowledge the handover once, then nothing. Without the
  acknowledgement the customer cannot tell being handed over from not having been
  heard.
- [x] 5.17 Implement *Pedido enviado* doing nothing explicitly. Left to fall
  through it would be answered with another link.
- [x] 5.18 Idle window at 3 minutes for testing; raising it costs only a longer
  tail of silence after a conversation ends.
- [x] 5.19 Tests: acknowledged once and no link; silence while it holds; extended
  from the new message; lapsed handovers behave as before; scoped to one sender;
  *Pedido enviado* answered with silence; and the button id read from a real
  delivery shape.

## 5d. Ending a handover on purpose

- [ ] 5.20 List the handovers still holding, each resolved to its client, newest
  activity first. A number matching nobody is still listed under its own number:
  a conversation with somebody the directory does not know is the one most likely
  to be in a person's hands.
- [ ] 5.21 End one by sender. Ending something already gone is a success that
  reports it ended nothing, not a 404: two people ending the same conversation is
  the expected case, not a race to lose.
- [ ] 5.22 An "Asesoría" control in the bloque toolbar: the open conversations,
  who each is with, since when, and a way to end each. Not disabled on a closed
  bloque — a conversation is not scoped to one.
- [ ] 5.23 Read the list when the control opens rather than with the page: it is
  opened on purpose, and one read at page load is stale before anyone looks. Plus
  a way to read it again without closing — by hand, not on a timer: this is
  opened to act on, and a list that reshuffles under the cursor is worse than one
  that is honestly stale.
- [ ] 5.24 Tests: the listing omits lapsed handovers and names the client behind
  each number; ending returns the customer to the agent; ending one leaves the
  others holding; ending something already gone reports it ended nothing.

## 6. Verify locally

- [ ] 6.1 Load the real phone numbers into the directory first, **in the form
  WhatsApp reports the sender** — full country code, no `+`, no separators. A
  number stored without its country code can never match. Check one real inbound
  `wa_id` against what was stored before loading the rest: for Argentina the
  reported id and the dialled number are not always the same string.
- [ ] 6.2 ngrok in front of the frontend, so one tunnel serves both the webhook
  (through the existing `/api` proxy) and the customer link. Point
  `FRONTEND_BASE_URL` at the tunnel or the link will not open on the phone.
- [ ] 6.3 Register the webhook against the Meta test number and confirm the
  handshake.
- [ ] 6.4 Message from Pablo's own number as the customer, registered as a test
  client: a link arrives, opens, and the order confirms into the open bloque.
- [ ] 6.5 Send three messages in a row: one reply, one order.
- [ ] 6.6 Message from an unregistered number: courtesy reply, nothing created.
- [ ] 6.7 Confirm the reply's own status events do not trigger a second reply.
- [ ] 6.8 Remove every test order and client afterwards; the base holds real data.
