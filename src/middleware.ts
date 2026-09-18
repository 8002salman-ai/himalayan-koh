import { NextResponse, type NextRequest } from 'next/server';
import { NICHE_SECTIONS } from '@/lib/catalog/nicheSections';

/**
 * `?category=` normalisation for the shop, decided before the page renders.
 *
 * `/products?category=<shelf>` is how a shelf hub is addressed, and a value that
 * is not a live shelf — a retired one, a typo, an invented one — must not render a
 * page at all. Two reasons, and the second is the one that put this here:
 *
 * 1. **It is a duplicate URL.** Every unknown value rendered the same catalogue
 *    under a different query string, with a canonical pointing at itself.
 * 2. **The rendered page echoes the value.** Next serialises the request path into
 *    the response, so the storefront's own old shelf names — the livestock hubs its
 *    navigation used to link, `?category=salt-lick-horses` among them — came back
 *    out in the HTML of a pink salt shop, twice each. Answering with a redirect
 *    means nothing renders for that URL in the first place.
 *
 * The redirect also can't be replaced by a check inside the page: the root
 * `app/loading.tsx` skeleton flushes the response shell before a page or
 * `generateMetadata` can call `redirect()`, so the best a page-level check manages
 * is a meta-refresh inside a 200 (verified — that is what it produced). Middleware
 * runs first and can answer with a real 308.
 *
 * Scoped to `/products` exactly: the shop's catalogue only. Admin, account,
 * checkout and API routes are untouched.
 */

const VALID_SHELF_KEYS = new Set<string>(NICHE_SECTIONS.map((section) => section.key));
const CATEGORY_PARAM = 'category';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname !== '/products') return NextResponse.next();

  const raw = searchParams.get(CATEGORY_PARAM);
  if (!raw) return NextResponse.next();

  const normalized = raw.trim().toLowerCase();

  // An invalid shelf goes to the plain catalogue: the shelf no longer exists, and
  // the catalogue is where a shopper who followed an old link should land.
  if (!VALID_SHELF_KEYS.has(normalized)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(CATEGORY_PARAM);
    return NextResponse.redirect(url, 308);
  }

  // A live shelf addressed with different casing or padding is the same shelf;
  // redirect so the URL a crawler keeps is the exact one the hub declares.
  if (normalized !== raw) {
    const url = request.nextUrl.clone();
    url.searchParams.set(CATEGORY_PARAM, normalized);
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/products',
};
