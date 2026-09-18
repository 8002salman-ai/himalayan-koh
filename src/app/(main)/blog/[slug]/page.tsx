import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import { fetchSeoBlogPostFull } from '@/lib/seo/server';
import { isOffNicheBlogPost } from '@/lib/catalog/nicheBlog';
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
      description: 'Himalayan pink salt guides: grain sizes, cooking, storage and buying in bulk.',
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
    // Articles written for the livestock/pet trade are still in the blog store
    // from the old site. They stay readable at their old URL so nothing that was
    // ever public 404s, but they are noindexed and kept out of the listing and
    // the sitemap, because this storefront sells Himalayan pink salt for people.
    noindex: isOffNicheBlogPost({ title: post.title, slug: post.slug, excerpt: post.excerpt }),
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
