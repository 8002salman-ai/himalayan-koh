import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import BlogClient from './BlogClient';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Blog - Livestock Health & Himalayan Salt Guides | Himalayan Koh',
    description:
      'Read guides on livestock health, trace-mineral nutrition, salt lick feeding, and cooking with Himalayan pink salt.',
    path: '/blog',
  });
}

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ])}
      />
      <BlogClient />
    </>
  );
}
