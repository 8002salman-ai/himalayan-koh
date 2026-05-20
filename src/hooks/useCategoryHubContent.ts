import { useEffect, useMemo, useState } from 'react';
import { getCategoryContent } from '../lib/categoryContent/resolve';
import { applyCategoryHubOverride } from '../lib/categoryContent/cmsMerge';
import type { CategoryContentBundle } from '../lib/categoryContent';
import type { CategoryContentKey } from '../lib/categoryContent';
import { categoryHubApi } from '../lib/supabase/api/categoryHub';
import { isSupabaseConfigured } from '../lib/supabase/client';

/**
 * Static registry + optional Supabase CMS overrides for category hub hero/SEO/trust.
 */
export function useCategoryHubContent(categoryKey: CategoryContentKey | null) {
  const staticContent = useMemo(() => getCategoryContent(categoryKey), [categoryKey]);
  const [content, setContent] = useState<CategoryContentBundle | null>(staticContent);
  const [loading, setLoading] = useState(Boolean(categoryKey && isSupabaseConfigured()));

  /** Show registry content immediately when switching categories (no stale horse/cattle bleed). */
  useEffect(() => {
    setContent(staticContent);
  }, [staticContent]);

  useEffect(() => {
    if (!categoryKey || !staticContent) {
      setContent(staticContent);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setContent(staticContent);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void categoryHubApi
      .getOverride(categoryKey)
      .then((override) => {
        if (cancelled) return;
        setContent(applyCategoryHubOverride(staticContent, override));
      })
      .catch((error) => {
        console.warn('Category hub CMS load failed, using registry defaults:', error);
        if (!cancelled) setContent(staticContent);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryKey, staticContent]);

  return { content, loading, staticContent };
}
