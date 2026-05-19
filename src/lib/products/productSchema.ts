import type { Product } from '../../data/products';
import { ORGANIZATION_JSON_LD, SITE_URL } from '../seo/constants';
import { buildProductPageSeo } from './productSeo';
import { getProductContent } from './productContent';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function buildOrganizationRef() {
  return { '@id': ORGANIZATION_ID };
}

export function buildProductStructuredData(product: Product) {
  const content = getProductContent(product);
  const { title, description } = buildProductPageSeo(product);
  const productUrl = `${SITE_URL}/products/${product.slug}`;

  const { '@context': _ctx, ...orgBase } = ORGANIZATION_JSON_LD;
  const organization = {
    ...orgBase,
    '@id': ORGANIZATION_ID,
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION_JSON_LD.name,
      url: SITE_URL,
    },
  };

  const productNode: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: content.displayName,
    description,
    image: product.image,
    sku: String(product.id),
    url: productUrl,
    brand: {
      '@type': 'Brand',
      name: ORGANIZATION_JSON_LD.name,
    },
    manufacturer: buildOrganizationRef(),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'USD',
      price: product.priceMin,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: buildOrganizationRef(),
    },
  };

  const graph: Record<string, unknown>[] = [organization, productNode];

  if (content.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${productUrl}#faq`,
      mainEntity: content.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  const webPage = {
    '@type': 'WebPage',
    '@id': `${productUrl}#webpage`,
    url: productUrl,
    name: title,
    description,
    isPartOf: { '@type': 'WebSite', url: SITE_URL, name: ORGANIZATION_JSON_LD.name },
    publisher: buildOrganizationRef(),
    mainEntity: { '@id': `${productUrl}#product` },
  };

  graph.push(webPage);

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
