import {
  NICHE_SECTIONS,
  nicheSection,
  nicheSectionKeyFor,
  type NicheCheckInput,
  type NicheSectionKey,
} from '../catalog/niche';

/**
 * The shop's public taxonomy: which shelves exist, what they are called, and
 * which URL each one lives at.
 *
 * The shelves themselves are owned by `lib/catalog/niche.ts` — that module
 * decides what the store sells and how it is shelved. This module is only the
 * routing adapter on top of it: labels, `?category=` values, title → path
 * lookups for cards and the footer, and the matching predicate the product grid
 * uses. Keeping the taxonomy in one place is what stops the rail, the filter
 * pills, the hub pages, the sitemap and the PDP from each listing a different
 * set of shelves.
 *
 * The livestock shelves that used to live here (`salt-lick-horses`,
 * `salt-cattle`, `salt-blocks-deer`) are gone rather than renamed: the store no
 * longer sells those products, so the hubs, their copy and their filter pills
 * were retired together with the SKUs. Links to them now fall back to All
 * instead of landing on a shelf nothing can fill — see
 * `RETIRED_CATEGORY_QUERY_VALUES`.
 */

/** Display label for "no shelf selected". */
export const ALL_LABEL = 'All';

export type CategoryContentKey = NicheSectionKey;

export interface CategoryFilterTab {
  label: string;
  /** `null` is the All tab. */
  key: CategoryContentKey | null;
}

/** The filter pills, All first, then the shelves in the order niche.ts lists them. */
export const CATEGORY_FILTER_TABS: readonly CategoryFilterTab[] = [
  { label: ALL_LABEL, key: null },
  ...NICHE_SECTIONS.map((section) => ({ label: section.label, key: section.key })),
];

const KEY_BY_LABEL = new Map<string, CategoryContentKey>(
  NICHE_SECTIONS.map((section) => [section.label, section.key])
);

export function categoryKeyFromFilterLabel(label: string): CategoryContentKey | null {
  return KEY_BY_LABEL.get(label) ?? null;
}

/** The shelf's display label — the single source for pills, breadcrumbs and titles. */
export function filterLabelFromKey(key: CategoryContentKey): string {
  return nicheSection(key).label;
}

/**
 * The shelf a product belongs on, from its name and category.
 *
 * `null` means "no shelf claims it", which the grid treats as All and the
 * sitemap treats as "not a hub landing page". It never means "somewhere".
 */
export function productShelfKey(product: NicheCheckInput): CategoryContentKey | null {
  return nicheSectionKeyFor(product);
}

/**
 * Whether a product shows under the selected filter.
 *
 * A single judgement serves the pills, the grid and the hub counts: the product
 * is matched by the same placement function that decides which shelf it would be
 * filed under, so a product can never appear under one pill and be counted under
 * another.
 */
export function productMatchesCategoryFilter(
  product: NicheCheckInput,
  categoryKey: CategoryContentKey | null,
  activeFilter: string
): boolean {
  if (activeFilter === ALL_LABEL || !categoryKey) return true;
  return productShelfKey(product) === categoryKey;
}

export const CATEGORY_QUERY_PARAM = 'category';

/**
 * `?category=` values that used to resolve to a hub and now resolve to nothing.
 *
 * Kept as a named list so the retirement is visible: a shared or indexed link
 * like `/products?category=horses` lands on the full catalogue rather than on a
 * livestock hub that no longer exists and can no longer be filled.
 */
export const RETIRED_CATEGORY_QUERY_VALUES: readonly string[] = [
  'horses',
  'horse',
  'horse-salt',
  'salt-lick-horses',
  'cattle',
  'cattle-salt',
  'livestock',
  'salt-cattle',
  'deer',
  'deer-salt',
  'wildlife',
  'salt-blocks-deer',
  // The shelf was renamed when the niche narrowed to pink salt.
  'edible',
  'cooking',
  'edible-salt',
  'edible-cooking-salt',
  'himalayan-edible-salt',
];

const RETIRED_VALUES = new Set(RETIRED_CATEGORY_QUERY_VALUES);
const VALID_KEYS = new Set<string>(NICHE_SECTIONS.map((section) => section.key));

export function isCategoryContentKey(value: string): value is CategoryContentKey {
  return VALID_KEYS.has(value);
}

/**
 * Resolves a `?category=` value.
 *
 * Returns `null` for All, for a retired value and for an unknown one alike —
 * `useProductsCategoryFilter` strips the parameter in that case, which is the
 * honest outcome: the shopper sees the whole catalogue rather than an empty grid
 * under a shelf that does not exist.
 */
export function normalizeCategoryQueryValue(raw: string | null | undefined): CategoryContentKey | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  if (RETIRED_VALUES.has(normalized)) return null;
  return isCategoryContentKey(normalized) ? normalized : null;
}

export function parseCategoryFromSearchParams(params: URLSearchParams): CategoryContentKey | null {
  return normalizeCategoryQueryValue(params.get(CATEGORY_QUERY_PARAM));
}

export function buildProductsCategoryPath(key: CategoryContentKey | null): string {
  if (!key) return '/products';
  return `/products?${CATEGORY_QUERY_PARAM}=${encodeURIComponent(key)}`;
}

export function buildProductsCategorySearch(key: CategoryContentKey | null): string {
  if (!key) return '';
  return `?${CATEGORY_QUERY_PARAM}=${encodeURIComponent(key)}`;
}

/**
 * Cards, the footer and the homepage name a shelf by its display title.
 *
 * A title that maps to nothing returns `/products` — the catalogue — because
 * sending a shopper to a filter that renders empty is worse than sending them to
 * everything.
 */
export const CATEGORY_LINK_BY_TITLE: Record<string, CategoryContentKey> = Object.fromEntries(
  NICHE_SECTIONS.map((section) => [section.label, section.key])
);

export function productsPathForCategoryTitle(title: string): string {
  return buildProductsCategoryPath(CATEGORY_LINK_BY_TITLE[title] ?? null);
}
