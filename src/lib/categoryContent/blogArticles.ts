import { blogApi, type BlogPostWithAuthor } from '../supabase/api/blog';
import { isSupabaseConfigured } from '../supabase/client';
import { blogPosts as demoBlogPosts } from '../../data/products';
import { CATEGORY_BLOG_MAPPING } from './blogMapping';
import { enrichArticleList, stripHtmlToText } from './enrichArticle';
import type { CategoryContentKey } from './keys';
import type { CategoryArticleCard } from './types';

const DEFAULT_ARTICLE_IMAGE =
  'https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg';

/** Demo slugs aligned with Supabase seed for offline / local dev. */
const DEMO_BLOG_SLUGS: Record<number, string> = {
  1: 'why-dairy-cows-need-trace-minerals',
  2: 'himalayan-pink-vs-white-salt-farmers',
  3: 'choosing-right-salt-lick-horses',
  4: 'the-science-behind-84-trace-minerals',
  5: 'bulk-buying-guide-ranch-owners',
  6: 'winter-nutrition-tips-cattle',
};

export function mapBlogPostToCategoryArticle(post: BlogPostWithAuthor): CategoryArticleCard {
  const excerpt = post.excerpt?.trim() || 'Read the full article on the Himalayan Koh blog.';
  const fromContent = post.content ? stripHtmlToText(post.content) : '';
  const body = fromContent.length > excerpt.length ? fromContent.slice(0, 520) : undefined;

  return enrichArticleList([
    {
      id: post.id,
      title: post.title,
      excerpt,
      body,
      image: post.featured_image || DEFAULT_ARTICLE_IMAGE,
      readTime: `${post.read_time} min read`,
      tag: post.category || 'Article',
      href: `/blog/${post.slug}`,
    },
  ])[0];
}

function mapDemoPostToCategoryArticle(
  post: (typeof demoBlogPosts)[number]
): CategoryArticleCard {
  const slug = DEMO_BLOG_SLUGS[post.id] || `post-${post.id}`;
  return enrichArticleList([
    {
      id: String(post.id),
      title: post.title,
      excerpt: post.excerpt,
      image: post.image,
      readTime: post.readTime,
      tag: post.category,
      href: `/blog/${slug}`,
    },
  ])[0];
}

function demoPostsForCategory(key: CategoryContentKey): CategoryArticleCard[] {
  const mapping = CATEGORY_BLOG_MAPPING[key];
  const categorySet = new Set(mapping.blogCategories.map((c) => c.toLowerCase()));

  return demoBlogPosts
    .filter((post) => categorySet.has(post.category.toLowerCase()))
    .slice(0, mapping.maxArticles)
    .map(mapDemoPostToCategoryArticle);
}

function mergeWithPlaceholders(
  primary: CategoryArticleCard[],
  placeholders: CategoryArticleCard[],
  max: number
): CategoryArticleCard[] {
  const seen = new Set<string>();
  const merged: CategoryArticleCard[] = [];

  for (const article of primary) {
    if (merged.length >= max) break;
    seen.add(article.id);
    merged.push(article);
  }

  for (const article of placeholders) {
    if (merged.length >= max || seen.has(article.id)) continue;
    seen.add(article.id);
    merged.push(article);
  }

  return merged;
}

/**
 * Load published blog posts for a shop category hub.
 * Falls back to filtered demo posts, then to static registry placeholders.
 */
export async function loadCategoryArticles(
  key: CategoryContentKey,
  placeholderArticles: CategoryArticleCard[]
): Promise<{ articles: CategoryArticleCard[]; source: 'blog' | 'demo' | 'placeholder' }> {
  const mapping = CATEGORY_BLOG_MAPPING[key];

  if (isSupabaseConfigured()) {
    try {
      const posts = await blogApi.getPostsForCategoryHub({
        categories: mapping.blogCategories,
        tags: mapping.blogTags,
        limit: mapping.maxArticles,
      });

      if (posts.length > 0) {
        const blogCards = posts.map(mapBlogPostToCategoryArticle);
        return {
          articles: enrichArticleList(
            mergeWithPlaceholders(blogCards, placeholderArticles, mapping.maxArticles)
          ),
          source: 'blog',
        };
      }
    } catch (error) {
      console.warn('Category blog fetch failed, using fallbacks:', error);
    }
  }

  const demoArticles = demoPostsForCategory(key);
  if (demoArticles.length > 0) {
    return {
      articles: enrichArticleList(
        mergeWithPlaceholders(demoArticles, placeholderArticles, mapping.maxArticles)
      ),
      source: 'demo',
    };
  }

  return {
    articles: enrichArticleList(placeholderArticles.slice(0, mapping.maxArticles)),
    source: 'placeholder',
  };
}
