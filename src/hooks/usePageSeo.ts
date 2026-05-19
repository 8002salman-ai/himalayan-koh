import { useEffect } from 'react';
import { setPageSeo, type PageSeo } from '../lib/seo/pageSeo';

export function usePageSeo(seo: PageSeo | null) {
  useEffect(() => {
    setPageSeo(seo);
    return () => setPageSeo(null);
  }, [seo]);
}
