## Context

The agent's order-summary receipt is **implemented but knowingly incomplete**, and
the open question is which channel carries it. This note exists so the decision
can be made later without re-deriving the analysis, because almost none of it is
visible from the code.

What is built today: a customer who confirms an order gets the summary as a
**free-form** WhatsApp message, sent after the transaction and best-effort. That
works only inside Meta's 24-hour customer service window.

## The problem

The window opens on the customer's **last inbound message** and lasts 24 hours.
Outside it, Meta refuses any free-form message (`131047`) and only an approved
template gets through.

Two facts about this bakery make that bite:

1. **A bloque runs 3–4 days**, closed by hand by the manager — not daily. A
   customer can write on Monday, receive the link, and confirm on Wednesday. The
   link is still valid, because it dies with the bloque and not with the window,
   so the confirmation succeeds and only the receipt is refused. "Have every
   order arrive through the agent" therefore does **not** fix this, which was the
   first conclusion reached and it was wrong.
2. **Links shared by hand never open a window at all.** A customer given a link
   generated in the back office has never written to the number. Today this is
   the main flow.

And the receipt is not decoration: it is wanted as a **comprobante** — something
the customer can point at when disputing an order. A receipt that arrives
sometimes does not do that job.

## The alternative: a utility template

Meta's pricing documentation, checked 2026-08-11:

- Per-message pricing since 2025-07-01; charged only on delivery.
- Free-form service messages inside the window: **free**.
- **Utility templates inside an open window are also free** — billed as
  `free_customer_service`.
- Outside the window a utility template is charged, by country and volume tier.

That third point is the one that decides the shape of the code: because a utility
template costs nothing while the window is open, there is **no reason to branch**.
One path — always send the template — is free exactly when the free-form path
would have been, costs a few cents when the free-form path would have failed
outright, and always delivers. If the template is adopted, the free-form summary
is deleted rather than kept as a fast path.

**Cost, unresolved.** Meta publishes Argentine rates only in a downloadable rate
card, not on the pricing page. Two third-party sources disagreed —
USD 0.0299 and USD 0.0085 per utility message. Same order of magnitude, so at
500 receipts a month with *every one* outside the window it is USD 4–15; the real
figure is lower, since same-day confirmations cost nothing. **Get the real number
from WhatsApp Manager → Insights → Pricing before deciding.**

**The cost that is not money.** Template parameters may not contain newlines,
tabs, or more than four consecutive spaces. The itemised list has to be flattened
onto one line:

    Alo Bar, recibimos tu pedido: Medialunas x10, Facturas x6, Pan x2.

which reads worse than the current one-product-per-line summary, exactly for the
purpose the receipt exists — checking it item by item. A variant worth weighing:
the template carries a link to a receipt page instead of the detail. Rejected as
the default, since for a dispute the message itself should be the record; a link
can break.

## Decision

**Deferred.** Free-form ships as-is, and is understood to fail for confirmations
outside the window. The order is never affected — the failure is logged and the
confirmation stands.

What is needed to close it: the real Argentine rate, and whether a single-line
itemisation is acceptable as a comprobante.

## What is already in place for either answer

The channel is behind a seam: `ORDER_NOTIFIER` in `orders/order-notifier.ts` is a
token and an interface, injected optionally, and the agent registers itself
against it. The order path names no channel. Switching to a template is a change
inside `WhatsappService.sendOrderSummary` and nowhere else — pick the template,
flatten the items, post `type: 'template'` instead of `type: 'text'`. Everything
about when it is sent, what happens when it fails, and who it goes to already
holds and is covered by tests.

Not covered: the template has to be created and approved in WhatsApp Manager
under the **Utility** category before any of that can be tried, and approval is
external to this repo.
