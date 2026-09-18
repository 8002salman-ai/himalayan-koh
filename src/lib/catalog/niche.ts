/**
 * The storefront's niche guard: what the shop does **not** sell.
 *
 * Himalayan Koh is a Himalayan pink salt store — edible grades, cooking and
 * serving pieces, lamps and décor, bath products and bulk salt. It does not sell
 * livestock or pet products. The staging WooCommerce catalog predates that
 * decision and still carries animal-feed items (see
 * `docs/HIMALAYAN-PINK-SALT-NICHE-AUDIT.md`), and the WordPress categories still
 * include `animal feed`.
 *
 * WooCommerce stays the owner of the catalog: the owner archives those products
 * and categories there. This module is the *storefront* guard that holds in the
 * meantime. It is applied at the catalog seam (`lib/backend/products.ts`) and the
 * blog seam (`lib/catalog/nicheBlog.ts`), so that homepage, search, related
 * products, category pages, sitemap and schema all inherit one judgement instead
 * of each filtering for itself — and so that nothing off-niche is ever handed to a
 * renderer or sent to a browser.
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
 *
 * The taxonomy — the shelves the shop *does* have — lives in `./nicheSections.ts`,
 * which carries no denylist and is safe to use from the browser.
 */

import {
  NICHE_SECTIONS,
  nicheSectionKeyFor,
  type NicheCheckInput,
  type NicheSection,
  type NicheSectionKey,
} from './nicheSections';

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

/**
 * The off-niche term a piece of text names, or `null` when it names none.
 *
 * Returned rather than reduced to a boolean because there is a second caller with
 * a second question: `middleware.ts` asks it about the *request URL*. Next
 * serialises the requested path and query into the response it streams, so a URL
 * that names an animal product comes back out in the raw HTML of a pink salt shop
 * — measured at three occurrences for `/products/salt-licks-for-horses` — even
 * though no such product was ever served. One denylist, asked about data at the
 * read seam and about URL text at the edge.
 */
export function offNicheTerm(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = OFF_NICHE_PATTERN.exec(text);
  return match ? match[0].toLowerCase() : null;
}

/** True when the text names something outside the pink salt niche. */
export function isOffNicheText(text: string | null | undefined): boolean {
  return offNicheTerm(text) !== null;
}

/**
 * True when a product belongs on the Himalayan Koh storefront.
 *
 * A product is judged on everything about it that a visitor would see: its name,
 * its category, and its own copy. Each of the three is load-bearing, and each was
 * found to be load-bearing by a real row — a lick is off-niche from its name
 * alone, a neutrally named item filed under `animal feed` is off-niche from its
 * category, and a neutrally named, neutrally filed pouch was off-niche only in its
 * description, which is what the catalogue payload shipped to the browser.
 *
 * A product whose copy addresses the animal trade is withheld until the copy is
 * rewritten in WooCommerce, which is a one-field edit for the owner and is
 * reported to them in the console. That is deliberately stricter than judging the
 * name alone, because a shop cannot claim to sell pink salt for the kitchen while
 * its own description sells it for a feed lot.
 */
export function isNicheProduct(input: NicheCheckInput): boolean {
  return (
    !isOffNicheText(input.name) &&
    !isOffNicheText(input.category ?? '') &&
    !isOffNicheText(input.description ?? '')
  );
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

/**
 * The storefront's shelves that actually hold something, with real counts.
 *
 * Composed from the guard and the taxonomy rather than maintained as a third
 * list: a shelf appears here exactly when a product the guard keeps is placed on
 * it, so the rail can never offer a filter that renders empty.
 */
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
