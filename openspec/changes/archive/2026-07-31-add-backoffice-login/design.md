## Context

The back office (`(backoffice)` route group: orders, bloques, production
totals) and the customer order form (`/order/[token]`) are both served by the
same Next.js app on the same origin, with `/api/:path*` rewritten to the
backend (`next.config.js`). The backend is never reached by the browser
directly, so a gate at the Next.js edge covers both the pages and their data.

Tracing how the customer flow actually talks to the backend matters for scoping
the gate correctly:
- `/order/[token]/page.tsx` is a **Server Component**; its `validateToken` call
  goes straight to `BACKEND_INTERNAL_URL` server-to-server (see `lib/api.ts`),
  never through the browser and therefore never through middleware.
- The client-side `OrderForm` (confirming an order) *does* run in the browser
  and calls the relative `/api/orders/by-token/:token/...` endpoints, which the
  middleware sits in front of.

So the gate has two customer-flow paths to exclude, not one: the page route and
the by-token API calls its client components make.

The primary client is a **TV browser**, which drives three constraints that a
desktop-only design would miss: the credential prompt has to be in-page HTML,
the flow should not depend on client-side JavaScript (a plain form POST is the
most compatible thing there is), and the session has to outlive the browser
process because the TV gets switched off.

## Goals / Non-Goals

**Goals:**
- Nothing in the back office is viewable or actionable without a session.
- Logging in works with a plain HTML form and no client-side JavaScript.
- The session survives the TV being powered off and on.
- The manager can end the session deliberately from the sidebar.
- `/order/:token` and its API calls stay completely open, unchanged.

**Non-Goals:**
- Per-user identity, roles, or an audit trail — one shared credential for "the
  bakery" is enough here.
- Password reset, account management, or a user table.
- Rate limiting or lockout on repeated failed logins. Worth revisiting if the
  app is ever exposed to the open internet; out of scope for a PoC on a local
  network.
- Protecting the backend port itself — it is not publicly exposed today (BFF
  proxy); revisit if that changes.

## Decisions

- **A signed cookie, not a server-side session store.** The middleware runs on
  the Edge Runtime with no database access, and the app has no session table.
  Signing the cookie makes it self-verifying: the middleware can trust it
  without looking anything up. A plain `logged_in=true` cookie would be forgeable
  from the browser console in one line, which is why the signature is the whole
  mechanism and not a detail.

- **HMAC-SHA256 via Web Crypto (`crypto.subtle.importKey` + `sign`), keyed by a
  new `BACKOFFICE_SESSION_SECRET`.** Verified empirically in this runtime before
  committing to it — `node:crypto` does **not** build under Edge Runtime
  middleware (it fails with `UnhandledSchemeError`), so the Node HMAC API is not
  available here. A probe confirmed Web Crypto HMAC works in middleware, is
  deterministic for the same input, and changes with the secret.

- **The signature carries no expiry, and the cookie is set with a long
  `Max-Age`.** This is what "stays logged in across power cycles" requires: a
  cookie with no `Max-Age` is a *session* cookie and is discarded when the
  browser closes — the exact opposite of the goal. Note an honest limit: browsers
  cap persistent cookie lifetime (Chromium clamps to 400 days), so "never asks
  again" is really "does not ask for as long as the browser keeps the cookie".
  There is no cookie mechanism that outlives that cap; a re-login roughly once a
  year is the floor for this approach.

