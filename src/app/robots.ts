import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { isPreviewHost } from '@/lib/seo/previewHost';
import { siteOrigin } from '@/lib/seo/server';

/**
 * Request-aware so the preview subdomain — which is served by this same build
 * — refuses crawling entirely while production keeps its normal rules. Reading
 * the host makes this one tiny route dynamic; the alternative (branching in
 * `generateMetadata`, which is where every public page's robots metadata is
 * built) would make all 38 prerendered routes dynamic instead. See
 * `@/lib/seo/previewHost` for the rest of the guard (`X-Robots-Tag`).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host');
  if (isPreviewHost(host)) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/orders', '/wishlist', '/checkout', '/api/'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
