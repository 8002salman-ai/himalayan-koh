import type { MetadataRoute } from 'next';
import { siteOrigin, getSeoSupabase } from '@/lib/seo/server';
import {
  CATEGORY_CONTENT_REGISTRY,
  CATEGORY_PRODUCT_LABELS,
  buildProductsCategoryPath,
} from '@/lib/categoryContent';
import type { CategoryContentKey } from '@/lib/categoryContent';
import { isRealCatalogProduct } from '@/lib/supabase/api/products';

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

/** Static routes always present in the sitemap. */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: ChangeFrequency }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/products', priority: 0.9, changeFrequency: 'daily' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/gallery', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/return', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${origin}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const supabase = getSeoSupabase();

  const [{ data: products }, { data: categories }, { data: posts }] = await Promise.all([
    supabase
      .from('products')
      .select('slug, updated_at, tags, category_id')
      .eq('is_active', true),
    supabase.from('categories').select('id, name'),
    supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('is_published', true),
  ]);

  const categoryNameById = new Map(
    ((categories as { id: string; name: string }[] | null) || []).map((c) => [c.id, c.name])
  );

  const realProducts = (
    (products as { slug: string; updated_at: string | null; tags?: string[] | null; category_id: string | null }[] | null) || []
  ).filter((product) => product.slug && isRealCatalogProduct(product));

  // A category hub with no real (indexed) product isn't worth crawling — it's
  // already noindexed on the page itself (see products/page.tsx), so listing
  // it here would just send crawlers to a page that asks not to be indexed.
  const categoriesWithProducts = new Set(
    realProducts
      .map((p) => (p.category_id ? categoryNameById.get(p.category_id) : undefined))
      .filter((name): name is string => Boolean(name))
  );

  // Category hubs are real landing pages (own hero, copy, guides, SEO title) served
  // from /products?category=<key>. Without these the hub content is unreachable to
  // crawlers, which only ever see the unfiltered /products page.
  for (const key of Object.keys(CATEGORY_CONTENT_REGISTRY) as CategoryContentKey[]) {
    const labels = CATEGORY_PRODUCT_LABELS[key];
    const hasProducts = labels.some((label) => categoriesWithProducts.has(label));
    if (!hasProducts) continue;

    entries.push({
      url: `${origin}${buildProductsCategoryPath(key)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  }

  for (const product of realProducts) {
    entries.push({
      url: `${origin}/products/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  for (const post of (posts as { slug: string; updated_at: string | null; published_at: string | null }[] | null) || []) {
    if (!post.slug) continue;
    entries.push({
      url: `${origin}/blog/${post.slug}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : post.published_at ? new Date(post.published_at) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
