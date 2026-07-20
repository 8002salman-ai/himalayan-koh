import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/seo/server';

export default function robots(): MetadataRoute.Robots {
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
