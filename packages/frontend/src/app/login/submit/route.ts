import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  authConfig,
  credentialsMatch,
  issueSession,
  safeNext,
} from '@/lib/session';

/**
 * Receives the login form. Lives in a child segment because a `page.tsx` and a
 * `route.ts` cannot share an App Router segment, and outside `/api/` because
 * next.config.js rewrites that prefix to the backend.
 *
 * Redirects use 303 rather than the default 307: a 307 preserves the method, so
 * the browser would re-POST the credentials to the destination page.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData();
  const user = String(form.get('user') ?? '');
  const password = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? ''));

  const config = authConfig();
  // Fail closed: with the gate unconfigured, no login may succeed.
  if (config === null || !(await credentialsMatch(user, password, config))) {
    const back = new URL('/login', req.nextUrl);
    back.searchParams.set('error', '1');
    if (next !== '/orders') back.searchParams.set('next', next);
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(new URL(next, req.nextUrl), 303);
  res.cookies.set(SESSION_COOKIE, await issueSession(config.secret), {
    httpOnly: true,
    sameSite: 'lax',
    // Lax, not Strict: following a link into the back office must still send it.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
