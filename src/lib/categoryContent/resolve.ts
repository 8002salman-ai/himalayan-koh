import { CATEGORY_CONTENT_REGISTRY } from './registry';
import type { CategoryContentAvailability, CategoryContentBundle } from './types';
import type { CategoryContentKey } from './keys';

function buildAvailability(bundle: CategoryContentBundle): CategoryContentAvailability {
  return {
    gallery: bundle.gallery.length > 0,
    guides: bundle.guides.length > 0,
    articles: bundle.articles.length > 0,
    pdfs: bundle.pdfs.length > 0,
  };
}

/**
 * Resolve educational content for a shop category filter.
 * Returns null for "All" or unknown labels.
 */
export function getCategoryContent(key: CategoryContentKey | null): CategoryContentBundle | null {
  if (!key) return null;
  const bundle = CATEGORY_CONTENT_REGISTRY[key];
  if (!bundle) return null;
  return bundle;
}

export function getCategoryAvailability(bundle: CategoryContentBundle): CategoryContentAvailability {
  return buildAvailability(bundle);
}
