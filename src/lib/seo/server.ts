import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { publicEnv } from '@/lib/env';

/**
 * Server-only Supabase client for SEO/metadata fetches during server render.
 * Uses the public anon key (respects RLS — only published/active rows are
 * returned) and no session persistence. Separate from the browser client so
 * server components can fetch data without shipping it through the client.
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function getSeoSupabase() {
  if (cached) return cached;
  cached = createClient<Database>(
    publicEnv.supabaseUrl || 'https://disabled.supabase.co',
    publicEnv.supabaseAnonKey || 'disabled-anon-key',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}

/**
 * Absolute site origin for canonical URLs / OG tags. Prefers the configured
 * NEXT_PUBLIC_SITE_URL; falls back to the production domain (never a
 * vercel.app preview URL, which would leak into search results).
 */
export function siteOrigin(): string {
  const configured = publicEnv.siteUrl?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return 'https://himalayankoh.com';
}

export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface SeoProduct {
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  images: string[] | null;
  thumbnail: string | null;
  sku: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

/** Server-side product-by-slug fetch for metadata + JSON-LD. Returns null if not found. */
export async function fetchSeoProduct(slug: string): Promise<SeoProduct | null> {
  const normalized = (() => {
    try {
      return decodeURIComponent(slug).trim().toLowerCase();
    } catch {
      return slug.trim().toLowerCase();
    }
  })();
  if (!normalized) return null;

  const { data } = await getSeoSupabase()
    .from('products')
    .select(
      'name, slug, description, short_description, price, images, thumbnail, sku, meta_title, meta_description'
    )
    .eq('slug', normalized)
    .eq('is_active', true)
    .eq('dealer_only', false)
    .maybeSingle();

  return (data as SeoProduct | null) ?? null;
}

export interface SeoBlogPost {
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  updated_at: string | null;
}

/** Server-side published blog-post-by-slug fetch for metadata + JSON-LD. */
export async function fetchSeoBlogPost(slug: string): Promise<SeoBlogPost | null> {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return null;

  const { data } = await getSeoSupabase()
    .from('blog_posts')
    .select(
      'title, slug, excerpt, featured_image, meta_title, meta_description, published_at, updated_at'
    )
    .eq('slug', normalized)
    .eq('is_published', true)
    .maybeSingle();

  return (data as SeoBlogPost | null) ?? null;
}
