'use client';
import ResourceDetailPage from '@/views/ResourceDetailPage';
import type { ResourceArticle } from '@/data/resources';

export default function ResourceDetailClient({ article }: { article: ResourceArticle }) {
  return <ResourceDetailPage article={article} />;
}
