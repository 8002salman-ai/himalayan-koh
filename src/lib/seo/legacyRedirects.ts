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
  // The store no longer sells livestock salt, so the old animal-feed service
  // pages point at the nearest shelf the shop does stock. They must not be sent
  // to a retired `?category=` value: the filter would fall back to All, and the
  // link equity would land on the full catalogue rather than on salt.
  {
    source: '/services/fresh-dairy-products',
    destination: '/products?category=edible-pink-salt',
    permanent: true,
  },
  {
    source: '/services/salt-lumps-for-cattle',
    destination: '/products?category=bulk',
    permanent: true,
  },

  // --- WooCommerce products -------------------------------------------------
  {
    source: '/product/himalayan-edible-pink-salt',
    destination: '/products/himalayan-pink-salt-16oz-jar',
    permanent: true,
  },
  // Retired livestock SKUs: the products are gone from the catalogue, so their
  // indexed URLs land on the shelves that replaced them rather than on a 404.
  {
    source: '/product/salt-licks-for-horses',
    destination: '/products?category=bulk',
    permanent: true,
  },
  {
    source: '/product/pouches',
    destination: '/products/himalayan-pink-edible-salt-fine-grain-pouch-6-lb',
    permanent: true,
  },
  {
    source: '/product/bag-of-salt-for-livestock-45-lbs',
    destination: '/products?category=bulk',
    permanent: true,
  },
  // The 18 lb rock salt bag was sold as livestock salt; the store now carries
  // rock salt as edible and bulk salt, which is where these two land.
  {
    source: '/product/rock-of-salt',
    destination: '/products?category=bulk',
    permanent: true,
  },
  {
    source: '/product/himalayan-rock-salt-bag',
    destination: '/products?category=bulk',
    permanent: true,
  },
  // "Block of salt" was the deer block. Salt blocks are now the cooking and
  // serving shelf, so that is the closest live equivalent.
  {
    source: '/product/block-of-salt',
    destination: '/products?category=cooking-serving',
    permanent: true,
  },
  // Sold in another era under the same slug; the lamp is a salt lamp today.
  // If it leaves the catalogue again, point this at the shop rather than 404.
  {
    source: '/product/himalayan-crystal-rock-salt-lamp-ionizer-air-purifier-with-dimmable-control',
    destination: '/products?category=lamps-decor',
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
