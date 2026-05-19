import { useLayoutEffect } from 'react';
import { setPageSeo, type PageSeo } from '../lib/seo/pageSeo';

/** Push per-page SEO overrides; clears on unmount or when values change. */
export function usePageSeo(seo: PageSeo | null) {
  useLayoutEffect(() => {
    setPageSeo(seo);
    return () => setPageSeo(null);
  }, [
    seo?.title,
    seo?.description,
    seo?.canonicalPath,
    seo?.ogImage,
    seo?.ogType,
    seo?.noindex,
  ]);
}
