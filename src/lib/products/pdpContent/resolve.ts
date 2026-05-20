import type { Product } from '../../../data/products';
import { getPdpAccordionArticles } from './articles';
import { isLivestockPdpProduct } from './categories';
import { getPdpGalleryImages } from './gallery';
import { getPdpPdfResources } from './pdfs';
import { getPdpRegistryEntry, mergeById } from './registry';
import type {
  PdpAccordionArticle,
  PdpGalleryImage,
  PdpContentAvailability,
  PdpContentBundle,
  PdpPdfResource,
} from './types';

const EMPTY_COPY = {
  gallery: 'Lifestyle photos for this product will be added soon.',
  accordion: 'Detailed guides for this product are being prepared.',
  pdfs: 'PDF resources will be available here soon.',
} as const;

function resolveGallery(product: Product, registryOverride?: PdpGalleryImage[]): PdpGalleryImage[] {
  const base = getPdpGalleryImages(product);
  return registryOverride ? mergeById(base, registryOverride) : base;
}

function resolveArticles(
  product: Product,
  registryOverride?: PdpAccordionArticle[]
): PdpAccordionArticle[] {
  const base = getPdpAccordionArticles(product);
  return registryOverride ? mergeById(base, registryOverride) : base;
}

function resolvePdfs(product: Product, registryOverride?: PdpPdfResource[]): PdpPdfResource[] {
  const base = getPdpPdfResources(product);
  return registryOverride ? mergeById(base, registryOverride) : base;
}

function buildAvailability(
  gallery: PdpGalleryImage[],
  accordionArticles: PdpAccordionArticle[],
  pdfResources: PdpPdfResource[],
  enriched: boolean
): PdpContentAvailability {
  return {
    enriched,
    gallery: gallery.length > 0,
    accordion: accordionArticles.length > 0,
    pdfs: pdfResources.length > 0,
  };
}

/**
 * Single resolver for PDP enriched content (gallery, guides, PDFs).
 * Use this in pages; individual getters remain for backward compatibility.
 */
export function getPdpContent(product: Product): PdpContentBundle {
  const registry = getPdpRegistryEntry(product.slug);
  const enriched = isLivestockPdpProduct(product) && registry?.enabled !== false;

  if (!enriched) {
    return {
      productSlug: product.slug,
      category: product.category,
      gallery: [],
      accordionArticles: [],
      pdfResources: [],
      availability: buildAvailability([], [], [], false),
      emptyStates: {},
    };
  }

  const gallery = resolveGallery(product, registry?.gallery);
  const accordionArticles = resolveArticles(product, registry?.accordionArticles);
  const pdfResources = resolvePdfs(product, registry?.pdfResources);
  const availability = buildAvailability(gallery, accordionArticles, pdfResources, true);

  return {
    productSlug: product.slug,
    category: product.category,
    gallery,
    accordionArticles,
    pdfResources,
    availability,
    emptyStates: {
      gallery: availability.gallery ? undefined : EMPTY_COPY.gallery,
      accordion: availability.accordion ? undefined : EMPTY_COPY.accordion,
      pdfs: availability.pdfs ? undefined : EMPTY_COPY.pdfs,
    },
  };
}
