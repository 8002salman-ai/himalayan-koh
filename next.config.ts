import type { NextConfig } from 'next';
import { LEGACY_REDIRECTS } from './src/lib/seo/legacyRedirects';
import { PREVIEW_HOSTS } from './src/lib/seo/previewHost';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Legacy Vite page components live in src/views (not src/pages — reserved by Next.js).
  pageExtensions: ['tsx', 'ts'],
  async redirects() {
    return [
      {
        source: '/admin/products/new',
        destination: '/admin/products?action=new',
        permanent: false,
      },
      {
        source: '/admin/categories/new',
        destination: '/admin/categories',
        permanent: false,
      },
      // NOTE: /admin/settings deliberately has NO redirect here. It used to send
      // the admin back to the dashboard because no settings screen existed; the
      // console now has one (src/views/admin/AdminSettings.tsx, also served at
      // /admin/api-keys), so the rail entry resolves instead of silently
      // bouncing to the dashboard.
      // The separate shipping-ready form is gone — Add Product on the products
      // page opens the full editor, which does everything that page did and
      // more. Kept as a redirect so an existing bookmark lands somewhere useful
      // instead of on a 404.
      {
        source: '/admin/new-shipping-product',
        destination: '/admin/products',
        permanent: false,
      },
      // Both pouch products were renamed to fix a typo ("Eidible" ->
      // "Edible") and correct their weight labeling — old slugs redirect so
      // existing links/bookmarks/search rankings aren't lost.
      {
        source: '/products/himalayan-pink-eidible-salt-fine-grain-pouche',
        destination: '/products/himalayan-pink-edible-salt-fine-grain-pouch-3-lb',
        permanent: true,
      },
      {
        source: '/products/himalayan-pink-eidible-salt-fine-grain-pouche-',
        destination: '/products/himalayan-pink-edible-salt-fine-grain-pouch-6-lb',
        permanent: true,
      },
      // Legacy WordPress URLs last, so the admin rules above always win.
      ...LEGACY_REDIRECTS,
    ];
  },
  async headers() {
    return [
      {
        source: '/images/products/white-background/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Rehosted WordPress images (see src/lib/images/legacyAssets.ts). These
      // are frozen assets — a replacement gets a new filename, never a new body
      // under the same name — so they are safe to cache indefinitely.
      {
        source: '/images/legacy/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // The preview subdomain serves this same build, so no host information
      // exists at build time to branch on in generateMetadata — adding it there
      // would opt all 38 prerendered routes into dynamic rendering. A
      // host-scoped response header keeps the storefront prerendered while
      // making the preview host unindexable. Headers are matched before the
      // filesystem, so this covers prerendered HTML, /robots.txt and public
      // files alike — and only for the hosts listed in PREVIEW_HOSTS.
      ...PREVIEW_HOSTS.map((host) => ({
        source: '/:path*',
        has: [{ type: 'host' as const, value: host }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.vercel.app' },
    ],
  },
};

export default nextConfig;
