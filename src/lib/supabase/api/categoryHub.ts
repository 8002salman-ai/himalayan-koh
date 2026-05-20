import { applyCategoryHubOverride } from '../../categoryContent/cmsMerge';
import { getCategoryContent } from '../../categoryContent/resolve';
import type { CategoryHubOverrideForm, CategoryHubOverrideRow } from '../../categoryContent/cmsTypes';
import type { CategoryContentKey } from '../../categoryContent/keys';
import { CATEGORY_FILTER_TABS } from '../../categoryContent/keys';
import type { CategoryContentBundle } from '../../categoryContent/types';
import { supabase } from '../client';

export const categoryHubApi = {
  async getOverride(
    categoryKey: CategoryContentKey,
    options: { includeUnpublished?: boolean } = {}
  ): Promise<CategoryHubOverrideRow | null> {
    let query = supabase
      .from('category_hub_overrides')
      .select('*')
      .eq('category_key', categoryKey);

    if (!options.includeUnpublished) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      if (error.code === '42P01') return null;
      throw error;
    }

    return data as CategoryHubOverrideRow | null;
  },

  async listOverrides(): Promise<CategoryHubOverrideRow[]> {
    const { data, error } = await supabase
      .from('category_hub_overrides')
      .select('*')
      .order('category_key', { ascending: true });

    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }

    return (data || []) as CategoryHubOverrideRow[];
  },

  async upsertOverride(form: CategoryHubOverrideForm): Promise<CategoryHubOverrideRow> {
    const { data, error } = await supabase
      .from('category_hub_overrides')
      .upsert({
        category_key: form.category_key,
        hero: form.hero,
        seo: form.seo,
        trust_points: form.trust_points,
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      } as never)
      .select()
      .single();

    if (error) throw error;
    return data as CategoryHubOverrideRow;
  },

  async getMergedCategoryContent(
    categoryKey: CategoryContentKey
  ): Promise<CategoryContentBundle | null> {
    const base = getCategoryContent(categoryKey);
    if (!base) return null;

    const override = await this.getOverride(categoryKey);
    return applyCategoryHubOverride(base, override);
  },

  listEditableKeys(): CategoryContentKey[] {
    return CATEGORY_FILTER_TABS
      .map((tab) => tab.key)
      .filter((key): key is CategoryContentKey => Boolean(key));
  },
};
