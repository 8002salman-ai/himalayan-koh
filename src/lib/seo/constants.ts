/**
 * Dynamic site URL based on environment. `VERCEL_URL` is deliberately never
 * used here — Vercel sets it to the unique per-deployment hostname (e.g.
 * `himalayan-<hash>-<team>.vercel.app`), not the stable production alias, so
 * reading it leaked a dead preview URL into Product/FAQ/WebPage JSON-LD.
 * `VERCEL_PROJECT_PRODUCTION_URL` is the one that always points at the
 * current production alias/custom domain.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NODE_ENV === 'production'
    ? 'https://himalayankoh.com'
    : 'http://localhost:3000');
export const SITE_NAME = 'Himalayan Koh';
export const DEFAULT_TITLE =
  'Himalayan Koh — Pure Himalayan Pink Salt for Cooking & Home';
export const DEFAULT_DESCRIPTION =
  'All-natural Himalayan pink salt: fine and coarse edible grades, cooking and serving blocks, lamps and décor, and bulk salt by the bag. Mineral-rich, unrefined, and sourced from the Himalayan range.';
/**
 * Social crawlers (Facebook, X, LinkedIn) and Google's rich results do not
 * accept SVG for og:image — this must stay a raster URL. Served as a real
 * 1200x630 PNG by src/app/og.png/route.tsx.
 */
export const DEFAULT_OG_IMAGE = '/og.png';

/**
 * Google Search Console site-verification token, when the owner has run the
 * verification step.
 *
 * Empty by default and never invented: the token is issued per property in Search
 * Console, so the only correct source is the owner pasting it into the
 * environment. While it is empty no `google-site-verification` tag is emitted at
 * all, rather than an empty one that would fail verification confusingly.
 *
 * Server-side on purpose (not `NEXT_PUBLIC_*`): the tag is public once rendered,
 * but nothing in the browser needs to read the variable, and keeping it off the
 * client avoids carrying it in every bundle.
 *
 * This does **not** make staging indexable. Indexing is decided per request by
 * `lib/seo/indexing.ts` — an allowlist of production hosts — and every host that
 * is not `himalayankoh.com` stays `noindex, nofollow` whether or not this token is
 * set. Verifying a staging property in Search Console is therefore pointless by
 * design; verify the production property.
 */
export const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() || '';

/**
 * The SEO configuration surface the later SEO phase reads, gathered so a new
 * origin, token or sitemap path is added in one place rather than found by
 * grepping for string literals.
 */
export const SEO_CONFIG = {
  siteUrl: SITE_URL,
  canonicalOrigin: SITE_URL,
  siteName: SITE_NAME,
  sitemapPath: '/sitemap.xml',
  robotsPath: '/robots.txt',
  googleSiteVerification: GOOGLE_SITE_VERIFICATION,
} as const;

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
