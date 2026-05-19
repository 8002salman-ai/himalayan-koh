export interface PageSeo {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
}

type Listener = () => void;

let pageOverride: PageSeo | null = null;
const listeners = new Set<Listener>();

export function setPageSeo(seo: PageSeo | null) {
  pageOverride = seo;
  listeners.forEach((listener) => listener());
}

export function getPageSeo(): PageSeo | null {
  return pageOverride;
}

export function subscribePageSeo(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
