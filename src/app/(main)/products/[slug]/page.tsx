import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import { fetchSeoProduct } from '@/lib/seo/server';
import JsonLd from '@/components/seo/JsonLd';
import ProductDetailClient from './ProductDetailClient';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchSeoProduct(slug).catch(() => null);

  if (!product) {
    return buildMetadata({
      title: 'Product - Himalayan Koh',
      description: 'Premium Himalayan pink salt products for livestock and cooking.',
      path: `/products/${slug}`,
    });
  }

  const description =
    product.meta_description || product.short_description || product.description || undefined;
  const image = product.thumbnail || product.images?.[0] || null;

  return buildMetadata({
    title: product.meta_title || `${product.name} - Himalayan Koh`,
    description: description || undefined,
    path: `/products/${product.slug}`,
    ogImage: image,
    ogType: 'product',
  });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await fetchSeoProduct(slug).catch(() => null);

  return (
    <>
      {product && (
        <>
          <JsonLd
            data={productJsonLd({
              name: product.name,
              description: product.meta_description || product.short_description || product.description,
              slug: product.slug,
              price: product.price,
              image: product.thumbnail || product.images?.[0] || null,
              sku: product.sku,
            })}
          />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Products', path: '/products' },
              { name: product.name, path: `/products/${product.slug}` },
            ])}
          />
        </>
      )}
      <ProductDetailClient />
    </>
  );
}
