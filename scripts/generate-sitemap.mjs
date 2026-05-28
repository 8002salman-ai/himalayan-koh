/**
 * Generates public/sitemap.xml from static routes + Supabase catalog (or fallback data).
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const siteUrl = 'https://himalayankoh.com';

const staticPaths = [
  { loc: '/', priority: '1.0' },
  { loc: '/products', priority: '0.9' },
  { loc: '/about', priority: '0.7' },
  { loc: '/blog', priority: '0.8' },
  { loc: '/gallery', priority: '0.6' },
  { loc: '/contact', priority: '0.8' },
  { loc: '/terms', priority: '0.3' },
  { loc: '/privacy', priority: '0.3' },
];

const fallbackProductSlugs = [
  'himalayan-edible-pink-salt-fine',
  'himalayan-pink-salt-16oz-jar',
  'himalayan-rock-salt-6lbs-pouch',
  'himalayan-livestock-salt-45lbs',
  'himalayan-salt-licks-horses',
  'himalayan-salt-cattle-18lbs',
];

const fallbackBlogSlugs = [
  'why-dairy-cows-need-trace-minerals',
  'himalayan-pink-vs-white-salt-farmers',
  'choosing-right-salt-lick-horses',
];

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

async function fetchSlugs() {
  let productSlugs = fallbackProductSlugs;
  let blogSlugs = fallbackBlogSlugs;

  if (supabaseUrl && supabaseKey) {
    const client = createClient(supabaseUrl, supabaseKey);

    const { data: products } = await client
      .from('products')
      .select('slug')
      .eq('is_active', true);

    if (products?.length) {
      productSlugs = products.map((row) => row.slug).filter(Boolean);
    }

    const { data: posts } = await client
      .from('blog_posts')
      .select('slug')
      .eq('is_published', true);

    if (posts?.length) {
      blogSlugs = posts.map((row) => row.slug).filter(Boolean);
    }
  }

  return { productSlugs, blogSlugs };
}

function urlEntry(loc, priority) {
  return `  <url>
    <loc>${siteUrl}${loc}</loc>
    <priority>${priority}</priority>
  </url>`;
}

const { productSlugs, blogSlugs } = await fetchSlugs();

const urls = [
  ...staticPaths.map((entry) => urlEntry(entry.loc, entry.priority)),
  ...productSlugs.map((slug) => urlEntry(`/products/${slug}`, '0.8')),
  ...blogSlugs.map((slug) => urlEntry(`/blog/${slug}`, '0.7')),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

const outputPath = path.join(root, 'public', 'sitemap.xml');
writeFileSync(outputPath, xml, 'utf8');
console.log(`Sitemap written to ${outputPath} (${urls.length} URLs)`);
