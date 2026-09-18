import { NextResponse, type NextRequest } from 'next/server';
import {
  getCatalogProducts,
  getFeaturedCatalogProducts,
  lookupCatalogProduct,
} from '@/lib/backend/serverCatalog';
import type { CatalogResult } from '@/lib/backend/products';

/**
 * The storefront's catalog read, served from the server.
 *
 * The browser must never read the source directly. Two reasons, both of them
 * about the shop's own rules rather than about convenience:
 *
 * 1. **The niche is enforced on the server.** WooCommerce staging still carries
 *    animal-feed products, and the seam in `lib/backend/products.ts` withholds
 *    them. If a component read the source itself, those records — names,
 *    categories, descriptions — would cross the wire and only be dropped
 *    afterwards, which is not the same thing as never being sent.
 * 2. **The source is server-side.** WooCommerce REST credentials and the
 *    WordPress read target stay on the server, so the browser cannot be pointed
 *    at an unfiltered route by editing a request, and the credentials can never
 *    be shipped by accident.
 *
 * The response shape is the same `CatalogResult` / `CatalogLookup` the server
 * renders use, so a caller cannot tell (and must not be able to tell) which side
 * of the boundary the read happened on. `no-store` because the answer carries
 * price and stock: a cached catalogue is a stale shelf.
 */

export const dynamic = 'force-dynamic';

const MAX_PER_PAGE = 100;

function readNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_PER_PAGE) : undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const slug = params.get('slug');

  const headers = { 'Cache-Control': 'no-store' } as const;

  try {
    // A single product (the PDP): resolved through the same seam, so an
    // off-niche slug answers "no product" rather than an off-niche record.
    if (slug) {
      // A degraded lookup is still a 200: the in-process contract reports the
      // failure in `error` and resolves no product, and the caller must not have
      // to tell the two apart by status code. `error` is a diagnostic string, not
      // a stack — it never carries credentials.
      return NextResponse.json(await lookupCatalogProduct(slug), { headers });
    }

    if (params.get('featured') === '1') {
      const limit = readNumber(params.get('limit')) ?? 4;
      const products = await getFeaturedCatalogProducts(limit);
      return NextResponse.json({ products }, { headers });
    }

    const result: CatalogResult = await getCatalogProducts({
      perPage: readNumber(params.get('perPage')),
      page: readNumber(params.get('page')),
      search: params.get('search') || undefined,
      categorySlug: params.get('category') || undefined,
      isFeatured: params.get('featured') === 'true' ? true : undefined,
    });

    return NextResponse.json(result, { headers });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error('The catalog endpoint could not serve its read:', reason);
    return NextResponse.json({ error: reason }, { status: 502, headers });
  }
}
