import { createClient } from '@supabase/supabase-js';
import type {
  BlogPost,
  Database,
  ProductWithCategory,
  Profile,
} from '@/lib/supabase/database.types';
import type { Product } from '@/data/products';
import { getFallbackProductBySlug, mapSupabaseProduct } from '@/lib/products/mapProduct';
import { isRealCatalogProduct } from '@/lib/supabase/api/products';
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
 * Every server-rendered route (Products, product detail, blog) awaits one of
 * the fetches below before Next can send the page, and client-side
 * navigation waits for that same render to finish before the URL changes —
 * with no loading.tsx in (main), the old page just sits there in the
 * meantime. A Supabase request that stalls (cold serverless network blip,
 * DNS hiccup) used to hang that render indefinitely, which reads as
 * navigation being stuck until the visitor manually reloads. Bounding every
 * such request lets a stall fail fast instead: the page still renders, just
 * without that one piece of data, the same way a not-found row is handled.
 */
const SEO_FETCH_TIMEOUT_MS = 6_000;

export function seoFetchDeadline(): AbortSignal {
  return AbortSignal.timeout(SEO_FETCH_TIMEOUT_MS);
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
  const normalized = normalizeSlugParam(slug);
  if (!normalized) return null;

  const { data } = await getSeoSupabase()
    .from('products')
    .select(
      'name, slug, description, short_description, price, images, thumbnail, sku, meta_title, meta_description, tags'
    )
    .eq('slug', normalized)
    .eq('is_active', true)
    .eq('dealer_only', false)
    .abortSignal(seoFetchDeadline())
    .maybeSingle();

  if (!data || !isRealCatalogProduct(data as { tags?: string[] | null })) return null;
  return data as SeoProduct;
}

/** Route params arrive URL-encoded and case-inconsistent; slugs are stored lowercase. */
function normalizeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug).trim().toLowerCase();
  } catch {
    return slug.trim().toLowerCase();
  }
}

/**
 * Full product row mapped to the same `Product` shape the client views use, so
 * server metadata and structured data are built by exactly the same helpers the
 * page renders with (no title/description drift between server HTML and the
 * hydrated page). Falls back to the bundled catalog when Supabase has no match,
 * which mirrors the client resolver.
 */
export async function fetchSeoProductModel(slug: string): Promise<Product | null> {
  const normalized = normalizeSlugParam(slug);
  if (!normalized) return null;

  const { data } = await getSeoSupabase()
    .from('products')
    .select('*, category:categories(*), inventory(*)')
    .eq('slug', normalized)
    .eq('is_active', true)
    .eq('dealer_only', false)
    .abortSignal(seoFetchDeadline())
    .maybeSingle();

  if (data) {
    // A real active row exists for this slug — either show it (packing
    // profile present) or respect that it's deliberately withheld from the
    // storefront. Either way, never let the bundled demo catalog (which
    // reuses these same slugs) republish it from stale fallback data.
    return isRealCatalogProduct(data as { tags?: string[] | null })
      ? mapSupabaseProduct(data as unknown as ProductWithCategory)
      : null;
  }

  return getFallbackProductBySlug(normalized) ?? null;
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
    .abortSignal(seoFetchDeadline())
    .maybeSingle();

  return (data as SeoBlogPost | null) ?? null;
}

/** Same shape the client blog API returns, so the view can be seeded with it directly. */
export type SeoBlogPostFull = BlogPost & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};

/**
 * Full published post including body content and author, for server rendering
 * the article into the initial HTML. Returns null when unpublished or missing.
 */
export async function fetchSeoBlogPostFull(slug: string): Promise<SeoBlogPostFull | null> {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return null;

  const { data } = await getSeoSupabase()
    .from('blog_posts')
    .select('*, author:profiles(id, full_name, avatar_url)')
    .eq('slug', normalized)
    .eq('is_published', true)
    .abortSignal(seoFetchDeadline())
    .maybeSingle();

  return (data as unknown as SeoBlogPostFull | null) ?? null;
}

/**
 * Published posts, newest first, for server rendering the blog index. Without
 * this the listing ships as an empty grid and crawlers find no internal links
 * to the individual articles.
 */
export async function fetchSeoBlogPosts(limit = 24): Promise<SeoBlogPostFull[]> {
  const { data } = await getSeoSupabase()
    .from('blog_posts')
    .select('*, author:profiles(id, full_name, avatar_url)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
    .abortSignal(seoFetchDeadline());

  return (data as unknown as SeoBlogPostFull[] | null) ?? [];
}
