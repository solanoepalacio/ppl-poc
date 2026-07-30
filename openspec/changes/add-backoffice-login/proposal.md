## Why

The back office (orders, bloques, production totals) is reachable by anyone who
has the URL, with no gate at all. Before it's shared more broadly it needs a
minimal barrier.

Two constraints shape what that barrier can be. First, the back office is used
from a **TV browser** in the production area, and TV browsers generally do not
render the native HTTP credential dialog that a challenge-based gate relies on —
there is simply no field to type into. The gate has to be an in-page HTML form.
Second, the session has to **survive the TV being switched off and on**: nobody
is going to re-enter credentials with a remote control every morning.

The customer-facing order flow must stay exactly as frictionless as it is today
— a customer opens a tokenized link from WhatsApp and has no way (and no
reason) to be handed a username and password.

## What Changes

- Add a **login page** (`/login`) with a username/password form that
  authenticates against a single shared credential read from environment
  variables, and a **signed session cookie** that the gate checks on every
  request.
- Gate every back-office route and the `/api/:path*` calls those pages make.
  An unauthenticated **page** request is redirected to the login page; an
  unauthenticated **API** request gets a `401` instead, since redirecting a
  `fetch` would hand it an HTML page it would try to parse as JSON.
- The session **persists across browser restarts**, so the TV stays logged in
  when it is powered off and on.
- Add a **Cerrar sesión** control to the back-office sidebar that ends the
  session and returns to the login page.
- **Exclude the customer order flow from the gate**: `/order/:token` and the
  API calls it makes MUST remain reachable with no credentials, since a login
  wall there would break the whole zero-friction premise of the app.
- **Exclude the login page itself**, without which the gate would redirect the
  login page to itself and nobody could ever get in.
- No user accounts, no roles, no password reset — one shared credential, which
  is all this needs.

## Capabilities

### New Capabilities
- `backoffice-auth`: a login-page-and-session gate protecting all back-office
  routes and their API calls, persisting across browser restarts, endable from
  the sidebar, with the customer order-token flow and the login page itself
  explicitly excluded from the gate.

### Modified Capabilities
<!-- none: no existing spec's requirements change. Orders, links, slots, and
     production totals behave exactly as before; this only adds a gate in
     front of the routes that already exist. -->

## Impact

- **Frontend only**: a `middleware.ts` that verifies the session cookie, a
  `/login` page with its form-submit route handler, a logout route handler, and
  a **Cerrar sesión** entry in `Sidebar.tsx`.
- New env vars documented in `packages/frontend/.env.example`: the credential
  (`BACKOFFICE_AUTH_USER`, `BACKOFFICE_AUTH_PASSWORD`) and a signing secret for
  the session cookie (`BACKOFFICE_SESSION_SECRET`).
- No backend, database, or shared-package changes. The backend is not reachable
  by browsers directly (BFF-proxy architecture), so gating the Next.js edge is
  sufficient. No new dependencies — the cookie is signed with the Web Crypto
  API already available in the middleware runtime.
- Production deployments must serve the app over HTTPS: the credential is sent
  in a form POST and the session cookie travels on every request, so both would
  be readable in the clear over plain HTTP.
