# Shippo shipping — setup & testing

## What Shippo does in this project

1. **Checkout** — live carrier rates (USPS, UPS, etc.) when the customer enters a shipping address
2. **Admin** — one-click shipping label creation with tracking number on `/admin/orders`

Flat-rate shipping ($9.95 / $18.95 / free over $50) remains the fallback when Shippo is not configured.

## Environment variables

Add to `.env.local` (local) and Vercel → Settings → Environment Variables (production):

```env
SHIPPO_API_KEY=shippo_test_...
NEXT_PUBLIC_SHIPPO_ENABLED=true

SHIPPO_FROM_NAME=Himalayan Koh
SHIPPO_FROM_STREET1=Your warehouse street
SHIPPO_FROM_CITY=Houston
SHIPPO_FROM_STATE=TX
SHIPPO_FROM_ZIP=77001
SHIPPO_FROM_COUNTRY=US
SHIPPO_FROM_PHONE=8322246466
SHIPPO_FROM_EMAIL=orders@himalayankoh.com
```

Never expose `SHIPPO_API_KEY` to the client. Only `NEXT_PUBLIC_SHIPPO_ENABLED=true` is public.

## Database migration

Apply Shippo columns on the `orders` table:

```bash
npm run setup:supabase
```

Or run `supabase/migrations/008_shippo_shipping.sql` manually in the Supabase SQL editor.

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/shippo/rates` | Public | Returns live rates for checkout |
| `POST /api/shippo/create-label` | Admin Bearer token | Purchases label, updates order |

## Verify setup

1. Start dev server: `npm run dev:clean`
2. Run: `npm run check:shippo`
3. Open `/checkout`, add items, fill address → live rates should appear
4. Admin: `/admin/orders` → paid/processing order → **Create Shippo Label**

## Product weights

Shippo parcel size and weight come from **approved packing rules** in `src/lib/shippo/packing/rules.ts` (not generic product weight). See [SHIPPO-PACKING.md](./SHIPPO-PACKING.md) for the full table.

Unsupported products use flat-rate shipping at checkout and cannot auto-create Shippo labels.

## Test mode

Use Shippo **test** API keys (`shippo_test_...`) for development. Labels in test mode are not billable and may show sample tracking numbers.

## Going live

1. Switch to live Shippo API key in Vercel
2. Confirm warehouse address (`SHIPPO_FROM_*`) is your real ship-from location
3. Connect carrier accounts in the Shippo dashboard (USPS, UPS, FedEx)
