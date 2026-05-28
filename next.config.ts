import type { NextConfig } from 'next';

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
