/**
 * The storefront's shelves: what the shop sells, sorted into the rows a shopper
 * actually looks at.
 *
 * This is the *taxonomy* half of the niche — the labels, the `?category=` keys and
 * the rule that decides which shelf a product belongs on. It contains no list of
 * things the store does **not** sell; that judgement lives in `./niche.ts`, which
 * is only imported by the seam that reads a catalog. Keeping the two apart is what
 * lets the filter rail, the grid, the hub pages and the sitemap share one taxonomy
 * without any of them carrying the denylist.
 *
 * Every section is a shelf of salt. The niche has no bath line or gift sets yet,
 * and an empty shelf is not created here to make the rail look complete.
 */

/** The fields placement is judged on: a product's name, and its category label. */
export interface NicheCheckInput {
  /**
   * The catalog record's own id, when the source reports one.
   *
   * The guard judges text, but the owner also rejects specific *records* —
   * carry-over products that are perfectly pink-salt-shaped and simply are not
   * wanted (see `OWNER_REJECTED_PRODUCT_IDS` in `./niche.ts`). An id is the only
   * thing about those that is stable: they can be renamed, and a rename must not
   * bring one back.
   */
  id?: number | string | null;
  name: string;
  /** The product's category label, when the source reports one. */
  category?: string | null;
  /**
   * The product's own copy, when the source ships it to the browser.
   *
   * A description is judged by the guard (`./niche.ts`) for the same reason the
   * name is: it is *rendered*. Staging carried a neutrally named pouch product
   * whose description opened "Elevate Livestock Well-being ... your animals", and
   * that copy reached the catalogue payload of every visitor while the name alone
   * looked in-niche.
   */
  description?: string | null;
}

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
