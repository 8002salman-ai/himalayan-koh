/**
 * Redirect map from the legacy WordPress/WooCommerce site to this app.
 *
 * himalayankoh.com currently runs WordPress, and none of its ranking URLs
 * exist here — every one of them would 404 the moment this app takes over the
 * domain, dropping the rankings and backlinks they have accumulated. Each
 * entry below points a live, indexed legacy URL at its closest equivalent so
 * that link equity transfers instead of evaporating.
 *
 * Ordering matters: Next.js applies the first matching rule, so specific
 * product/page mappings must stay above the catch-all patterns at the end.
 *
 * When adding to this list, take the source URLs from Google Search Console
 * (Pages → Indexed) rather than guessing — anything indexed and omitted here
 * falls through to a catch-all and loses its specific ranking.
 */
export interface LegacyRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  // --- Core pages -----------------------------------------------------------
  { source: '/shop', destination: '/products', permanent: true },
  { source: '/about-us', destination: '/about', permanent: true },
  { source: '/contacts', destination: '/contact', permanent: true },

  // No equivalent page exists yet; contact is the closest intent match. Revisit
  // if dedicated sample-request / stockist pages get built.
  { source: '/free-samples', destination: '/contact', permanent: true },
  { source: '/product-locator', destination: '/contact', permanent: true },

  // --- Blog articles --------------------------------------------------------
  {
    source: '/himalayan-pink-vs-white-salt',
    destination: '/blog/himalayan-pink-vs-white-salt-farmers',
    permanent: true,
  },

  // --- Legacy "services" pages (category-level intent) ----------------------
  {
    source: '/services/fresh-dairy-products',
    destination: '/products?category=salt-blocks-deer',
    permanent: true,
  },
  {
    source: '/services/salt-lumps-for-cattle',
    destination: '/products?category=salt-cattle',
    permanent: true,
  },

  // --- WooCommerce products -------------------------------------------------
  {
    source: '/product/himalayan-edible-pink-salt',
    destination: '/products/himalayan-pink-salt-16oz-jar',
    permanent: true,
  },
  {
    source: '/product/salt-licks-for-horses',
    destination: '/products/himalayan-salt-licks-horses',
    permanent: true,
  },
  {
    source: '/product/pouches',
    destination: '/products/himalayan-rock-salt-6lbs-pouch',
    permanent: true,
  },
  {
    source: '/product/bag-of-salt-for-livestock-45-lbs',
    destination: '/products/himalayan-livestock-salt-45lbs',
    permanent: true,
  },
  // Both legacy URLs describe the same 18 lb cattle rock salt bag.
  {
    source: '/product/rock-of-salt',
    destination: '/products/himalayan-salt-cattle-18lbs',
    permanent: true,
  },
  {
    source: '/product/himalayan-rock-salt-bag',
    destination: '/products/himalayan-salt-cattle-18lbs',
    permanent: true,
  },
  // Deer blocks are a category here, not a single SKU.
  {
    source: '/product/block-of-salt',
    destination: '/products?category=salt-blocks-deer',
    permanent: true,
  },
  // Salt lamps are not part of the current catalogue — send to the shop rather
  // than 404. Point this at a product page if lamps are reintroduced.
  {
    source: '/product/himalayan-crystal-rock-salt-lamp-ionizer-air-purifier-with-dimmable-control',
    destination: '/products',
    permanent: true,
  },

  // --- Catch-alls (must stay last) ------------------------------------------
  // Any WooCommerce URL not mapped above still lands somewhere relevant
  // instead of returning 404 and shedding the link.
  { source: '/product/:slug', destination: '/products', permanent: true },
  { source: '/product-category/:slug*', destination: '/products', permanent: true },
  { source: '/shop/:slug*', destination: '/products', permanent: true },
  { source: '/services/:slug*', destination: '/products', permanent: true },
  // WordPress feed endpoints — no equivalent, point at the content they mirrored.
  { source: '/feed', destination: '/blog', permanent: true },
  { source: '/blog/feed', destination: '/blog', permanent: true },
];
