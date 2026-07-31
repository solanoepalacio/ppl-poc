## 1. Session cookie helper

- [x] 1.1 Create `packages/frontend/src/lib/session.ts` (importable by both the
  Edge middleware and the route handlers): sign and verify the session cookie
  value with HMAC-SHA256 via Web Crypto (`crypto.subtle.importKey` + `sign`),
  keyed by `BACKOFFICE_SESSION_SECRET`. `node:crypto` does not build under the
  Edge Runtime, so Web Crypto is the only option here — verified with a probe
  before writing this.
- [x] 1.2 Verification compares signatures byte-by-byte without an early return,
  and returns false whenever the secret is missing/blank or the cookie value is
  malformed.
- [x] 1.3 Export the cookie name and the attributes used when issuing it:
  `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` only outside development, and a
  long `Max-Age` so the cookie is persistent (a cookie without `Max-Age` dies
  with the browser process — the opposite of what a TV needs).

## 2. Gate the back office in middleware

- [x] 2.1 Rewrite `middleware.ts` to verify the session cookie instead of an
  `Authorization` header.
- [x] 2.2 Unauthenticated **page** requests redirect to `/login?next=<path>`;
  unauthenticated **`/api/*`** requests get a bare 401 instead, so a `fetch` is
  never handed the login page's HTML to parse as JSON.
- [x] 2.3 Update `config.matcher` to exclude `/login` (page **and** its submit
  handler) alongside the existing `/order/:path*` and
  `/api/orders/by-token/:path*` exclusions, plus Next internals. Missing the
  `/login` exclusion locks the back office out permanently.
- [x] 2.4 Fail closed: if the credential or the signing secret is missing or
  blank, reject every gated request and let no login succeed.

## 3. Login page and handlers

- [x] 3.1 `app/login/page.tsx`: a branded page with a plain
  `<form method="post" action="/login/submit">` carrying username, password and
  the `next` value — no client-side JavaScript in the critical path, since the
  target is a TV browser. Show a text error when the URL reports a failed
  attempt.
- [x] 3.2 `app/login/submit/route.ts`: compare the submitted credentials against
  the env vars using the fixed-length constant-time comparison; on success set
  the signed cookie and redirect with **303** (not the default 307, which would
  re-POST the credentials to the destination); on failure redirect back to
  `/login` with an error flag and set no cookie.
- [x] 3.3 Accept the `next` destination only when it is a root-relative local
  path; otherwise fall back to `/orders`, so the login page cannot be turned into
  an open redirect.
- [x] 3.4 `app/logout/route.ts`: clear the session cookie and redirect (303) to
  `/login`. Keep both handlers outside the `/api/` prefix, which
  `next.config.js` rewrites to the backend.

## 4. Sidebar control and styling

- [x] 4.1 `Sidebar.tsx`: add a **Cerrar sesión** control at the bottom of the
  nav, as a `<form method="post" action="/logout">` so it works without client
  JavaScript, styled to match the existing `.bo-nav-link` entries and collapsing
  with them.
- [x] 4.2 `globals.css`: style the login page (centred card on the brand
  background, 16px inputs so iOS does not zoom, 44px minimum touch targets) and
  the sidebar's logout entry.

## 5. Configuration

- [x] 5.1 Add `BACKOFFICE_SESSION_SECRET` to `packages/frontend/.env.example`
  next to the existing credential vars, with a note that rotating it
  invalidates every active session.
- [x] 5.2 Set a local development value in `packages/frontend/.env`.

## 6. Verification

- [x] 6.1 Frontend typecheck.
- [x] 6.2 Drive it — the lockout check first: with no cookie, `/login` must
  serve a 200 (not redirect to itself), and a back-office page must redirect to
  `/login`.
- [x] 6.3 Drive it: submit wrong credentials and confirm no cookie is set and an
  error is shown; submit the right ones and confirm the cookie is set with
  `HttpOnly` and a `Max-Age`, and that the back office loads.
- [x] 6.4 Drive it: with a valid session, confirm a gated API path returns data;
  with none, confirm it returns 401 with no HTML body.
- [x] 6.5 Drive it: forge a cookie (alter one character of a valid one, and
  invent one from scratch) and confirm both are refused.
- [x] 6.6 Drive it: log in, then reopen the browser with the cookie jar
  preserved (a new browser context seeded with the stored cookie, which is what
  a power cycle amounts to) and confirm the back office is still reachable
  without logging in.
- [x] 6.7 Drive it: log in, activate **Cerrar sesión**, and confirm the cookie
  is gone, the login page is shown, and a back-office page redirects to login
  again.
- [x] 6.8 Drive it: confirm `?next=` returns the visitor to the page they asked
  for, and that an absolute external URL in `next` is ignored in favour of
  `/orders`.
- [x] 6.9 Drive it: with a fresh order link and no cookie at all, confirm the
  customer page loads, the order confirms, and the customer is never redirected
  to `/login`.
- [x] 6.10 Drive it: blank the signing secret and confirm every gated route is
  refused and login cannot succeed, while the customer link still works.
- [x] 6.11 `openspec validate add-backoffice-login --strict`, then dry-run the
  archive against a throwaway copy of `openspec/`.
