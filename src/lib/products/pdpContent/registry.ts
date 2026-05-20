import type {
  PdpAccordionArticle,
  PdpGalleryImage,
  PdpPdfResource,
} from './types';

/**
 * Per-slug CMS payload — future admin can read/write this shape via API.
 * Partial entries merge on top of category defaults from gallery/articles/pdfs modules.
 */
export interface PdpSlugContentConfig {
  slug: string;
  gallery?: PdpGalleryImage[];
  accordionArticles?: PdpAccordionArticle[];
  pdfResources?: PdpPdfResource[];
  /** When false, enriched PDP sections use empty states instead of defaults. */
  enabled?: boolean;
}

/**
 * CMS registry (static today; replace with Supabase fetch in admin Phase 2+).
 * Keys are product slugs.
 */
export const PDP_CONTENT_REGISTRY: Record<string, PdpSlugContentConfig> = {};

export function getPdpRegistryEntry(slug: string): PdpSlugContentConfig | undefined {
  return PDP_CONTENT_REGISTRY[slug];
}

/** Merge CMS registry overrides onto a resolved list by `id`. */
export function mergeById<T extends { id: string; visible?: boolean }>(
  defaults: T[],
  overrides?: T[]
): T[] {
  if (!overrides?.length) return defaults;

  const map = new Map(defaults.map((item) => [item.id, item]));
  for (const item of overrides) {
    map.set(item.id, { ...map.get(item.id), ...item });
  }
  return [...map.values()].filter((item) => item.visible !== false);
}
