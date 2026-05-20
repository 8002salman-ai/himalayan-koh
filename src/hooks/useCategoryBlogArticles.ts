import { useEffect, useState } from 'react';
import { loadCategoryArticles } from '../lib/categoryContent/blogArticles';
import type { CategoryArticleCard } from '../lib/categoryContent';
import type { CategoryContentKey } from '../lib/categoryContent';

export type CategoryArticleSource = 'blog' | 'demo' | 'placeholder' | 'idle';

export function useCategoryBlogArticles(
  categoryKey: CategoryContentKey | null,
  placeholderArticles: CategoryArticleCard[] = []
) {
  const [articles, setArticles] = useState<CategoryArticleCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<CategoryArticleSource>('idle');

  useEffect(() => {
    if (!categoryKey) {
      setArticles([]);
      setSource('idle');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadCategoryArticles(categoryKey, placeholderArticles).then((result) => {
      if (cancelled) return;
      setArticles(result.articles);
      setSource(result.source);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [categoryKey, placeholderArticles]);

  return { articles, loading, source };
}
