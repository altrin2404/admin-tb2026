import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/session';
import { checkRateLimit, getRateLimitRule } from './lib/rateLimit';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static assets and favicon
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // 2. Rate Limiting for all API endpoints (protects database & auth against floods)
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rule = getRateLimitRule(pathname, request.method);
    const identifier = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`;
    const rateCheck = checkRateLimit(identifier, rule);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfterSeconds.toString(),
            'X-RateLimit-Limit': rateCheck.limit.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // 3. Allow public auth endpoints and homepage
  if (pathname === '/' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 4. Extract and verify session token from cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = verifySessionToken(sessionCookie);

  // 5. API route protection: return 401 JSON error
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Valid administrative portal session required.',
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 6. Protected web pages: redirect unauthenticated users to gateway
  if (!isAuthenticated) {
    const gatewayUrl = new URL('/', request.url);
    gatewayUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(gatewayUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all protected page routes and protected api endpoints
     */
    '/registrations/:path*',
    '/master/:path*',
    '/scanner/:path*',
    '/events/:path*',
    '/spot-register/:path*',
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
