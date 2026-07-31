import type { NextConfig } from 'next';
import { LEGACY_REDIRECTS } from './src/lib/seo/legacyRedirects';

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
      {
        source: '/admin/settings',
        destination: '/admin',
        permanent: false,
      },
      // The separate shipping-ready form is gone — Add Product on the products
      // page opens the full editor, which does everything that page did and
      // more. Kept as a redirect so an existing bookmark lands somewhere useful
      // instead of on a 404.
      {
        source: '/admin/new-shipping-product',
        destination: '/admin/products',
        permanent: false,
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
