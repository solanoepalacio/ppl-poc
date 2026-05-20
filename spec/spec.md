# Pannico Production Line Automation
This project is a **PoC** that streamlines order taking process of a small to medium bakery, taking orders from customers through whatsapp, recording them to a backend and presenting them through a front end application to stakeholders.
The orders are B2B for a whitelisted set of clients.

## User Stories:
1. As a client I want to be able to start an order through whatsapp and decide on the items of the order with a good ux. 
2. As a production line worker I want to able to see how many of each item I need to produce today.
3. As a manager I want to be able to manage orders

## Edge Cases:

## System Overview:
At a high level, the system is composed of the following subsystems:

### Client Orders pipeline:
A pipeline to take client orders through whatsapp, deduplicates them by message id, then structure and store them on a database.
The pipeline has a conversational surface, where an agent handles greetings and questions but redirects to a **Custom Order Form** for the customer to complete the order.
The communication with the customer through whatsapp is two-way.
The order data is exposed through a rest api to serve the admin and production line front end applications.
Price, Payment and Stock information is out of scope for the PoC.

### Admin application:
Allows the bakery manager to see the current status of the system and manage essential data.
- what's currently in line for production
- See and manage client orders:
    - manually crud an order
- manage the product catalog
    - crud of available items
- manage the production slots
    - Mark production slots as closed
    - Move orders between production slots
- Connecting the system to whastapp using a QR code

### Production line application:
An application to be used by the workers at the production line
Probably displayed on a television for general visibility of the production line staff.
It shows only the summary of what needs to be produced in the current slot, by units of finished items.
For PoC there's no feedback from the production line about what production has been completed.

 <!-- TODO: Fill the titles below with medium level description of the different subsystems and components. Each of them can point to a detailed technical specification of one or multiple components. -->
## Subsystems Overview:

### Client Order Pipeline:
The Client Order Pipeline is the entry point of the system. It is responsible for receiving incoming WhatsApp messages from whitelisted B2B clients, holding a light conversation when needed, driving the customer to a structured order submission via a web form, and persisting the resulting order in a durable store. It explicitly does **not** attempt to extract order items from free-form text; structured order capture is the responsibility of the Token Based Order Form (see below).

Key components:
- **WhatsApp Gateway** (WIP): receives inbound messages and emits internal events. Outbound replies to the customer also flow through here.
- **Conversational Agent**: an LLM-backed agent that handles the messages and recognizes when the customer's intent is to place an order, in that case the agent issues a single-use order form link and steps out of the way.
- **Order Submission Handler**: receives the payload from a completed order form, identifies the client from the WhatsApp identity tied to the form token, and persists the order in `PENDING` (WIP: order status) state assiging it to "OPEN" production slot.

- **Dead-letter handling**: messages that fail processing after retries are moved to a dead-letter store for operator review.
    - (WIP: We consider that a message fail if the LLM doesn't recongnize the user intention?)

WIP -> Detailed spec: `spec/subsystems/client-order-pipeline.md`

#### Token Based Order Form

A short-lived, single-use web form delivered to the customer through a unique URL sent via WhatsApp. The form presents the active product catalog and lets the customer choose items and quantities. Submission produces a structured order payload that the pipeline can persist without natural-language parsing.

Key properties:
- **Token-bound identity**: each link carries a signed token that binds the form session to a specific WhatsApp identity. The customer does not authenticate; identity is established by possession of the token.
- **Single-use**: a token is invalidated upon successful submission, or after expiration. Re-orders require a new link.
- **Stateless on the client**: all order state lives server-side; the form is just a view over the catalog plus a submission endpoint.

Out of scope for the PoC:
- Saved drafts / resumable sessions.
- Customer-facing order history.
- Modifying an already-submitted order from the form itself (must go through Admin).

> Detailed spec: `spec/components/order-form.md`

### Production Slot & Scheduling: 
A production slot represents a unit of production work tied to a particular date. Every order belongs to exactly one slot. Slots transition through an OPEN -> CLOSED state. There will be always one OPEN slot.

Responsibilities:
- **Slot resolution**: an order will be automatically assing to the OPEN slot.
- **Slot lifecycle**: The first slot will be created as OPEN. Closing the OPEN slot will trigger the creation of the next slot in an OPEN state. Closing a slot is a manual action from the Admin app for the PoC.
- **Carry-over**: (TO BE DEFINED) 
    1) production not completed in a slot can be carried over to the next one. For the PoC, carry-over is a manual operation performed from the Admin app.
    2) Give the possibility to the admin to manually enter the carry over of the different products for the production slot  
- **Slot queries**: provide the OPEN slot used by the Production Line Application to compute what needs to be produced today.

WIP > Detailed spec: `spec/subsystems/production-slot-scheduling.md`

### Product Catalog Management:
Owns the set of products the bakery can produce. The catalog is the source of truth for:
- Items shown in the Token Based Order Form.
- Items aggregated by the Production Line Application.

For the PoC the catalog is small and managed exclusively from the Admin Application. CRUD operations are exposed through the REST API. Products have a stable identifier, a human-facing name and a category/sub-category (WIP); pricing, stock, and recipes are out of scope.

A product cannot be hard-deleted while it is referenced by any non-terminal order. Removal from the active catalog is achieved via a soft-disable flag that hides the product from new order forms but preserves historical references.

WIP > Detailed spec: `spec/subsystems/product-catalog.md`


### Order Management:
Owns the lifecycle and persistence of orders, regardless of whether they were created via the Client Order Pipeline or manually by a manager. Exposes a REST API consumed by the Admin Application and the Production Line Application.

Capabilities:
- Create / read / update / soft-delete orders.
- Move an order between production slots.
- Track an order's source (`WHATSAPP` vs. `MANUAL`) and the originating message / form submission when applicable.
- (WIP) Maintain an audit trail of changes (who, when, what changed). Even in the PoC this is necessary because orders drive production.

Order state model and field-level rules (which fields are editable in which state, validation rules) are defined in the detailed spec.

> Detailed spec: `spec/subsystems/order-management.md`

### Product Line Application:
A read-only frontend intended to be displayed on a TV in the production area. It shows the aggregated list of items to produce for the "current" production slot, summed across all orders in that slot.

Key properties:
- **Aggregation, not orders**: workers see "120 units of product A", not the underlying orders.
- **Polling-based refresh**: the app polls the backend on a fixed interval to pick up new orders that arrive during the slot's open window.
- **No write path**: the PoC does not capture production progress from the line. The display is one-way.
- **Single slot view**: the app shows only the slot currently in production; navigation across slots is not part of the PoC.

NOTE: the "current" slot is the one that corresponds to the current date. This clarification is because when the OPEN slot is closed by the admin, the slot shown in the Product Line Application should not change.

> Detailed spec: `spec/components/admin-app.md`

### Bot Whatsapp Auth:
Manages the lifecycle of the WhatsApp session used by the bot to send and receive messages. Authentication is performed by scanning a QR code from the Admin Application, which pairs the bot with a WhatsApp account.

Responsibilities:
- Expose the current QR code (when one is needed) to the Admin Application.
- Track and expose session state (`DISCONNECTED`, `AWAITING_QR`, `CONNECTED`).
- Persist the session credentials so that the bot can resume after restarts without re-pairing.
- Emit events when the session drops, so the Admin app can prompt for re-pairing.

This subsystem is the only one that holds WhatsApp-account-level credentials; every other subsystem interacts with WhatsApp exclusively through the gateway in the Client Order Pipeline.

> Detailed spec: `spec/subsystems/bot-whatsapp-auth.md`