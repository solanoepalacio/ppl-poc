## Context

The back office (`(backoffice)` route group: orders, bloques, production
totals) and the customer order form (`/order/[token]`) are both served by the
same Next.js app on the same origin, with `/api/:path*` rewritten to the
backend (`next.config.js`). The backend is never reached by the browser
directly. Today neither surface requires any credential.

Tracing how the customer flow actually talks to the backend matters for scoping
the gate correctly:
- `/order/[token]/page.tsx` is a **Server Component**; its `validateToken` call
  goes straight to `BACKEND_INTERNAL_URL` server-to-server (see
  `lib/api.ts`), never through the browser and therefore never through
  middleware.
- The client-side `OrderForm` (confirm order, WhatsApp fallback) *does* run in
  the browser and calls the relative `/api/orders/by-token/:token/...`
  endpoints, which the middleware sits in front of.

So the gate has two things to exclude, not one: the page route itself, and the
by-token API calls the page's client components make.

## Goals / Non-Goals

**Goals:**
- Require a single shared username/password (HTTP Basic Auth) to view or act
  on any back-office route.
- Leave `/order/:token` and its API calls completely open — no header, no
  prompt, no change in behavior for customers.
- Zero backend changes: the backend stays unreachable by browsers directly, so
  gating the Next.js edge is sufficient.

**Non-Goals:**
- Per-user identity, audit trail, or roles — one shared credential for "the
  manager" is enough for this PoC.
- Logout UX — Basic Auth has none; rotating the password is the only way to
  revoke access.
- Protecting the backend port itself — out of scope because it is not
  publicly exposed today (BFF-proxy architecture); revisit if that changes.

## Decisions

- **Enforce in `packages/frontend/src/middleware.ts`, not per-page/per-route.**
  A single middleware with a `matcher` covering everything except the
  excluded paths is one file, runs before rendering and before the `/api`
  rewrite, and can't be bypassed by adding a new back-office page and
  forgetting to gate it — alternative (checking auth inside every page /
  route handler) doesn't have that safety-by-default property.

- **Exclude by path prefix, not by "protect an allowlist".** The matcher
  excludes `/order` and `/api/orders/by-token`, plus Next's own internals
  (`/_next/*`, static files) and `/favicon.ico`; everything else — including
  future back-office routes — is gated by default. Inverting this (an
  allowlist of protected routes) would silently leave new routes unprotected.

- **Credentials from env vars (`BACKOFFICE_AUTH_USER`,
  `BACKOFFICE_AUTH_PASSWORD`), compared with a constant-time check.** No
  database table, no hashing library — a PoC-appropriate amount of
  machinery for a single shared credential. Comparison should still avoid a
  naive `===` on the raw strings to not add a timing side-channel for free.
  Next.js middleware runs on the **Edge Runtime**, which does not support
  `node:crypto` (confirmed empirically: importing it fails the build with
  `UnhandledSchemeError`), so `crypto.timingSafeEqual` is not available here.
  The Edge-compatible equivalent — SHA-256 both the supplied and expected
  `user:password` strings via the global Web Crypto `crypto.subtle.digest`,
  then compare the two fixed-length digests byte-by-byte with a manual
  XOR-accumulating loop (no early return) — is used instead.

- **401 + `WWW-Authenticate: Basic` on missing/invalid credentials**, per the
  HTTP Basic Auth spec — this is what makes the browser show its native
  credential prompt with no custom UI required.

## Risks / Trade-offs

- **[Risk]** A shared password leaked (e.g. pasted in a WhatsApp chat) grants
  full back-office access with no way to tell who used it. → **Mitigation**:
  acceptable for the PoC's threat model (a small bakery's internal tool); the
  proposal explicitly scopes this as "very basic," and rotating the env var
  revokes access for everyone at once.
- **[Risk]** Missing a path in the exclusion list would 401 a customer link.
  → **Mitigation**: exclude by prefix (`/order`, `/api/orders/by-token`)
  rather than by exact route, and cover both with a test that opens a fresh
  `/order/:token` link with no `Authorization` header and asserts a 200.
- **[Risk]** Over-excluding (too broad a prefix) could accidentally leave a
  back-office endpoint open. → **Mitigation**: the two exclusions are narrow
  and match only the customer flow's real paths traced above; no wildcard
  broader than `/order/:path*` and `/api/orders/by-token/:path*`.
- **[Trade-off]** No HTTPS enforcement is added by this change — Basic Auth
  credentials are base64, not encrypted. Deployment must already terminate
  TLS in front of the app; this design assumes that's true and does not
  re-verify it at the application layer.
