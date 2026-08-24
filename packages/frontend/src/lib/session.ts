/**
 * Signed back-office session cookie, shared by the proxy that checks it and the
 * route handlers that issue and clear it.
 *
 * The cookie has to be self-verifying: the check runs on every request with no
 * database to look a session up in, so the signature *is* the mechanism. A
 * plain `logged_in=true` cookie would be forgeable from the browser console in
 * one line.
 *
 * Signing uses Web Crypto HMAC-SHA256 rather than `node:crypto`. That started
 * as a hard constraint — under Next 14 this ran as Edge middleware, where
 * `node:crypto` does not build at all (`UnhandledSchemeError`). Next 16 renamed
 * the convention to `proxy` and put it on Node, so the constraint is gone, but
 * Web Crypto is kept: it is available in both runtimes and in the route
 * handlers, which leaves this module free of any runtime assumption.
 */

export const SESSION_COOKIE = 'pannico_session';

/**
 * Persistent on purpose: the back office runs on a TV that gets switched off,
 * and a cookie with no `Max-Age` is discarded when the browser process dies.
 * Browsers clamp persistent cookies (Chromium to 400 days), so this is the
 * practical ceiling rather than a true "never expires".
 */
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * Whether the session cookie is marked `Secure`.
 *
 * Defaults to on, so a deployment that terminates TLS is protected without
 * having to configure anything. Set `COOKIE_SECURE=false` when the app is
 * served over plain HTTP on a real hostname: browsers discard a `Secure`
 * cookie that arrives over a non-secure origin, so login would appear to
 * succeed and then bounce straight back to /login forever — the cookie is
 * dropped, the proxy sees no session, and redirects again.
 *
 * This is keyed off its own variable rather than `NODE_ENV` because the two
 * questions are unrelated: `next start` always runs in production mode, but
 * whether there is TLS in front of it is a property of the deployment. The
 * homelab install (`ppl-poc.home`, plain HTTP, no reverse proxy) is production
 * and has no TLS, which the `NODE_ENV` check had no way to express.
 *
 * `localhost` needs no opt-out — browsers treat it as a trustworthy origin and
 * accept `Secure` cookies over HTTP there, so local development works either way.
 */
export function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE !== 'false';
}

function encoder(): TextEncoder {
  return new TextEncoder();
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compares two strings without an early return, so a mismatch leaks no timing. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder().encode(payload)));
}

/** The gate's configuration, or `null` when any part of it is missing. */
export function authConfig(): {
  user: string;
  password: string;
  secret: string;
} | null {
  const user = process.env.BACKOFFICE_AUTH_USER ?? '';
  const password = process.env.BACKOFFICE_AUTH_PASSWORD ?? '';
  const secret = process.env.BACKOFFICE_SESSION_SECRET ?? '';
  // Fail closed: with any piece blank, comparing against empty strings would
  // leave the back office open behind empty credentials.
  if (user === '' || password === '' || secret === '') return null;
  return { user, password, secret };
}

/**
 * Issues a cookie value: the issue time plus its signature. Carrying the issue
 * time (rather than signing a constant) means each login produces a distinct
 * cookie and leaves room to add an expiry later without changing the format.
 */
export async function issueSession(secret: string): Promise<string> {
  const payload = String(Date.now());
  return `${payload}.${await sign(payload, secret)}`;
}

/** True only for a cookie value this app signed with the current secret. */
export async function verifySession(
  value: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!value) return false;
  const sep = value.lastIndexOf('.');
  if (sep <= 0) return false;
  const payload = value.slice(0, sep);
  const signature = value.slice(sep + 1);
  // No expiry is checked on purpose: the session is meant to outlive browser
  // restarts (see SESSION_MAX_AGE_SECONDS).
  return constantTimeEqual(signature, await sign(payload, secret));
}

/** True when the submitted credentials match the configured ones. */
export async function credentialsMatch(
  suppliedUser: string,
  suppliedPassword: string,
  config: { user: string; password: string; secret: string },
): Promise<boolean> {
  // Hash both sides first so the comparison runs over fixed-length values and
  // reveals nothing about the expected length.
  const [supplied, expected] = await Promise.all([
    sign(`${suppliedUser}:${suppliedPassword}`, config.secret),
    sign(`${config.user}:${config.password}`, config.secret),
  ]);
  return constantTimeEqual(supplied, expected);
}

/**
 * Accepts a post-login destination only when it is a local, root-relative path.
 * Without this the `next` parameter would turn the login page into an open
 * redirect to any external site.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/orders';
  return next;
}
