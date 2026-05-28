# Next.js App Router (migrated from Vite)

## Start the project

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production:

```bash
npm run build
npm run start
```

## Folder structure

```
src/app/                    # App Router (URLs + API routes)
  (main)/                   # Public shop layout (header/footer)
  (auth)/                   # Login, signup, etc.
  (protected)/              # Account, orders, wishlist
  admin/                    # Admin dashboard
  api/stripe/               # Payment Intent, verify, webhook
  api/openrouter/           # AI chat

src/views/                  # Page UI components (formerly src/pages)
src/components/
src/lib/
src/lib/router-compat.tsx   # react-router-dom API → Next navigation
```

**Important:** Do not add route files under `src/pages/` — Next.js reserves that folder for the legacy Pages Router.

Regenerate App Router stubs after adding a view:

```bash
npm run generate:routes
node scripts/cleanup-next-routes.mjs
```

## Environment variables (`.env.local`)

```env
# Stripe (server)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe (client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENROUTER_API_KEY=...
```

## Stripe test flow

1. `npm run dev`
2. Add products → `/checkout` → **Pay with Card**
3. Test card: `4242 4242 4242 4242`
4. Webhook locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.

See [STRIPE.md](./STRIPE.md) for full payment documentation.

## Deploy on Vercel

- Framework preset: **Next.js**
- Build command: `npm run build`
- Output: automatic (`.next`)
- Set all env vars from `.env.local` in the Vercel dashboard
