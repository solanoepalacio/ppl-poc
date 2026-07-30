## 1. Monorepo & tooling

- [x] 1.1 Initialize Yarn v4 (Corepack) workspace at the repo root with `packages/*`
- [x] 1.2 Scaffold `packages/shared` (TypeScript, built to types consumable by backend + frontend)
- [x] 1.3 Scaffold `packages/backend` (NestJS) and `packages/frontend` (Next.js)
- [x] 1.4 Add root scripts (build/lint/test) and configure Jest in backend and shared
- [x] 1.5 Add `.env` handling for `ORDER_TOKEN_TTL_HOURS` (default 4) and the SQLite/Prisma `DATABASE_URL`

## 2. Shared types

- [x] 2.1 Define the order-status union `'pending' | 'issued' | 'denied' | 'ignored'`
- [x] 2.2 Define `Order`, `Product`, and `OrderItem` interfaces
- [x] 2.3 Define API DTOs: create-link request/response, token-validation response (incl. catalog), confirm-order request, day-view response

## 3. Data model & seed

- [x] 3.1 Add Prisma with SQLite datasource and generate client
- [x] 3.2 Model `Product { id, name, active }`
- [x] 3.3 Model `Order { id, phone, token @unique, status (String), expiresAt, createdAt, confirmedAt? }`
- [x] 3.4 Model `OrderItem { id, orderId, productId, quantity }` with relations to `Order` and `Product`
- [x] 3.5 Create the initial migration
- [x] 3.6 Write a seed that loads the preset product catalog

## 4. Backend — token & order foundation

- [x] 4.1 Implement token generation (URL-safe random, unique) and E.164 phone normalization
- [x] 4.2 Implement a centralized token-validity check: valid only when `now < expiresAt` AND `status === 'pending'` (single-use + expiry)
- [x] 4.3 Add a NestJS guard/pipe that resolves a token to its order and rejects invalid/expired/consumed tokens

## 5. Backend — order-links capability

- [x] 5.1 `POST /links` — normalize phone (reject missing/malformed), create token + `pending` order, return the custom URL
- [x] 5.2 Unit tests: valid phone creates a pending order + token; malformed phone is rejected

## 6. Backend — order-intake capability

- [x] 6.1 `GET /orders/by-token/:token` — return token validity and, when valid, the product catalog for the form
- [x] 6.2 `POST /orders/by-token/:token/confirm` — validate items against the catalog, record items, transition to `issued`; reject empty orders and out-of-catalog items (order stays `pending`)
- [x] 6.3 `POST /orders/by-token/:token/whatsapp` — transition the order to `denied`, record no items
- [x] 6.4 Unit tests: valid confirm → issued; empty/out-of-catalog → rejected & still pending; whatsapp → denied; consumed/expired token → rejected

## 7. Backend — active expiry worker

- [x] 7.1 Add `@nestjs/schedule` job (~1 min interval) that flips `pending` orders with `expiresAt < now` to `ignored`
- [x] 7.2 Unit tests: an expired pending order becomes `ignored`; issued/denied orders are untouched

## 8. Backend — order-management capability

- [x] 8.1 `GET /products` — return the catalog
- [x] 8.2 `GET /orders?day=YYYY-MM-DD` — return orders created that day (default today), each with status, items, and phone
- [x] 8.3 Unit tests: day filtering and default-to-today behavior

## 9. Frontend — customer order form

- [x] 9.1 Route `/order/[token]` — fetch token validity + catalog; render "invalid link" page when not valid
- [x] 9.2 Frictionless picklist form (no login, no prices, no payment): choose catalog products with quantities
- [x] 9.3 Submit → confirm endpoint → show immediate confirmation
- [x] 9.4 "Continue on WhatsApp" control → whatsapp endpoint

## 10. Frontend — back office

- [x] 10.1 Link-generator page: enter phone → call `POST /links` → display the shareable URL
- [x] 10.2 Day view: list orders for a selected day (default today) with status, items, and phone

## 11. Integration & verification

- [x] 11.1 Wire frontend to the backend API base URL via env config
- [x] 11.2 Document run steps (install, migrate, seed, dev) in the README
- [x] 11.3 Manual end-to-end pass: generate link → open form → confirm/deny/let-expire → verify status in the day view and via a status `GROUP BY` query