- **Cookie flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` unless
  explicitly disabled.** `HttpOnly` keeps it out of reach of scripts; `Lax` (not
  `Strict`) is required so that following a link into the back office still sends
  the cookie.

  `Secure` is keyed off its own `COOKIE_SECURE` variable (default on; set to
  `"false"` to disable) rather than `NODE_ENV`. The first cut used
  `NODE_ENV === 'production'`, assuming production implies TLS — but the two are
  unrelated: `next start` always runs in production mode, while whether TLS sits
  in front of it is a property of the deployment. The homelab install is
  production *and* plain HTTP (`http://ppl-poc.home:3001`, no reverse proxy),
  which that check had no way to express. Since browsers discard a `Secure`
  cookie arriving over a non-secure origin, it would have made login impossible
  there — cookie dropped, middleware sees no session, every attempt redirects
  back to `/login`. `localhost` is exempt from that browser rule (treated as a
  trustworthy origin), which is why local development never surfaced it. Logout
  applies the same flag: a `Secure` clear sent over plain HTTP is discarded too,
  silently leaving the session in place.

- **A plain `<form method="post">` to a route handler, not a client-side fetch
  or a Server Action.** No JavaScript is involved in the critical path, which is
  the safest assumption for a TV browser. The page lives at `app/login/page.tsx`
  and the handler at `app/login/submit/route.ts` — a `page.tsx` and a `route.ts`
  cannot coexist in the same App Router segment, hence the child segment.

- **Not under `/api/`.** `next.config.js` rewrites `/api/:path*` to the backend,
  so a frontend route handler placed there would be proxied away and 404. The
  login and logout handlers deliberately sit outside that prefix.

- **Redirect after a successful POST with status 303, not the default 307.**
  `NextResponse.redirect` defaults to 307, which preserves the method — the
  browser would re-POST the credentials to `/orders`. 303 tells it to follow
  with a GET.

- **Unauthenticated pages redirect; unauthenticated `/api/*` returns 401.** The
  gate covers both, and they need different answers: a `fetch` that receives a
  redirect to an HTML login page would try to parse markup as JSON and fail
  confusingly. Distinguishing them in the middleware is what keeps client error
  handling honest.

- **The login page and its submit handler are excluded from the gate**, as is
  the customer flow. Without that exclusion the gate would redirect `/login` to
  `/login` forever and lock everyone out permanently — the classic failure mode
  of this design, and the thing to verify first.

- **Preserve the originally requested path in `?next=`, and validate it.** A
  bare redirect to `/orders` would lose the manager's destination. But the
  parameter is attacker-controllable, so it MUST be accepted only when it is a
  local, root-relative path — otherwise the login page becomes an open redirect
  to any external site.

- **Fail closed when configuration is missing.** If the credential or the
  signing secret is absent or blank, every gated request is rejected and no
  login can succeed. A deployment that forgets to set them must deny access, not
  fall back to comparing against empty strings — which would leave the back
  office open behind an empty username and password.

## Risks / Trade-offs

- **[Risk]** A never-expiring session on a TV in a shared space means anyone
  with physical access to that TV reaches the back office. → **Mitigation**:
  accepted deliberately — it is the explicit goal, and the sidebar's **Cerrar
  sesión** plus rotating the secret (which invalidates every existing cookie at
  once) are the levers if that changes.
- **[Risk]** Missing one path in the exclusion list either locks the back office
  out permanently (`/login` gated) or breaks a customer link (`/order/:token`
  gated). → **Mitigation**: exclude by prefix rather than exact route, and verify
  both by driving the real thing — a fresh order link with no cookie, and a
  logged-out visit to `/login` — rather than by reading the matcher.
- **[Risk]** A shared password leaked (e.g. pasted in a chat) grants full
  back-office access with no way to tell who used it. → **Mitigation**:
  acceptable for this threat model (a small bakery's internal tool); rotating
  the env var revokes access for everyone at once.
- **[Trade-off]** No HTTPS enforcement is added by this change. The credential
  travels in a form POST body and the cookie on every request, so a deployment
  should terminate TLS in front of the app. This design does not re-check that
  at the application layer — and, importantly, does not *assume* it either: the
  homelab deployment runs plain HTTP today and opts out via `COOKIE_SECURE=false`.
  That is a real exposure (credential and session cookie readable by anyone on
  the LAN), accepted for now because the install is LAN-only on a small trusted
  network. Putting TLS in front and dropping the opt-out is the follow-up.
