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
      // Legacy WordPress URLs last, so the admin rules above always win.
      ...LEGACY_REDIRECTS,
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'himalayankoh.com' },
      { protocol: 'https', hostname: '**.vercel.app' },
    ],
  },
};

export default nextConfig;
