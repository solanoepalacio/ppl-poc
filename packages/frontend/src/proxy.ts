import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authConfig, verifySession } from '@/lib/session';

/**
 * Gates the back office behind the session cookie issued by /login.
 *
 * A page request without a session is redirected to the login page (carrying
 * where it was headed); an `/api/*` request gets a bare 401 instead, because a
 * `fetch` handed a redirect would follow it and try to parse the login page's
 * HTML as JSON.
 *
 * Everything is gated by default so a new back-office route cannot be added
 * unprotected by accident. Only the customer order-token flow, the login page
 * itself, and Next's internals are excluded — leaving `/login` gated would
 * redirect it to itself and lock everyone out permanently.
 *
 * Called `proxy` rather than `middleware` since Next 16, which renamed the
 * convention and dropped the Edge runtime for it: this runs on Node, and that
 * is not configurable.
 */
export async function proxy(req: NextRequest) {
  const config = authConfig();
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const authorized =
    config !== null && (await verifySession(cookie, config.secret));
  if (authorized) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse('Sesión requerida.', { status: 401 });
  }

  const login = new URL('/login', req.nextUrl);
  login.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

/**
 * `pannico-wordmark.png` is excluded alongside the `_next` internals, and it is
 * not redundant with them: `_next/image` exempts the optimizer *route*, but the
 * optimizer then fetches the source file back through this same server. Gate the
 * source and the optimizer gets a redirect to the login page instead of an image
 * and answers 400 — so the customer order page, which needs no session at all,
 * renders with a broken logo.
 */
export const config = {
  matcher: [
    '/((?!login|order/|api/orders/by-token/|_next/static|_next/image|pannico-wordmark\\.png|favicon\\.ico).*)',
  ],
};
