const ALL_LABEL = 'All';

/** Filter tab + product.category labels mapped to registry keys. */
export const CATEGORY_FILTER_TABS = [
  { label: 'All', key: null as string | null },
  { label: 'Edible Cooking Salt', key: 'edible-cooking-salt' },
  { label: 'Salt Lick for Horses', key: 'salt-lick-horses' },
  { label: 'Salt for Cattle', key: 'salt-cattle' },
  { label: 'Salt Blocks for Deer', key: 'salt-blocks-deer' },
] as const;

export type CategoryContentKey =
  | 'edible-cooking-salt'
  | 'salt-lick-horses'
  | 'salt-cattle'
  | 'salt-blocks-deer';

const LABEL_TO_KEY: Record<string, CategoryContentKey> = {
  'Edible Cooking Salt': 'edible-cooking-salt',
  'Salt Lick for Horses': 'salt-lick-horses',
  'Salt for Cattle': 'salt-cattle',
  'Salt Blocks for Deer': 'salt-blocks-deer',
};

export function categoryKeyFromFilterLabel(label: string): CategoryContentKey | null {
  return LABEL_TO_KEY[label] ?? null;
}

/** DB / legacy product.category values that belong to each hub (filter + left column). */
export const CATEGORY_PRODUCT_LABELS: Record<CategoryContentKey, readonly string[]> = {
  'edible-cooking-salt': ['Edible Cooking Salt'],
  'salt-lick-horses': ['Salt Lick for Horses'],
  'salt-cattle': ['Salt for Cattle', 'Salt Lumps for Cattle', 'Salt for Livestock'],
  'salt-blocks-deer': ['Salt Blocks for Deer'],
};

export function productMatchesCategoryFilter(
  productCategory: string,
  categoryKey: CategoryContentKey | null,
  activeFilter: string
): boolean {
  if (activeFilter === ALL_LABEL || !categoryKey) return true;
  const labels = CATEGORY_PRODUCT_LABELS[categoryKey];
  return labels.includes(productCategory) || productCategory === activeFilter;
}

export function filterLabelFromKey(key: CategoryContentKey): string {
  const tab = CATEGORY_FILTER_TABS.find((t) => t.key === key);
  return tab?.label ?? key;
}

export const CATEGORY_QUERY_PARAM = 'category';

/** Short aliases for shareable URLs (e.g. ?category=horses). */
const CATEGORY_KEY_ALIASES: Record<string, CategoryContentKey> = {
  horses: 'salt-lick-horses',
  horse: 'salt-lick-horses',
  'horse-salt': 'salt-lick-horses',
  cattle: 'salt-cattle',
  'cattle-salt': 'salt-cattle',
  livestock: 'salt-cattle',
  deer: 'salt-blocks-deer',
  'deer-salt': 'salt-blocks-deer',
  wildlife: 'salt-blocks-deer',
  edible: 'edible-cooking-salt',
  cooking: 'edible-cooking-salt',
  'edible-salt': 'edible-cooking-salt',
};

const VALID_KEYS = new Set<string>(
  CATEGORY_FILTER_TABS.map((t) => t.key).filter(Boolean) as string[]
);

export function isCategoryContentKey(value: string): value is CategoryContentKey {
  return VALID_KEYS.has(value);
}

export function normalizeCategoryQueryValue(raw: string | null | undefined): CategoryContentKey | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  if (isCategoryContentKey(normalized)) return normalized;
  return CATEGORY_KEY_ALIASES[normalized] ?? null;
}

export function parseCategoryFromSearchParams(
  params: URLSearchParams
): CategoryContentKey | null {
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

/** Home/footer cards: map display title to registry key. */
export const CATEGORY_LINK_BY_TITLE: Record<string, CategoryContentKey> = {
  'Edible Cooking Salt': 'edible-cooking-salt',
  'Salt Lick for Horses': 'salt-lick-horses',
  'Salt for Cattle': 'salt-cattle',
  'Salt Lumps for Cattle': 'salt-cattle',
  'Salt Blocks for Deer': 'salt-blocks-deer',
  'Salt for Livestock': 'salt-cattle',
};

export function productsPathForCategoryTitle(title: string): string {
  const key = CATEGORY_LINK_BY_TITLE[title];
  return buildProductsCategoryPath(key ?? null);
}
