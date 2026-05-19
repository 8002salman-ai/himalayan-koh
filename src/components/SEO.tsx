import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import JsonLd from './JsonLd';
import { ORGANIZATION_JSON_LD } from '../lib/seo/constants';
import { applyDocumentSeo, resolveDocumentSeo, staticRouteMetadata } from '../lib/seo/applyDocumentSeo';
import { getPageSeo, subscribePageSeo } from '../lib/seo/pageSeo';

export default function SEO() {
  const location = useLocation();
  const [pageSeoRevision, setPageSeoRevision] = useState(0);

  useLayoutEffect(() => subscribePageSeo(() => setPageSeoRevision((n) => n + 1)), []);

  useLayoutEffect(() => {
    const override = getPageSeo();
    const staticMeta = staticRouteMetadata(location.pathname);
    const resolved = resolveDocumentSeo(location.pathname, override, staticMeta);
    applyDocumentSeo(resolved);
  }, [location.pathname, location.search, pageSeoRevision]);

  return location.pathname === '/' ? <JsonLd id="organization" data={ORGANIZATION_JSON_LD} /> : null;
}
