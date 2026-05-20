import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CATEGORY_QUERY_PARAM,
  categoryKeyFromFilterLabel,
  filterLabelFromKey,
  normalizeCategoryQueryValue,
  parseCategoryFromSearchParams,
  type CategoryContentKey,
} from '../lib/categoryContent';

const ALL_LABEL = 'All';

/**
 * URL is the source of truth: /products?category=salt-lick-horses
 * Supports aliases (?category=horses). Browser back/forward restores filters.
 */
export function useProductsCategoryFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryKey = useMemo(
    () => parseCategoryFromSearchParams(searchParams),
    [searchParams]
  );

  const activeFilter = useMemo(
    () => (categoryKey ? filterLabelFromKey(categoryKey) : ALL_LABEL),
    [categoryKey]
  );

  /** Strip invalid ?category= values so broken links fall back to All. */
  useEffect(() => {
    const raw = searchParams.get(CATEGORY_QUERY_PARAM);
    if (!raw) return;

    const resolved = normalizeCategoryQueryValue(raw);
    if (!resolved) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(CATEGORY_QUERY_PARAM);
          return next;
        },
        { replace: true }
      );
      return;
    }

    if (raw !== resolved) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(CATEGORY_QUERY_PARAM, resolved);
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  const setActiveFilter = useCallback(
    (label: string) => {
      const key = label === ALL_LABEL ? null : categoryKeyFromFilterLabel(label);

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!key) {
            next.delete(CATEGORY_QUERY_PARAM);
          } else {
            next.set(CATEGORY_QUERY_PARAM, key);
          }
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  return {
    activeFilter,
    categoryKey,
    setActiveFilter,
    isAll: activeFilter === ALL_LABEL,
  };
}
