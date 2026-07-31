import type { NextConfig } from 'next';
import { LEGACY_IMAGES } from './src/lib/images/legacyAssets';
import { LEGACY_REDIRECTS } from './src/lib/seo/legacyRedirects';

/**
 * Serve the nine rehosted images from WordPress until their local copies are
 * committed to public/images/legacy/.
 *
 * These are `fallback` rewrites, so they only apply when nothing else matched —
 * in particular, after the filesystem has been checked. The moment a real file
 * exists at the path, Vercel serves that file and the rewrite stops being
 * reached. Nothing has to be switched off for the local copies to take over.
 *
 * Delete this once `npm run images:fetch` has been run and the files are
 * committed. See docs/WORDPRESS-CUTOVER.md.
 */
const LEGACY_IMAGE_FALLBACKS = Object.values(LEGACY_IMAGES).map((image) => ({
  source: image.src,
  destination: image.wordpress,
}));

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
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: LEGACY_IMAGE_FALLBACKS,
    };
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
      // Still needed only while SERVE_REHOSTED_COPIES in
      // src/lib/images/legacyAssets.ts is false. Remove this line in the same
      // commit that flips it — see docs/WORDPRESS-CUTOVER.md.
      { protocol: 'https', hostname: 'himalayankoh.com' },
      { protocol: 'https', hostname: '**.vercel.app' },
    ],
  },
};

export default nextConfig;
