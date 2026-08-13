# Pannico — Order Intake PoC

Zero-friction bakery order intake. The manager generates a single-use order
link from the back office and shares it (e.g. WhatsApp); the customer opens it
and submits a structured order — no login, no prices, no payment — or falls back
to WhatsApp. A link stays valid while the production bloque it was created in is
open and it has not been used; closing the bloque retires its unused links.
Orders are grouped by bloque.

## Layout (Yarn v4 monorepo)

- `packages/shared` — TypeScript types/DTOs shared by backend + frontend.
- `packages/backend` — NestJS API, Prisma/SQLite.
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

## Deploy (Docker Compose)

Long-running install, e.g. the homelab box. Both services are built from the
repo root and restart with the machine (`restart: unless-stopped` + the Docker
daemon's own boot unit — no systemd unit of ours).

```bash
docker compose up -d --build     # UI → :6065, API → :6066
docker compose logs -f           # follow both
docker compose down              # stop (data is kept, see below)
```

Configuration is read from the same `packages/*/.env` files used for local
development; `docker-compose.yml` overrides only the values that describe
*where things are*, since those differ inside the container network:
`DATABASE_URL`, the two ports, and `BACKEND_INTERNAL_URL`. Secrets
(`META_*`, `BACKOFFICE_*`) stay in the env files and are never baked into an
image. `FRONTEND_BASE_URL` — the public origin used to build shareable order
links — comes from `packages/backend/.env` and needs to be the URL customers
actually reach, not a `localhost` one.

**Data.** The SQLite database lives on a bind mount at `./data/backend/pannico.db`
(git-ignored), outside the images, so it survives restarts and rebuilds. Back it
up by copying that file. To carry over an existing development database:

```bash
mkdir -p data/backend && cp packages/backend/prisma/dev.db data/backend/pannico.db
```

The backend applies `prisma migrate deploy` and re-runs the (idempotent) seed on
every start, so a fresh volume and an existing database converge to the same
schema and catalog.

**Rebuild after changing `BACKEND_INTERNAL_URL`.** Next.js freezes the
`/api/*` → backend rewrite into the build, so that one value is passed as a
build arg as well as an environment variable. `docker-compose.yml` derives both
from a single YAML anchor; changing it requires `up -d --build`, not just a
restart.

## Test / build / typecheck

```bash
yarn test     # unit tests (backend: Jest)
yarn build    # build every workspace
yarn lint     # typecheck every workspace
```

## API

| Method | Path                               | Purpose                                    |
| ------ | ---------------------------------- | ------------------------------------------ |
| POST   | `/links`                           | Create an order + single-use link.         |
| GET    | `/orders/by-token/:token`          | Token validity + catalog for the form.     |
| POST   | `/orders/by-token/:token/confirm`  | Record items, consume the link.            |
| POST   | `/orders/by-token/:token/whatsapp` | WhatsApp fallback, consume the link.       |
| GET    | `/products`                        | Active catalog.                            |
| GET    | `/orders?slotId=`                  | Bloque view (defaults to the open bloque). |

## Link validity

A single-use token is valid only while its order has not been consumed **and** its
production bloque is still open. Confirming an order and choosing the WhatsApp
fallback both consume the link (`Order.consumedAt`); closing a bloque invalidates
every unused link in it (no order state is written — a closed bloque's links are
simply no longer valid).
