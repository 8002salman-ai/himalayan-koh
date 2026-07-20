import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import { fetchSeoBlogPost } from '@/lib/seo/server';
import JsonLd from '@/components/seo/JsonLd';
import BlogDetailClient from './BlogDetailClient';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchSeoBlogPost(slug).catch(() => null);

  if (!post) {
    return buildMetadata({
      title: 'Blog - Himalayan Koh',
      description: 'Livestock health, mineral nutrition, and Himalayan salt guides.',
      path: `/blog/${slug}`,
    });
  }

  return buildMetadata({
    title: post.meta_title || `${post.title} - Himalayan Koh`,
    description: post.meta_description || post.excerpt || undefined,
    path: `/blog/${post.slug}`,
    ogImage: post.featured_image,
    ogType: 'article',
  });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await fetchSeoBlogPost(slug).catch(() => null);

  return (
    <>
      {post && (
        <>
          <JsonLd
            data={articleJsonLd({
              title: post.title,
              description: post.meta_description || post.excerpt,
              slug: post.slug,
              image: post.featured_image,
              publishedAt: post.published_at,
              updatedAt: post.updated_at,
            })}
          />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: post.title, path: `/blog/${post.slug}` },
            ])}
          />
        </>
      )}
      <BlogDetailClient />
    </>
  );
}
