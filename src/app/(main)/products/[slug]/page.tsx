import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import { fetchSeoProductModel } from '@/lib/seo/server';
import { buildProductStructuredData } from '@/lib/products/productSchema';
import { buildProductPageSeo, getProductDisplayName } from '@/lib/products/productSeo';
import JsonLd from '@/components/seo/JsonLd';
import ProductDetailClient from './ProductDetailClient';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchSeoProductModel(slug).catch(() => null);

  if (!product) {
    return buildMetadata({
      title: 'Product - Himalayan Koh',
      description: 'Premium Himalayan pink salt products for livestock and cooking.',
      path: `/products/${slug}`,
    });
  }

  // Same helper the client view uses, so the server HTML title/description
  // match the hydrated page instead of competing with it.
  const { title, description } = buildProductPageSeo(product);

  return buildMetadata({
    title,
    description,
    path: `/products/${product.slug}`,
    ogImage: product.image,
    ogType: 'product',
  });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await fetchSeoProductModel(slug).catch(() => null);

  return (
    <>
      {product && (
        <>
          {/* Full Product + Offer + FAQPage + WebPage graph, server-rendered so
              crawlers get it without executing the client bundle. */}
          <JsonLd data={buildProductStructuredData(product)} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Products', path: '/products' },
              { name: getProductDisplayName(product), path: `/products/${product.slug}` },
            ])}
          />
        </>
      )}
      {/* key remounts the view when navigating product-to-product, so the
          seeded server data is picked up instead of the previous product's. */}
      <ProductDetailClient key={product?.slug ?? slug} initialProduct={product} />
    </>
  );
}
