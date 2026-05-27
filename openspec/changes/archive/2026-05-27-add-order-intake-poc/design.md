## Context

Pannico replaces manual transcription of WhatsApp orders with a tokenized self-service form. The PoC is greenfield: no existing code. Three capabilities (`order-links`, `order-intake`, `order-management`) revolve around a single `Order` entity that moves through `pending → issued | denied | ignored`. Orders are created when the manager generates a link and reach a terminal state by customer action or token expiry.

Constraints (from project decisions): Yarn v4 monorepo, NestJS backend, Next.js frontend, SQLite + Prisma, single-use tokens, an **active** expiry mechanism for reliable metrics, Jest. This is a trusted-party PoC — no customer auth, no prices, no payments.

## Goals / Non-Goals

**Goals:**
- A clean monorepo skeleton (backend, frontend, shared types) that's easy to extend.
- A data model where order status is the source of truth for usage metrics (placed vs. ignored).
- Single-use, expiring tokens enforced at the API boundary.
- Reliable `pending → ignored` transitions via an active worker, not lazy evaluation.

**Non-Goals:**
- Back-office authentication, sales tracking, invoicing, pricing, payments.
- Catalog management UI (catalog is seed-only).
- Multi-instance/horizontal scaling — the PoC runs as a single backend process.

## Decisions

### Monorepo layout — three workspaces
`packages/backend` (NestJS), `packages/frontend` (Next.js), `packages/shared` (TypeScript interfaces + the order-status union + request/response DTOs).
- **Why shared:** the status values, `Order`/`Product` shapes, and API DTOs are needed by both backend and frontend; a shared package keeps them in lockstep and avoids drift.
- **Alternative considered:** two packages with duplicated types — rejected, drift risk on the status contract that drives metrics.

### Data model (Prisma / SQLite)
- `Product { id, name, active }` — catalog, populated by seed.
- `Order { id, phone, token (unique), status, expiresAt, createdAt, confirmedAt?, ... }` — the token lives **on** the order (1:1), since tokens are single-use and tied to exactly one order. No separate `Token` table needed.
- `OrderItem { id, orderId, productId, quantity }` — items recorded on confirmation; references `Product` so out-of-catalog items are structurally impossible.
- **Status as `String`, not a Prisma enum.** SQLite + Prisma do not support native enums. Status is a `String` column constrained by a shared TypeScript union (`'pending' | 'issued' | 'denied' | 'ignored'`) and validated in the service layer. **Alternative:** Postgres for native enums — rejected, SQLite was chosen for PoC simplicity.

### Token generation & single-use enforcement
- Token = URL-safe random string (`crypto.randomUUID()` / nanoid), stored unique, embedded in the link path (`/order/[token]`).
- A token is **valid** only when `now < expiresAt` AND `order.status === 'pending'`. A single NestJS guard/service method centralizes this check; intake and validation endpoints reuse it.
- **Why centralize:** single-use + expiry is the same predicate everywhere; one implementation prevents inconsistent checks. Expiry window is configurable via an environment variable (e.g. `ORDER_TOKEN_TTL_HOURS`), defaulting to **4 hours**.

### Active expiry worker
- A NestJS scheduled job (`@nestjs/schedule`) runs on an interval (~every minute) and flips every `pending` order with `expiresAt < now` to `ignored`.
- **Why active over lazy:** lazy relabeling on read leaves stale `pending` rows in the DB, so a simple `GROUP BY status` count would over-report pending and under-report ignored. An active sweep keeps the table queryable for honest placed-vs-ignored metrics — the stated reason for the status.
- **Alternative:** external OS cron hitting an endpoint — rejected for the PoC; in-process scheduler needs no extra infra and the app is single-process.

### API surface (backend)
- `POST /links` — `{ phone }` → creates token + `pending` order, returns the custom URL. *(back office)*
- `GET /orders/by-token/:token` — validates token; returns validity + the catalog for the form.
- `POST /orders/by-token/:token/confirm` — `{ items }` → validates against catalog, records items, sets `issued`.
- `POST /orders/by-token/:token/whatsapp` — sets `denied`.
- `GET /products` — catalog.
- `GET /orders?day=YYYY-MM-DD` — day view, defaults to today. *(back office)*

### Frontend (Next.js)
- Customer route `/order/[token]` — server-fetches token validity + catalog, renders the frictionless picklist form or an "invalid link" page.
- Back-office routes — a link generator (phone in → URL out) and a day view of orders with status. Unprotected in the PoC (see Risks).

## Risks / Trade-offs

- **Back office is unauthenticated** → For the PoC it's manager-only and not publicly linked; flag as the first thing to add before any real use. Mitigation: keep it on a non-obvious path / local network during the PoC.
- **SQLite single-writer under the worker + request traffic** → Low volume in a PoC makes contention negligible; Prisma serializes writes. Mitigation: short worker transactions; revisit datastore if concurrency grows.
- **Active sweep interval vs. expiry precision** → An order can sit `pending` up to one interval past `expiresAt` before flipping. Mitigation: a 1-minute interval is far finer than a 24h expiry; acceptable for metrics.
- **Catalog changes via re-seeding** → Editing seeded products can affect historical `OrderItem` references. Mitigation: add new products rather than mutating existing ones; never hard-delete referenced products (`active` flag instead).

## Resolved Decisions

- **Token expiry duration** — configurable via environment variable (`ORDER_TOKEN_TTL_HOURS`), default **4 hours**.
- **Back-office access** — **no auth for the PoC** (manager-only, not publicly linked). First thing to add before real use.
- **Phone normalization** — normalize to **E.164** on link creation; store the normalized value.
