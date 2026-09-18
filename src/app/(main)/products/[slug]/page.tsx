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
      description:
        'Unrefined Himalayan pink salt for cooking and the home — edible grades, blocks, lamps and bulk bags.',
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

/**
 * FAQs emitted as FAQPage structured data on every product page.
 *
 * Generic by design, and about the salt rather than about a health outcome:
 * what the pink colour is, which grain to pick, what is (and is not) added, and
 * how to keep it. No medical or veterinary advice is asserted here, because
 * structured data is quoted verbatim by search engines and a shop is not a
 * clinician.
 */
const PRODUCT_FAQs = faqJsonLd([
  {
    question: 'Why is Himalayan pink salt pink?',
    answer:
      'The colour comes from iron and other trace minerals the rock already contains. Unrefined Himalayan salt keeps them; salt washed to pure white sodium chloride does not.',
  },
  {
    question: 'Which grain size should I choose?',
    answer:
      'Fine grain dissolves quickly and suits baking and brines. Medium grain fills a grinder for everyday cooking. Coarse grain is for finishing, rimming a glass and slow cooks.',
  },
  {
    question: 'Does this salt contain additives?',
    answer:
      'No. Our Himalayan pink salt is unrefined and contains no anti-caking agents, bleaching or added iodine.',
  },
  {
    question: 'How should I store it?',
    answer:
      'Keep it sealed and dry, away from the stove and from anything strongly scented. Salt does not spoil; it only takes on moisture or odours.',
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
