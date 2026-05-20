# Deployment & operations (Vercel)

Phase 0 baseline checklist for production deploys. Mirror these in **Vercel → Project → Settings → Environment Variables** (Production, Preview, and Development as needed).

## Required — storefront + auth

| Variable | Scope | Notes |
|----------|--------|--------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Publishable / anon key only |

Without these, the app runs in **local demo mode** (static products, `localStorage` cart). Checkout and accounts require Supabase.

## Required — setup scripts (local / CI only)

| Variable | Scope | Notes |
|----------|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server / scripts | Never expose to client or `VITE_*` |
| `SUPABASE_DB_URL` | Scripts | `npm run setup:supabase` migrations |

## Optional — AI assistant

| Variable | Scope | Notes |
|----------|--------|--------|
| `OPENROUTER_API_KEY` | Server (`api/openrouter`) | Without it, chat returns 503 |
| `OPENROUTER_MODEL` | Server | Overrides default free-model chain |

## Optional — Stripe card checkout (test mode only)

| Variable | Scope | Notes |
|----------|--------|--------|
| `STRIPE_SECRET_KEY` | Server | `sk_test_...` — Payment Intent, verify, webhook |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Client | `pk_test_...` — enables card option on `/checkout` |
| `STRIPE_WEBHOOK_SECRET` | Server | `whsec_...` — `api/stripe/webhook` (backup order sync) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Required for `verify-payment` + webhook order updates |
| `VITE_SUPABASE_URL` | Server | Same project URL (used by Stripe API routes) |

Live keys (`sk_live_` / `pk_live_`) are rejected in API routes. Invoice checkout works without Stripe.

**Stripe webhook URL:** `https://your-domain.com/api/stripe/webhook`  
Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

**Test card:** `4242 4242 4242 4242` · any future expiry · any CVC

## Optional — error monitoring

| Variable | Scope | Notes |
|----------|--------|--------|
| `VITE_SENTRY_DSN` | Client | Enables Sentry when `@sentry/react` is installed |
| `VITE_APP_ENV` | Client | `production` \| `preview` \| `development` (tags errors) |

If Sentry is not configured, errors are logged to the browser console with a support **error ID** (see `src/lib/monitoring.ts`).

### Vercel log alerts (no code)

1. Vercel → Project → **Observability** / **Logs**
2. Filter `level:error` or function failures on `/api/openrouter`
3. Connect **Log Drains** (Datadog, Axiom, etc.) or enable Vercel notifications for failed deployments

## Build configuration

| Variable | Default | Notes |
|----------|---------|--------|
| `VITE_SINGLE_FILE` | unset / `false` | Set `true` only for legacy single-HTML exports. **Production should leave this unset** for normal chunked builds. |

**Vercel build command:** `npm run build`  
**Output directory:** `dist`

No `vercel.json` is required; `api/` routes deploy as serverless functions automatically.

## Routing (Phase 1)

The storefront uses **clean URLs** (`/products`, `/blog/slug`) via `BrowserRouter`. Vercel rewrites non-API traffic to `index.html` (`vercel.json`).

Legacy hash links (`/#/products`) are redirected once on load via `HashUrlRedirect`.

Product detail pages: `/products/:slug` (shareable, indexed in `sitemap.xml`).

Regenerate sitemap before build: `npm run generate:sitemap` (runs automatically in `npm run build`).

## Post-deploy smoke test

1. Home, `/products`, a product URL `/products/himalayan-edible-pink-salt-fine`, `/checkout` (empty cart message)
2. Login with seeded customer (after `npm run seed:demo-accounts`)
3. Admin login → `/admin` (non-admin must be blocked)
4. AI chat (if `OPENROUTER_API_KEY` set)
5. Run RLS verification: `npm run verify:rls`

## Demo accounts (after seed)

- Admin: `admin@himalayankoh.com` / `Admin123!`
- Customer: `customer@himalayankoh.com` / `Customer123!`

Rotate passwords before public launch.
