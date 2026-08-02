import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/jsonLd';
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

// Generic FAQs for salt products (can be customized per product in future)
const PRODUCT_FAQs = faqJsonLd([
  {
    question: 'What are the health benefits of Himalayan pink salt?',
    answer: 'Himalayan pink salt is naturally mineral-rich, containing trace minerals like potassium, magnesium, and calcium. It supports hydration, mineral balance, and can help maintain healthy blood pressure levels.',
  },
  {
    question: 'How should I use this salt?',
    answer: 'Usage depends on the product type. Salt licks can be offered free-choice to livestock. Edible salt can be used for cooking and food preparation. Always follow recommended serving sizes and consult your veterinarian for livestock nutrition guidance.',
  },
  {
    question: 'Is this salt food-grade safe?',
    answer: 'Yes, our Himalayan pink salt is natural, unrefined, and contains no additives or anti-caking agents. It is safe for both humans and animals.',
  },
  {
    question: 'How long does a salt lick last?',
    answer: 'The lifespan of a salt lick depends on consumption rates and weather conditions. Most quality salt licks last several weeks to months with regular use.',
  },
]);

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
          <JsonLd data={PRODUCT_FAQs} />
        </>
      )}
      {/* key remounts the view when navigating product-to-product, so the
          seeded server data is picked up instead of the previous product's. */}
      <ProductDetailClient key={product?.slug ?? slug} initialProduct={product} />
    </>
  );
}
