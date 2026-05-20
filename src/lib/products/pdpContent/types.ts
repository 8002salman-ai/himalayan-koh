/** PDP content types — CMS-ready structured content for product detail pages. */

export interface PdpContentAvailability {
  /** Livestock-style PDP with gallery/guides/PDF slots. */
  enriched: boolean;
  gallery: boolean;
  accordion: boolean;
  pdfs: boolean;
}

export interface PdpContentEmptyStates {
  gallery?: string;
  accordion?: string;
  pdfs?: string;
}

/** Unified bundle returned by getPdpContent(). */
export interface PdpContentBundle {
  productSlug: string;
  category: string;
  gallery: PdpGalleryImage[];
  accordionArticles: PdpAccordionArticle[];
  pdfResources: PdpPdfResource[];
  availability: PdpContentAvailability;
  emptyStates: PdpContentEmptyStates;
}

export interface PdpGalleryImage {
  id: string;
  src: string;
  alt: string;
  /** Intrinsic width for CLS (optional). */
  width?: number;
  /** Intrinsic height for CLS (optional). */
  height?: number;
  visible?: boolean;
}

export interface PdpAccordionFaq {
  question: string;
  answer: string;
}

export interface PdpAccordionArticle {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  faqs?: PdpAccordionFaq[];
  visible?: boolean;
}

export interface PdpPdfResource {
  id: string;
  title: string;
  description: string;
  /** Absolute URL or site-root path (e.g. /resources/guide.pdf). */
  url: string;
  fileSize: string;
  publishedAt: string;
  visible?: boolean;
}
