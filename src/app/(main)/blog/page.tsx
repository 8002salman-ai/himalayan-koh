import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import { fetchSeoBlogPosts } from '@/lib/seo/server';
import JsonLd from '@/components/seo/JsonLd';
import BlogClient from './BlogClient';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: 'Blog - Livestock Health & Himalayan Salt Guides | Himalayan Koh',
    description:
      'Read guides on livestock health, trace-mineral nutrition, salt lick feeding, and cooking with Himalayan pink salt.',
    path: '/blog',
  });
}

export default async function Page() {
  const posts = await fetchSeoBlogPosts().catch(() => []);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ])}
      />
      {/* Server-fetched posts seed the listing so the article links are in the
          initial HTML for crawlers. */}
      <BlogClient initialPosts={posts} />
    </>
  );
}
