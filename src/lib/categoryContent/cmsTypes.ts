import type { CategoryContentKey } from './keys';
import type { CategoryHero, CategorySeo, CategoryTrustPoint } from './types';

export interface CategoryHubOverrideForm {
  category_key: CategoryContentKey;
  hero: CategoryHero;
  seo: CategorySeo;
  trust_points: CategoryTrustPoint[];
  is_published: boolean;
}

export interface CategoryHubOverrideRow {
  category_key: string;
  hero: CategoryHero | Record<string, unknown>;
  seo: CategorySeo | Record<string, unknown>;
  trust_points: CategoryTrustPoint[] | unknown;
  is_published: boolean;
  updated_at: string;
}
