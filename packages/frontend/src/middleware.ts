import { NextResponse, type NextRequest } from 'next/server';

const REALM = 'Pannico';

/**
 * SHA-256 of the input, as raw bytes. Used to compare credentials at a fixed
 * length regardless of the supplied string's length, so the byte-by-byte
 * comparison below leaks no timing information about where a mismatch starts.
 */
async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

/** Constant-time comparison: always inspects every byte, never returns early. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse('Autenticación requerida.', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` },
  });
}

async function isAuthorized(header: string | null): Promise<boolean> {
  const expectedUser = process.env.BACKOFFICE_AUTH_USER ?? '';
  const expectedPassword = process.env.BACKOFFICE_AUTH_PASSWORD ?? '';
  // Fail closed: with either value missing the expected credential would be
  // ":" — i.e. an empty user and password would unlock the back office. A
  // deployment that forgets to configure these must deny everything instead.
  if (expectedUser === '' || expectedPassword === '') return false;
  if (!header?.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice('Basic '.length));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep === -1) return false;

  const [supplied, expected] = await Promise.all([
    sha256(decoded),
    sha256(`${expectedUser}:${expectedPassword}`),
  ]);
  return constantTimeEqual(supplied, expected);
}

export async function middleware(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!(await isAuthorized(header))) {
    return unauthorized();
  }
  return NextResponse.next();
}

// Gate everything by default; only the customer order-token flow (page +
// its by-token API calls) and Next's own internals are excluded. New
// back-office routes are protected automatically without needing to be
// added to an allowlist.
export const config = {
  matcher: [
    '/((?!order/|api/orders/by-token/|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
