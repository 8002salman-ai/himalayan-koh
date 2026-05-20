import type { CategoryContentKey } from './keys';

export interface CategoryBlogMapping {
  /** Matches `blog_posts.category` values in Supabase. */
  blogCategories: string[];
  /** Matches `blog_posts.tags` (any overlap). */
  blogTags: string[];
  maxArticles: number;
}

/**
 * Maps shop category hubs to editorial categories/tags in `blog_posts`.
 * CMS: assign posts using these category names or tags for auto-surface on /products?category=...
 */
export const CATEGORY_BLOG_MAPPING: Record<CategoryContentKey, CategoryBlogMapping> = {
  'edible-cooking-salt': {
    blogCategories: ['Industry Insights', 'Research', 'Guides'],
    blogTags: ['pink salt', 'cooking', 'salt', 'comparison'],
    maxArticles: 4,
  },
  'salt-lick-horses': {
    blogCategories: ['Horse Care'],
    blogTags: ['horses', 'equine', 'salt lick', 'guide'],
    maxArticles: 4,
  },
  'salt-cattle': {
    blogCategories: ['Livestock Health', 'Seasonal Care', 'Guides'],
    blogTags: ['cattle', 'dairy', 'livestock', 'minerals', 'ranch'],
    maxArticles: 4,
  },
  'salt-blocks-deer': {
    blogCategories: ['Guides', 'Seasonal Care'],
    blogTags: ['wildlife', 'deer', 'outdoor', 'placement'],
    maxArticles: 4,
  },
};
