import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, aggregateOfferJsonLd } from '@/lib/seo/jsonLd';
import { getCatalogProducts } from '@/lib/backend/serverCatalog';
import {
  buildProductsCategoryPath,
  filterLabelFromKey,
  getCategoryContent,
  normalizeCategoryQueryValue,
  productShelfKey,
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
  title: 'Shop Himalayan Pink Salt — Edible, Blocks & Lamps | Himalayan Koh',
  description:
    'Shop Himalayan pink salt: fine and coarse edible grades, salt blocks and serving plates, lamps and décor, and bulk bags. Unrefined and mineral-rich.',
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const categoryKey = normalizeCategoryQueryValue(firstValue(params[CATEGORY_QUERY_PARAM]));
  const category = getCategoryContent(categoryKey);

  // A value that is not a live shelf never reaches this render: `middleware.ts`
  // answers `/products?category=<anything else>` with a 308 to the plain
  // catalogue, which is also what keeps the retired shelf names out of the
  // serialised page payload. The normalisation below is the rendering rule.

  // Each category hub is its own landing page — give it server-rendered title,
  // description and canonical instead of inheriting the generic /products ones.
  if (category && categoryKey) {
    // A category hub with zero purchasable products is a real page (gallery,
    // guides) but nothing to buy — noindex it so it doesn't rank for a
    // product search and disappoint the shopper who clicks through. Drop the
    // noindex the moment a matching SKU goes live.
    //
    // The count comes from the catalog seam, not from a database of its own: the
    // hub is indexed exactly when the same products the grid will render place
    // onto it, whatever source is configured.
    let hasProducts = true;
    try {
      const { products } = await getCatalogProducts();
      hasProducts = products.some((product) => productShelfKey(product) === categoryKey);
    } catch (err) {
      console.error('Could not check category product count for robots meta:', err);
    }

    return buildMetadata({
      title: category.seo.title,
      description: category.seo.description,
      path: buildProductsCategoryPath(categoryKey),
      noindex: !hasProducts,
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

  // One catalogue read serves the page, the schema below and the client grid.
  //
  // The read goes through the catalog seam — the same source the grid renders —
  // so schema can never advertise a price the shop is not actually showing, and
  // the client is handed the products this render was built from instead of
  // asking the backend for the whole catalogue again on mount. The seam memoizes
  // per request, so `generateMetadata` (the hub noindex decision) does not pay for
  // a second upstream read.
  //
  // When the source cannot report prices no AggregateOffer is emitted at all,
  // which is why this is silent rather than an error, and why `availability` is
  // omitted unless the source reported stock we can stand behind.
  let catalogProducts: Awaited<ReturnType<typeof getCatalogProducts>>['products'] | null = null;
  let aggregateOffer = null;
  try {
    const read = await getCatalogProducts();
    catalogProducts = read.products;

    if (!category) {
      const priced = read.products.filter(
        (product) => typeof product.priceMin === 'number' && Number.isFinite(product.priceMin)
      );
      if (priced.length > 0) {
        const prices = priced.map((product) => product.priceMin as number);
        aggregateOffer = aggregateOfferJsonLd({
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          priceCurrency: 'USD',
          offerCount: priced.length,
          availability: priced.some((product) => product.inStock) ? 'InStock' : 'OutOfStock',
        });
      }
    }
  } catch (err) {
    // A failed read costs the page its schema and its first paint data, not the
    // page: the grid then reads for itself and reports the failure there.
    console.error('Could not read the catalog for /products:', err);
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumb)} />
      {aggregateOffer && <JsonLd data={aggregateOffer} />}
      <ProductsClient
        initialProducts={catalogProducts}
        initialCategoryKey={categoryKey}
      />
    </>
  );
}
