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
    author: { '@type': 'Organization', name: input.authorName || SITE_NAME },
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
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.svg'),
  };
}
