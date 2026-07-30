import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, cookieSecure } from '@/lib/session';

/**
 * Ends the session: clears the cookie and returns to the login page. A POST (not
 * a link) so it cannot be triggered by a stray GET, submitted by a plain form in
 * the sidebar so it needs no client JavaScript. 303 so the browser follows with
 * a GET instead of re-POSTing to /login.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.redirect(new URL('/login', req.nextUrl), 303);
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    // Must match how the cookie was issued: a `Secure` clear sent over plain
    // HTTP is discarded too, which would leave the session cookie in place and
    // make logout silently do nothing.
    secure: cookieSecure(),
    path: '/',
    maxAge: 0,
  });
  return res;
}
