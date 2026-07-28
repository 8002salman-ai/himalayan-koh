import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import {
  buildProductsCategoryPath,
  filterLabelFromKey,
  getCategoryContent,
  normalizeCategoryQueryValue,
  CATEGORY_QUERY_PARAM,
} from '@/lib/categoryContent';
import JsonLd from '@/components/seo/JsonLd';
import ProductsClient from './ProductsClient';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** First value of a possibly-repeated query param. */
function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const DEFAULT_PRODUCTS_SEO = {
  title: 'Shop Himalayan Pink Salt Products - Himalayan Koh',
  description:
    'Shop premium Himalayan pink salt for horses, cattle, deer, and cooking. Natural mineral-rich salt licks, blocks, and edible grades.',
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const categoryKey = normalizeCategoryQueryValue(firstValue(params[CATEGORY_QUERY_PARAM]));
  const category = getCategoryContent(categoryKey);

  // Each category hub is its own landing page — give it server-rendered title,
  // description and canonical instead of inheriting the generic /products ones.
  if (category) {
    return buildMetadata({
      title: category.seo.title,
      description: category.seo.description,
      path: buildProductsCategoryPath(categoryKey),
    });
  }

  return buildMetadata({ ...DEFAULT_PRODUCTS_SEO, path: '/products' });
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categoryKey = normalizeCategoryQueryValue(firstValue(params[CATEGORY_QUERY_PARAM]));
  const category = getCategoryContent(categoryKey);

  const breadcrumb = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
  ];

  if (category && categoryKey) {
    breadcrumb.push({
      name: filterLabelFromKey(categoryKey),
      path: buildProductsCategoryPath(categoryKey),
    });
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumb)} />
      <ProductsClient />
    </>
  );
}
