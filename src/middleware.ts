import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Wholesale/B2B (dealer portal, purchase requests, proforma invoices) is
 * temporarily disabled site-wide via NEXT_PUBLIC_WHOLESALE_ENABLED — see
 * src/lib/env.ts for the full explanation and how to restore it.
 *
 * While disabled, this middleware is the single enforcement point that
 * blocks every customer and admin wholesale surface, so a hidden nav link
 * isn't the only thing standing between a visitor and the feature. Nothing
 * here deletes routes, code, or data — it only disables access at the edge,
 * keeping historical records available for future reactivation if needed.
 */
export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_WHOLESALE_ENABLED === 'true') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/wholesale') ||
    pathname.startsWith('/api/admin/wholesale') ||
    pathname.startsWith('/api/admin/dealer')
  ) {
    return NextResponse.json(
      { error: 'Wholesale is disabled.' },
      { status: 404 }
    );
  }

  if (pathname === '/dealer' || pathname.startsWith('/dealer/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname === '/admin/dealers' || pathname.startsWith('/admin/dealers/')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dealer',
    '/dealer/:path*',
    '/admin/dealers',
    '/admin/dealers/:path*',
    '/api/wholesale/:path*',
    '/api/admin/wholesale/:path*',
    '/api/admin/dealer/:path*',
  ],
};
