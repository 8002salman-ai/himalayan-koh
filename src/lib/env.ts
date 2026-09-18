import { SITE_ORIGIN } from '@/lib/site/origin';

/** Client-safe public env (NEXT_PUBLIC_* with Vite fallbacks for migration). */
export const publicEnv = {
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  stripePublishableKey:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    '',
  // Resolved by `@/lib/site/origin`, which is the only place an origin is
  // decided (and which refuses a loopback value in a production build). Read
  // from there rather than from the raw variable, so client code cannot get a
  // different answer than the canonical tags do.
  siteUrl: SITE_ORIGIN,
  shippoEnabled: process.env.NEXT_PUBLIC_SHIPPO_ENABLED === 'true',
  // Blog is temporarily off the storefront (kept live for direct/search
  // access and in the sitemap for SEO) — set NEXT_PUBLIC_BLOG_ENABLED=true to
  // bring back the "Articles" promo section on category/product pages.
  blogEnabled: process.env.NEXT_PUBLIC_BLOG_ENABLED === 'true',
  sentryDsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.VITE_SENTRY_DSN || '',
};

export const isDev = process.env.NODE_ENV === 'development';
