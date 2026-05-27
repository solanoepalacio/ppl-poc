## Why

Today a human manually transcribes WhatsApp orders written in free-form natural language into the bakery's internal product descriptors before forwarding them to the production line — slow and error-prone. This PoC tests whether a zero-friction order form (no login, no prices, no payment) gets trusted customers to submit structured orders directly, removing the manual translation step.

## What Changes

- The bakery manager gets a back-office page to generate a short-lived, single-customer order link (custom URL + token) keyed to a customer's phone number, to hand to the customer over WhatsApp.
- Customers open the link and submit an order through a minimal form — no login, no prices, no payment — and the order is confirmed automatically on submit.
- The order form includes a "continue on WhatsApp" escape hatch for customers who prefer the existing flow.
- An order is created on the backend when the manager generates the link, associated with the customer's phone number via the token.
- Each order carries a status: `pending` when the link is generated, `issued` when the customer confirms, `denied` when the customer chooses the WhatsApp fallback, or `ignored` when the link's token expires before the customer acts.
- The back office shows the manager orders by day, with their status (so they can be handed to the production line).

Out of scope for this PoC: sales tracking, invoicing, pricing, payments, and customer authentication.

## Capabilities

### New Capabilities
- `order-links`: Back-office generation of short-lived order tokens and their custom URLs, each tied to a single customer phone number; token issuance, expiry, and validation.
- `order-intake`: The customer-facing minimal order form reached via the tokenized URL — token validation, structured order entry, automatic confirmation on submit, and the "continue on WhatsApp" fallback.
- `order-management`: Backend storage of orders associated to a phone number via the token, the order status field (`pending`/`issued`/`denied`/`ignored`), plus the back-office view of orders by day.

### Modified Capabilities
<!-- None — no existing specs; this is the initial build. -->

## Impact

- New application built from scratch: backend (token issuance/validation, order persistence), customer-facing order form, and a back-office UI.
- New dependencies: web framework, a datastore for tokens and orders. Specific tech choices are deferred to `design.md`.
- No existing code or APIs affected (greenfield PoC).
