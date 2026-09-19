import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo/metadata';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import {
  getAllResourceArticles,
  getResourceArticleBySlug,
} from '@/data/resources';
import { AUTHORS } from '@/data/authors';
import ResourceDetailClient from './ResourceDetailClient';

type Params = { slug: string };

export function generateStaticParams() {
  return getAllResourceArticles().map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticleBySlug(slug);

  if (!article) {
    return buildMetadata({
      title: 'Resource Guide - Himalayan Koh',
      description: 'Educational guide on Himalayan pink salt applications and mineral management.',
      path: `/resources/${slug}`,
    });
  }

  return buildMetadata({
    title: `${article.title} | Himalayan Koh`,
    description: article.metaDescription || article.summary,
    path: `/resources/${article.slug}`,
    ogImage: article.featuredImage,
    ogType: 'article',
  });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = getResourceArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const author = AUTHORS[article.authorId];

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: article.title,
          description: article.metaDescription || article.summary,
          slug: `resources/${article.slug}`,
          image: article.featuredImage,
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
          authorName: author?.name || 'Himalayan Koh Editorial Board',
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Resources', path: '/resources' },
          { name: article.title, path: `/resources/${article.slug}` },
        ])}
      />
      <ResourceDetailClient article={article} />
    </>
  );
}
