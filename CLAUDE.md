# Pannico

Bakery order-intake app. A manager generates single-use customer links (shared over
WhatsApp); customers confirm an order from a catalog; the back office manages orders,
per-product production totals, and production **bloques**.

Behavioral specs live in `openspec/` — read those for *what* the system does. This file
is the *how*: stack, layout, commands, conventions.

## Monorepo (Yarn 4 workspaces)

- `packages/shared` — `@pannico/shared`. TypeScript DTOs + domain contracts (order status,
  slot status, request/response interfaces) imported by both backend and frontend. Source
  of truth for the API contract. Must be built (`tsc`) before the others typecheck.
- `packages/backend` — NestJS + Prisma over **SQLite**. REST API on `:3000`. Modules:
  `orders/`, `links/`, `slots/`, `expiry/`, `prisma/`, `config/`, `common/`.
- `packages/frontend` — Next.js 14 **App Router**. Back office under
  `src/app/(backoffice)/`, customer form under the order-token routes. Serves on `:3001`.

## Commands

Run per-workspace with `yarn workspace @pannico/<pkg> run <script>`, or all at once with
`yarn workspaces foreach -At run <script>`.

- Typecheck (this repo's "lint" **is** `tsc --noEmit`): `yarn workspace @pannico/backend run lint`
- Test (backend only, Jest): `yarn workspace @pannico/backend run test`
- Run dev: backend `yarn workspace @pannico/backend start:dev` (:3000), then
  frontend `yarn workspace @pannico/frontend dev` (:3001). Open http://localhost:3001.
- DB (from `packages/backend`): `yarn prisma migrate dev` (create/apply + regenerate),
  `yarn prisma migrate deploy` (apply existing), `yarn prisma generate` (client),
  `yarn db:setup` (deploy + generate + seed). Seed: `yarn prisma:seed`.
- OpenSpec: `openspec validate --all`, `openspec list` (CLI v1.2.0).

After changing `schema.prisma` you must `yarn prisma generate` before backend code
referencing the new models will typecheck.

## Architecture & conventions

- **BFF proxy:** the browser never hits the backend directly. `next.config.js` rewrites
  `/api/:path*` → `${BACKEND_INTERNAL_URL}/:path*` (default `http://localhost:3000`).
  `lib/api.ts` uses relative `/api` in the browser and `BACKEND_INTERNAL_URL` on the server.
- **Frontend data flow:** async **React Server Components** fetch via `lib/api.ts`
  (`cache: 'no-store'`). Selected state (day/bloque) lives in the **URL** (`?slotId=`), not
  client state. Client islands (`'use client'`) mutate via the API then `router.refresh()`.
  No react-query, no external state lib, no component library — plain semantic HTML + CSS
  classes (`.card`, `.row`, `.muted`) in `globals.css`.
- **Contract:** cross-cutting types go in `@pannico/shared` and are consumed by both sides —
  don't redeclare response shapes locally.
- **Naming:** code identifiers are **English** (`Order`, `Slot`, `slotId`, route `/slots`),
  user-facing text is **Spanish** (`Órdenes`, `Bloques`, "bloque de producción"). Match this.
- **Enums as strings:** SQLite has no native enums, so `Order.status` and `Slot.status` are
  plain string columns validated in the service layer against unions in `@pannico/shared`
  (`isOrderStatus`, `isSlotStatus`).
