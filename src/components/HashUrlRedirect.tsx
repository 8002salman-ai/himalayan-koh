import { useEffect } from 'react';

/**
 * Migrates legacy HashRouter URLs (/#/products) to clean paths (/products).
 */
export default function HashUrlRedirect() {
  useEffect(() => {
    const { hash, pathname, search } = window.location;
    if (hash.startsWith('#/') && (pathname === '/' || pathname.endsWith('/index.html'))) {
      const nextPath = hash.slice(1);
      window.history.replaceState(null, '', `${nextPath}${search}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  return null;
}
