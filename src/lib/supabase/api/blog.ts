import { supabase } from '../client';
import type { BlogPost, Profile } from '../database.types';

export type BlogPostWithAuthor = BlogPost & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};

export interface BlogFilters {
  category?: string;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const blogApi = {
  // Get all published posts
  async getPosts(filters: BlogFilters = {}): Promise<{ posts: BlogPostWithAuthor[]; count: number }> {
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.tag) {
      query = query.contains('tags', [filters.tag]);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { posts: data as BlogPostWithAuthor[], count: count || 0 };
  },

  // Get single post by slug
  async getPostBySlug(slug: string): Promise<BlogPostWithAuthor | null> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Increment view count
    await supabase
      .from('blog_posts')
      .update({ view_count: (data as BlogPost).view_count + 1 } as never)
      .eq('id', (data as BlogPost).id);

    return data as BlogPostWithAuthor;
  },

  // Get featured/latest posts
  async getFeaturedPosts(limit = 3): Promise<BlogPostWithAuthor[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as BlogPostWithAuthor[];
  },

  // Get related posts
  async getRelatedPosts(postId: string, category: string | null, limit = 3): Promise<BlogPostWithAuthor[]> {
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `)
      .eq('is_published', true)
      .neq('id', postId)
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as BlogPostWithAuthor[];
  },

  // Get all categories
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('category')
      .eq('is_published', true)
      .not('category', 'is', null);

    if (error) throw error;

    const categories = [...new Set((data as { category: string }[]).map((d) => d.category))];
    return categories;
  },

  // Get all tags
  async getTags(): Promise<string[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('tags')
      .eq('is_published', true);

    if (error) throw error;

    const tags = [...new Set((data as { tags: string[] }[]).flatMap((d) => d.tags || []))];
    return tags;
  },
};
