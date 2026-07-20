import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import ProductsClient from './ProductsClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Shop Himalayan Pink Salt Products - Himalayan Koh',
    description:
      'Shop premium Himalayan pink salt for horses, cattle, deer, and cooking. Natural mineral-rich salt licks, blocks, and edible grades.',
    path: '/products',
  });
}

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
        ])}
      />
      <ProductsClient />
    </>
  );
}
