export const SITE_URL = 'https://himalayankoh.com';
export const SITE_NAME = 'Himalayan Koh';
export const DEFAULT_TITLE =
  'Himalayan Koh - Premium Himalayan Pink Salt for Livestock & Cooking';
export const DEFAULT_DESCRIPTION =
  'Premium Himalayan Pink Salt for horses, cattle, deer, and edible cooking. All natural, mineral-rich Himalayan salt products.';
/**
 * Social crawlers (Facebook, X, LinkedIn) and Google's rich results do not
 * accept SVG for og:image — this must stay a raster URL. Served as a real
 * 1200x630 PNG by src/app/og.png/route.tsx.
 */
export const DEFAULT_OG_IMAGE = '/og.png';

export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: '/logo.svg',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-832-224-6466',
    contactType: 'customer service',
    areaServed: 'US',
  },
};
