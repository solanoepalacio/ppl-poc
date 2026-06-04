## Why

When the manager chooses **Cargar contenido**, the order-creation modal loads a long catalog list. Today phone, items, and message all live inside one scrolling region, so the phone number scrolls out of view while picking quantities, and the message field is only reachable after scrolling past the entire catalog. The manager loses sight of who the order is for and how to finish it. Keeping phone and message anchored — and scrolling only the items — keeps the order's context and its completion action always in view.

## What Changes

- Restructure the content step of the order-creation modal into three regions: **phone (fixed, top)**, **items (the only scrollable region)**, and **message (fixed, bottom)**.
- The items list scrolls within its own bounded region; phone and message stay pinned regardless of scroll position. The existing header (title/close) and footer (Crear orden / Volver) remain pinned as today.
- No change to the choose/link steps, to validation, submission, or to the data sent on order creation — this is a layout-only change to how the content step is presented.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `order-create-presentation`: Adds a requirement specifying the three-region fixed/scrollable layout of the content step (phone fixed, items scrollable, message fixed).

## Impact

- Frontend only. Affected files:
  - `packages/frontend/src/app/(backoffice)/orders/CreateOrderModal.tsx` — group phone/items/message into the three layout regions for the content step.
  - `packages/frontend/src/app/globals.css` — modal body becomes a flex column with a single bounded scroll region for items; phone and message fixed.
- No backend, API, data model, or dependency changes.
