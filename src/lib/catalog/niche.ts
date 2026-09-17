/**
 * The storefront's niche scope: Himalayan pink salt, and nothing else.
 *
 * Himalayan Koh sells pink salt — edible grades, cooking and serving pieces,
 * lamps and décor, bath products and bulk salt. It does **not** sell livestock
 * or pet products. The staging WooCommerce catalog predates that decision and
 * still carries three animal-feed items (see
 * `docs/HIMALAYAN-PINK-SALT-NICHE-AUDIT.md`), and the WordPress categories still
 * include `animal feed`.
 *
 * WooCommerce stays the owner of the catalog: the owner archives those products
 * and categories there. This module is the *storefront* guard that holds in the
 * meantime, applied at the public catalog seam (`lib/backend/products.ts`) so
 * that homepage, search, related products, category pages, sitemap and schema all
 * inherit one judgement instead of each filtering for itself.
 *
 * Two deliberate properties:
 *
 * 1. **It is a named list, not a classifier.** A product leaves this guard by
 *    being renamed, recategorised or archived — a human action with a human
 *    reason — not by scoring well.
 * 2. **It does not hide anything from the admin.** The console keeps reading the
 *    unfiltered catalog, because the owner has to *see* an off-niche product in
 *    order to archive it. Filtering it out there would make the product
 *    invisible to the only person who can fix it.
 */

/** Words that put a product outside the Himalayan pink salt niche. */
export const OFF_NICHE_TERMS: readonly string[] = [
  // Livestock
  'animal',
  'animals',
  'cattle',
  'bovine',
  'bull',
  'calf',
  'cow',
  'cows',
  'deer',
  'elk',
  'moose',
  'equine',
  'feed',
  'feedlot',
  'goat',
  'goats',
  'horse',
  'horses',
  'lamb',
  'lick',
  'licks',
  'livestock',
  'pony',
  'poultry',
  'ranch',
  'sheep',
  'wildlife',
  // Pets
  'cat',
  'cats',
  'chicken',
  'chickens',
  'dog',
  'dogs',
  'guinea',
  'hamster',
  'kitten',
  'pet',
  'pets',
  'puppy',
  'rabbit',
  'rodent',
  // Birds and fish
  'aquarium',
  'bird',
  'birds',
];

const OFF_NICHE_PATTERN = new RegExp(`\\b(${OFF_NICHE_TERMS.join('|')})\\b`, 'i');

/** True when the text names something outside the pink salt niche. */
export function isOffNicheText(text: string | null | undefined): boolean {
  if (!text) return false;
  return OFF_NICHE_PATTERN.test(text);
}

export interface NicheCheckInput {
  name: string;
  /** The product's category label, when the source reports one. */
  category?: string | null;
}

/**
 * True when a product belongs on the Himalayan Koh storefront.
 *
 * A product is judged on its own name and its category: a lion's share of the
 * off-niche catalog is only identifiable one way or the other — `SALT LICKS` is
 * off-niche from its name alone, while a neutrally named item filed under
 * `animal feed` is off-niche from its category.
 */
export function isNicheProduct(input: NicheCheckInput): boolean {
  return !isOffNicheText(input.name) && !isOffNicheText(input.category ?? '');
}

/** True when a category may appear in public navigation. */
export function isNicheCategory(name: string): boolean {
  return !isOffNicheText(name);
}

/** Drops off-niche products, preserving order. */
export function filterNicheProducts<T extends NicheCheckInput>(products: T[]): T[] {
  return products.filter(isNicheProduct);
}

/** How many products a filter removed — the figure the seam reports as a warning. */
export function countOffNicheProducts<T extends NicheCheckInput>(products: T[]): number {
  return products.length - filterNicheProducts(products).length;
}

/* ------------------------------------------------------------------ */
/* Public sections                                                     */
/* ------------------------------------------------------------------ */

/**
 * The sections the storefront presents. Each is backed by products that exist
 * today — the niche has no bath line or gift sets yet, and an empty shelf is not
 * created here just to look complete.
 */
export type NicheSectionKey = 'edible-pink-salt' | 'cooking-serving' | 'lamps-decor' | 'bulk';

export interface NicheSection {
  key: NicheSectionKey;
  label: string;
  /** What the section holds, in the store's own words. */
  description: string;
}

export const NICHE_SECTIONS: readonly NicheSection[] = [
  {
    key: 'edible-pink-salt',
    label: 'Edible Pink Salt',
    description: 'Fine and coarse pink salt for the kitchen, in jars, pouches and larger bags.',
  },
  {
    key: 'cooking-serving',
    label: 'Cooking & Serving',
    description: 'Salt blocks and plates for grilling, chilling and serving at the table.',
  },
  {
    key: 'lamps-decor',
    label: 'Salt Lamps & Décor',
    description: 'Hand-carved pink salt lamps and decorative pieces for the home.',
  },
  {
    key: 'bulk',
    label: 'Bulk & Wholesale',
    description: 'Larger bags and pouches for kitchens, retailers and gifting at volume.',
  },
];

const SECTION_BY_KEY = new Map(NICHE_SECTIONS.map((section) => [section.key, section]));

export function nicheSection(key: NicheSectionKey): NicheSection {
  const section = SECTION_BY_KEY.get(key);
  if (!section) throw new Error(`Unknown niche section: ${key}`);
  return section;
}

/**
 * Which public section a product belongs to, from its name and category.
 * Returns `null` when nothing matches — an unplaced product is listed under All
 * rather than being filed somewhere it does not belong.
 */
export function nicheSectionKeyFor(input: NicheCheckInput): NicheSectionKey | null {
  const haystack = `${input.name} ${input.category ?? ''}`.toLowerCase();

  // Every section is a shelf of salt. A product with no salt in its name is
  // unplaced rather than filed by its category alone — "Bulk Order" is a way of
  // buying, not a product.
  if (!/\bsalt\b|\blamp|\blantern\b/.test(haystack)) return null;

  if (/\blamp|lantern|decor|décor|holder|candle|tealight|carved\b/.test(haystack)) return 'lamps-decor';
  if (/\bblock|plate|slab|grill|plank\b/.test(haystack)) return 'cooking-serving';
  if (/\bbulk|wholesale|25 kg|25kg|50 lb|18 lbs|18lb|pallet\b/.test(haystack)) return 'bulk';
  return 'edible-pink-salt';
}

/** The sections that actually have products in the given catalog, in display order. */
export function sectionsWithProducts<T extends NicheCheckInput>(
  products: T[]
): Array<NicheSection & { count: number }> {
  const counts = new Map<NicheSectionKey, number>();
  for (const product of filterNicheProducts(products)) {
    const key = nicheSectionKeyFor(product);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return NICHE_SECTIONS.filter((section) => (counts.get(section.key) ?? 0) > 0).map((section) => ({
    ...section,
    count: counts.get(section.key) ?? 0,
  }));
}
