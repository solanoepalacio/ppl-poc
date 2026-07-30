## Why

The back office (orders, bloques, production totals) is reachable by anyone who
has the URL, with no gate at all. Before it's shared more broadly it needs a
minimal barrier. The customer-facing order flow must stay exactly as
frictionless as it is today — a customer opens a tokenized link from WhatsApp
and has no way (and no reason) to be handed a username/password.

## What Changes

- Add a Next.js middleware that requires **HTTP Basic Auth** — a single shared
  username/password read from environment variables — on every back-office
  route and on the `/api/:path*` calls those pages make.
- **Exclude the customer order flow from the gate**: `/order/:token` and the
  API calls it makes MUST remain reachable with no credentials, since a link
  consumed for auth would break the whole zero-friction premise of the app.
- No login page, no session, no cookie, no user table — unauthenticated
  requests to a gated route get a `401` with a `WWW-Authenticate: Basic`
  header and the browser's native credential prompt handles the rest.
- Scoped entirely to `packages/frontend`; the backend is not directly
  reachable by browsers (BFF-proxy architecture), so it needs no changes.

## Capabilities

### New Capabilities
- `backoffice-auth`: an HTTP Basic Auth gate protecting all back-office routes
  and their API calls, with the customer order-token flow explicitly excluded
  from the gate.

### Modified Capabilities
<!-- none: no existing spec's requirements change. Orders, links, slots, and
     production totals behave exactly as before; this only adds a gate in
     front of the routes that already exist. -->

## Impact

- **Frontend only**: new `packages/frontend/src/middleware.ts` checking the
  `Authorization` header against `BACKOFFICE_AUTH_USER` /
  `BACKOFFICE_AUTH_PASSWORD` env vars, with a matcher that excludes
  `/order/:path*` (and Next internals/static assets).
- New env vars documented in `packages/frontend/.env.example`.
- No backend, database, or shared-package changes. No new dependencies —
  Basic Auth decoding only needs the built-in `atob`/`Buffer`.
- Production deployments must serve the app over HTTPS; Basic Auth credentials
  are base64-encoded, not encrypted, so they'd travel in the clear over plain
  HTTP.
