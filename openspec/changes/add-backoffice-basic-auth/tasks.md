## 1. Middleware

- [x] 1.1 Create `packages/frontend/src/middleware.ts`: read the `Authorization`
  header, decode the `Basic` base64 payload, and compare the username/password
  against `BACKOFFICE_AUTH_USER` / `BACKOFFICE_AUTH_PASSWORD` at a fixed length
  (SHA-256 digest via Web Crypto, then a manual XOR-accumulating comparison —
  `node:crypto`'s `timingSafeEqual` does not build under the Edge Runtime
  middleware uses) rather than a plain `===`.
- [x] 1.2 On a missing or invalid header, return HTTP 401 with a
  `WWW-Authenticate: Basic realm="Pannico"` header and no body content beyond a
  short message. On a match, let the request continue (`NextResponse.next()`).
- [x] 1.3 Set the middleware's `config.matcher` to exclude `/order/:path*`,
  `/api/orders/by-token/:path*`, Next's own internals
  (`_next/static`, `_next/image`), and `favicon.ico` — every other path is
  gated by default, including any back-office route added later.

## 2. Configuration

- [x] 2.1 Add `BACKOFFICE_AUTH_USER` and `BACKOFFICE_AUTH_PASSWORD` to
  `packages/frontend/.env.example` with a one-line comment explaining they
  gate the back office via HTTP Basic Auth.
- [x] 2.2 Set local dev values for both in `packages/frontend/.env`.

## 3. Verification

- [x] 3.1 Typecheck the frontend (`yarn workspace @pannico/frontend run lint`).
- [x] 3.2 Drive it: open a back-office route with no credentials and confirm
  the browser shows its native Basic Auth prompt and a 401 is returned first;
  enter the wrong password and confirm it's rejected again; enter the correct
  credentials and confirm the back-office view loads. (Verified the HTTP
  contract directly: no header → 401 + `WWW-Authenticate: Basic`; wrong
  password → 401; correct credentials → 200.)
- [x] 3.3 Drive it: generate a fresh order link, open it in a private/incognito
  window with no stored credentials, and confirm the form loads, the order can
  be confirmed, and the WhatsApp fallback works — all with no credential
  prompt at any point. (Verified with no `Authorization` header at all: opening
  `/order/:token` → 200, confirming an order → 200, and the WhatsApp fallback
  on a second token → 200.)
- [x] 3.4 `openspec validate add-backoffice-basic-auth --strict`
