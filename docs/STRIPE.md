# Stripe payments — setup & testing

> **Stack note:** This repo is **Vite + React + React Router + Vercel `api/` routes**, not Next.js App Router. Behavior matches your Stripe requirements; paths below map to Next.js equivalents.

## Architecture (App Router equivalent)

| Next.js App Router | This project (Vercel) |
|--------------------|------------------------|
| `app/api/stripe/create-payment-intent/route.ts` | `api/stripe/create-payment-intent.js` |
| `app/api/stripe/verify-payment/route.ts` | `api/stripe/verify-payment.js` |
| `app/api/stripe/webhook/route.ts` | `api/stripe/webhook.js` |
| `lib/stripe/server.ts` | `api/stripe/_lib/stripeClient.js` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `VITE_STRIPE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_*` |
| `STRIPE_SECRET_KEY` | `STRIPE_SECRET_KEY` (server `process.env` only) |
| `app/checkout/success/page.tsx` | `src/pages/CheckoutSuccessPage.tsx` → `/checkout/success` |
| `app/checkout/cancel/page.tsx` | `src/pages/CheckoutCancelPage.tsx` → `/checkout/cancel` |
| Payment failure page | `src/pages/CheckoutFailedPage.tsx` → `/checkout/failed` |

## Folder structure

```
api/stripe/
├── create-payment-intent.js
├── verify-payment.js
├── webhook.js
└── _lib/
    ├── stripeClient.js      # process.env.STRIPE_SECRET_KEY only
    ├── validation.js
    ├── request.js
    ├── orderTotals.js
    ├── supabaseAdmin.js
    └── updateOrderPayment.js

src/lib/stripe/
├── config.ts                # publishable key (client)
├── client.ts                # fetch payment intent + verify
├── types.ts                 # payment/order types
├── errors.ts
└── index.ts

src/components/checkout/StripePaymentForm.tsx
src/pages/CheckoutPage.tsx
src/pages/CheckoutSuccessPage.tsx
src/pages/CheckoutCancelPage.tsx
src/pages/CheckoutFailedPage.tsx
```

## Install (already in package.json)

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

## `.env.local` (project root)

Keys must be **named variables** — not raw key lines:

```env
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# After Stripe CLI listen:
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (required for saving paid orders)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional production site URL for Stripe return_url
VITE_SITE_URL=https://your-domain.vercel.app

# Production live keys only when ready:
# STRIPE_ALLOW_LIVE=true
```

Never commit `.env.local`. Never put `STRIPE_SECRET_KEY` in `src/`.

## Start the project

**Terminal 1 — API (Stripe + webhooks):**

```bash
npx vercel dev --listen 3000
```

Or:

```bash
npm run dev:api
```

**Terminal 2 — frontend:**

```bash
npm run dev
```

Vite proxies `/api/*` → `http://127.0.0.1:3000` so card checkout works locally.

**Production:** push to GitHub; Vercel runs `npm run build` and serves `api/` automatically.

## Example checkout flow

1. Add products to cart → open `/checkout`.
2. Fill shipping → choose **Pay with Card (Stripe)**.
3. Click **Continue to card payment** → pending order saved in Supabase.
4. Server `POST /api/stripe/create-payment-intent` recalculates total and returns `clientSecret`.
5. Stripe Payment Element collects card → `confirmPayment`.
6. **Success path A (no redirect):** `verify-payment` → cart cleared → `/order-confirmation`.
7. **Success path B (3DS redirect):** Stripe → `/checkout/success` → verify → `/order-confirmation`.
8. **Webhook backup:** `payment_intent.succeeded` marks order paid via `metadata.order_id`.

## Example payment confirmation

```ts
import { verifyStripeOrderPayment } from '@/lib/stripe/client';

await verifyStripeOrderPayment({
  orderId: 'uuid-from-order',
  paymentIntentId: 'pi_xxx',
});
// Order payment_status → paid, payment_method → stripe_card
```

## Test mode & test cards

Use Dashboard **Test mode** keys (`sk_test_`, `pk_test_`).

| Scenario | Card number |
|----------|-------------|
| Success | `4242 4242 4242 4242` |
| Requires authentication (3DS) | `4000 0025 0000 3155` |
| Declined | `4000 0000 0000 0002` |

- Expiry: any future date (e.g. `12/34`)
- CVC: any 3 digits
- ZIP: any 5 digits

## Webhook testing locally

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Login: `stripe login`
3. Forward events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Copy the printed `whsec_...` into `.env.local` as `STRIPE_WEBHOOK_SECRET`.
5. Restart `vercel dev`.
6. Trigger a test event:

```bash
stripe trigger payment_intent.succeeded
```

## Vercel deployment

Add in **Project → Settings → Environment Variables**:

- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Webhook URL in Stripe Dashboard:

```
https://<your-vercel-domain>/api/stripe/webhook
```

Events: `payment_intent.succeeded`, `payment_intent.payment_failed`.

## Security checklist

- Amount computed server-side from line items.
- `STRIPE_SECRET_KEY` only in `api/` via `process.env`.
- Verify endpoint checks PI status, `order_id` metadata, and amount vs DB order.
- Webhook verifies `Stripe-Signature` on raw body.
- Live keys gated behind `STRIPE_ALLOW_LIVE=true`.

## Going live

1. Switch to live keys in Vercel.
2. Set `STRIPE_ALLOW_LIVE=true`.
3. Register live webhook + `STRIPE_WEBHOOK_SECRET`.
4. Set `VITE_SITE_URL` to production domain.
