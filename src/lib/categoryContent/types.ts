import type {
  PdpAccordionArticle,
  PdpGalleryImage,
  PdpPdfResource,
} from '../products/pdpContent/types';

export interface CategoryTrustPoint {
  label: string;
  detail: string;
}

export interface CategoryArticleCard {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  readTime: string;
  tag: string;
  /** Future CMS/blog slug; optional link target. */
  href?: string;
}

export interface CategoryHero {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface CategorySeo {
  title: string;
  description: string;
}

export interface CategoryContentBundle {
  /** Internal registry key */
  key: string;
  /** Matches `Product.category` / filter tab label */
  productCategoryLabel: string;
  hero: CategoryHero;
  seo: CategorySeo;
  trustPoints: CategoryTrustPoint[];
  gallery: PdpGalleryImage[];
  guides: PdpAccordionArticle[];
  articles: CategoryArticleCard[];
  pdfs: PdpPdfResource[];
  emptyStates: {
    gallery?: string;
    guides?: string;
    articles?: string;
    pdfs?: string;
  };
}

export interface CategoryContentAvailability {
  gallery: boolean;
  guides: boolean;
  articles: boolean;
  pdfs: boolean;
}
