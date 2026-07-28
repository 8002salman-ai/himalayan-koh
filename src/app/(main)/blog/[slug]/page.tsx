import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import { fetchSeoBlogPostFull } from '@/lib/seo/server';
import { SITE_NAME } from '@/lib/seo/constants';
import JsonLd from '@/components/seo/JsonLd';
import BlogDetailClient from './BlogDetailClient';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchSeoBlogPostFull(slug).catch(() => null);

  if (!post) {
    return buildMetadata({
      title: 'Blog - Himalayan Koh',
      description: 'Livestock health, mineral nutrition, and Himalayan salt guides.',
      path: `/blog/${slug}`,
    });
  }

  return buildMetadata({
    // Matches the title the hydrated view sets, so the tab title does not
    // change on hydration and crawlers see one consistent title.
    title: post.meta_title || `${post.title} | ${SITE_NAME}`,
    description: post.meta_description || post.excerpt || undefined,
    path: `/blog/${post.slug}`,
    ogImage: post.featured_image,
    ogType: 'article',
  });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await fetchSeoBlogPostFull(slug).catch(() => null);

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
              authorName: post.author?.full_name,
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
      {/* Seeding the client view with the server-fetched post puts the article
          body in the initial HTML instead of a loading spinner. The key remounts
          the view on post-to-post navigation so the new seed is picked up. */}
      <BlogDetailClient key={post?.slug ?? slug} initialPost={post} />
    </>
  );
}
