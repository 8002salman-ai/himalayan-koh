import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Wholesale/B2B (dealer portal, purchase requests, proforma invoices) is
 * temporarily disabled site-wide via NEXT_PUBLIC_WHOLESALE_ENABLED — see
 * src/lib/env.ts for the full explanation and how to restore it.
 *
 * While disabled, this middleware is the single enforcement point that
 * blocks direct/URL access to the customer-facing wholesale surface, so a
 * hidden nav link isn't the only thing standing between a visitor and the
 * feature. Nothing here deletes routes, code, or data — it only redirects
 * at the edge. Admin (/admin/dealers/**, /api/admin/wholesale/**,
 * /api/admin/dealer/**) is deliberately NOT gated here — admins still need
 * internal access to review/manage existing wholesale data while the
 * feature is hidden from the public.
 */
export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_WHOLESALE_ENABLED === 'true') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/wholesale')) {
    return NextResponse.json(
      { error: 'Wholesale is temporarily unavailable.' },
      { status: 404 }
    );
  }

  if (pathname === '/dealer' || pathname.startsWith('/dealer/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dealer', '/dealer/:path*', '/api/wholesale/:path*'],
};
