# Pannico — Order Intake PoC

Zero-friction bakery order intake. The manager generates a single-use order
link from the back office and shares it (e.g. WhatsApp); the customer opens it
and submits a structured order — no login, no prices, no payment — or falls back
to WhatsApp. A link stays valid while the production bloque it was created in is
open; closing the bloque expires its unused links. Orders carry a status
(`pending → issued | denied | ignored`) grouped by bloque.

## Layout (Yarn v4 monorepo)

- `packages/shared` — TypeScript types/DTOs shared by backend + frontend.
- `packages/backend` — NestJS API, Prisma/SQLite, active expiry worker.
- `packages/frontend` — Next.js (App Router): customer form + back office.

## Prerequisites

- Node.js 20+
- Corepack (ships with Node): `corepack enable` (provides Yarn v4)

## Setup

```bash
# 1. Install dependencies (repo root)
corepack enable
yarn install

# 2. Build shared types (backend & frontend depend on them)
yarn workspace @pannico/shared build

# 3. Environment
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env.local

# 4. Database: migrate, generate client, seed catalog
yarn workspace @pannico/backend prisma migrate deploy
yarn workspace @pannico/backend prisma generate
yarn workspace @pannico/backend prisma:seed
```

**Environment variables**

`packages/backend/.env`:

- `DATABASE_URL` — SQLite file (default `file:./dev.db`, relative to `prisma/`)
- `FRONTEND_BASE_URL` — used to build shareable links (default `http://localhost:3001`)
- `PORT` — backend port (default `3000`)

`packages/frontend/.env.local`:

- `NEXT_PUBLIC_API_BASE_URL` — backend base URL (default `http://localhost:3000`)

## Run (two terminals)

```bash
yarn workspace @pannico/backend start:dev    # API → http://localhost:3000
yarn workspace @pannico/frontend dev         # UI  → http://localhost:3001
```

- Back office: <http://localhost:3001> — generate a link at `/links`, view orders at `/orders`.
- Customer form: open the generated `/order/<token>` URL.

> The back office is **unauthenticated** (PoC only) — keep it off public URLs and add auth before real use.

## Test / build / typecheck

```bash
yarn test     # unit tests (backend: Jest)
yarn build    # build every workspace
yarn lint     # typecheck every workspace
```

## API

| Method | Path                               | Purpose                                    |
| ------ | ---------------------------------- | ------------------------------------------ |
| POST   | `/links`                           | Create a `pending` order + link (phone).   |
| GET    | `/orders/by-token/:token`          | Token validity + catalog for the form.     |
| POST   | `/orders/by-token/:token/confirm`  | Record items, transition to `issued`.      |
| POST   | `/orders/by-token/:token/whatsapp` | WhatsApp fallback, transition to `denied`. |
| GET    | `/products`                        | Active catalog.                            |
| GET    | `/orders?day=YYYY-MM-DD`           | Day view (defaults to today).              |

## Statuses

- `pending` — link generated, not yet acted on.
- `issued` — customer confirmed via the form.
- `denied` — customer chose "continue on WhatsApp".
- `ignored` — link went unused: its bloque was closed while the order was still
  `pending` (flipped atomically on close, with an in-process worker sweeping
  every ~minute as a backstop, keeping `GROUP BY status` metrics honest).
