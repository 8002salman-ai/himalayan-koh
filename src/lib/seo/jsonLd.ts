import { ORGANIZATION_JSON_LD, SITE_NAME } from './constants';
import { absoluteUrl } from './server';
import { absoluteImage } from './metadata';

interface ProductLdInput {
  name: string;
  description?: string | null;
  slug: string;
  price: number;
  image?: string | null;
  sku?: string | null;
  inStock?: boolean;
}

export function productJsonLd(input: ProductLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description || undefined,
    image: absoluteImage(input.image),
    sku: input.sku || undefined,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/products/${input.slug}`),
      priceCurrency: 'USD',
      price: input.price.toFixed(2),
      availability: input.inStock === false
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
  };
}

interface ArticleLdInput {
  title: string;
  description?: string | null;
  slug: string;
  image?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
}

export function articleJsonLd(input: ArticleLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description || undefined,
    image: absoluteImage(input.image),
    datePublished: input.publishedAt || undefined,
    dateModified: input.updatedAt || input.publishedAt || undefined,
    author: input.authorName
      ? { '@type': 'Person', name: input.authorName }
      : { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.svg') },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${input.slug}`),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    ...ORGANIZATION_JSON_LD,
    '@id': `${absoluteUrl('/')}#organization`,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.svg'),
  };
}

/**
 * Site-level entity. Lets Google associate the domain with the brand name for
 * sitelinks and knowledge-panel matching, independent of any single page.
 */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absoluteUrl('/')}#website`,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
  };
}

/**
 * Aggregate offer for product listing pages. Shows price range and availability
 * across all products, enabling Google rich snippets like "Starting at $X.XX".
 */
interface AggregateOfferInput {
  minPrice: number;
  maxPrice: number;
  priceCurrency: string;
  offerCount: number;
  availability: 'InStock' | 'OutOfStock';
}

export function aggregateOfferJsonLd({
  minPrice,
  maxPrice,
  priceCurrency,
  offerCount,
  availability,
}: AggregateOfferInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateOffer',
    priceCurrency,
    lowPrice: minPrice.toFixed(2),
    highPrice: maxPrice.toFixed(2),
    offerCount,
    availability: `https://schema.org/${availability}`,
  };
}

/**
 * LocalBusiness schema for service area businesses. Helps with local search
 * visibility and enables Google rich results with contact information.
 */
export function localBusinessJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${absoluteUrl('/')}#localbusiness`,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    telephone: '+1-832-224-6466',
    contactType: 'Customer Service',
    areaServed: {
      '@type': 'Country',
      name: 'US',
    },
    priceRange: '$$',
    image: absoluteImage(),
    description: 'Premium Himalayan pink salt products for livestock and edible use',
  };
}

/**
 * FAQ schema for product pages. Displays common questions and answers in
 * Google search results, improving CTR and user experience.
 */
interface FAQItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
