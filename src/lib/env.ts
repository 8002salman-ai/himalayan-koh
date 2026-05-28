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
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VITE_SITE_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''),
  sentryDsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.VITE_SENTRY_DSN || '',
};

export const isDev = process.env.NODE_ENV === 'development';
