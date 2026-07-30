/**
 * Signed back-office session cookie, shared by the Edge middleware that checks
 * it and the route handlers that issue and clear it.
 *
 * The cookie has to be self-verifying: the middleware runs on the Edge Runtime
 * with no database to look a session up in, so the signature *is* the
 * mechanism. A plain `logged_in=true` cookie would be forgeable from the
 * browser console in one line.
 *
 * Signing uses Web Crypto HMAC-SHA256, not `node:crypto` — the latter does not
 * build under Edge Runtime middleware at all (it fails with
 * `UnhandledSchemeError`), which was verified before settling on this.
 */

export const SESSION_COOKIE = 'pannico_session';

/**
 * Persistent on purpose: the back office runs on a TV that gets switched off,
 * and a cookie with no `Max-Age` is discarded when the browser process dies.
 * Browsers clamp persistent cookies (Chromium to 400 days), so this is the
 * practical ceiling rather than a true "never expires".
 */
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

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
