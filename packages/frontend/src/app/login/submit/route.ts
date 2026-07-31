import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  authConfig,
  cookieSecure,
  credentialsMatch,
  issueSession,
  safeNext,
} from '@/lib/session';

/**
 * Sends the browser to a path on the origin it actually requested.
 *
 * The `Location` is deliberately relative. Building an absolute one from
 * `req.nextUrl` — the obvious `NextResponse.redirect(new URL(to, req.nextUrl))`
 * — resolves against the *server's* own origin, which under `next start` is
 * `http://localhost:3001` no matter which host the browser used. A client on
 * the LAN would then be redirected to port 3001 on its own machine right after
 * logging in successfully, and see a connection error instead of the back
 * office. A relative Location sidesteps the question: the browser resolves it
 * against the origin it asked, whether that is an IP, `ppl-poc.home`, or
 * localhost.
 *
 * 303 rather than the default 307: a 307 preserves the method, so the browser
 * would re-POST the credentials to the destination page.
 */
function redirectTo(to: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: to } });
}

/**
 * Receives the login form. Lives in a child segment because a `page.tsx` and a
 * `route.ts` cannot share an App Router segment, and outside `/api/` because
 * next.config.js rewrites that prefix to the backend.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData();
  const user = String(form.get('user') ?? '');
  const password = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? ''));

  const config = authConfig();
  // Fail closed: with the gate unconfigured, no login may succeed.
  if (config === null || !(await credentialsMatch(user, password, config))) {
    const params = new URLSearchParams({ error: '1' });
    if (next !== '/orders') params.set('next', next);
    return redirectTo(`/login?${params.toString()}`);
  }

  // `next` is already known to be a local, root-relative path (safeNext), so
  // using it as a relative Location cannot redirect off-site.
  const res = redirectTo(next);
  res.cookies.set(SESSION_COOKIE, await issueSession(config.secret), {
    httpOnly: true,
    sameSite: 'lax',
    // Lax, not Strict: following a link into the back office must still send it.
    secure: cookieSecure(),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
