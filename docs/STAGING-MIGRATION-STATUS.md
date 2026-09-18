# Staging migration status

Branch `integration/cloudflare-workers-migration`. Staging backend is WooCommerce
at `https://himalayankoh.com/staging`. Production is read-only throughout.

- Deployed Worker (staging): `https://himalayan-koh-ecommerce.8002salman.workers.dev`
- Deployment method: `vinext` + Cloudflare Workers (see `CLOUDFLARE-MIGRATION.md`)
- Cutover target: `preview.himalayankoh.com` — **not switched yet**

## Environment / secret matrix

Sources: the local repo env files, the Vercel project env, and the Cloudflare
Worker's secret bindings. Values are never recorded here.

| Variable | Current source | Public/server | Test/live | Used by | Cloudflare destination | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | repo + `wrangler.jsonc` vars | public | — | canonicals, JSON-LD, sitemap | `wrangler.jsonc` `vars` | set |
| `NEXT_PUBLIC_DATA_SOURCE` | repo | public | — | catalog source switch | `vars` | set (`woocommerce`) |
| `NEXT_PUBLIC_WOOCOMMERCE_BASE_URL` | repo | public | staging | client-side Woo calls | `vars` | set |
| `NEXT_PUBLIC_WORDPRESS_BASE_URL` | repo | public | staging | blog/content reads | `vars` | set |
| `WOOCOMMERCE_CONSUMER_KEY` | repo | **server** | staging | product/admin writes | `wrangler secret put` | set |
| `WOOCOMMERCE_CONSUMER_SECRET` | repo | **server** | staging | product/admin writes | `wrangler secret put` | set |
| `WOOCOMMERCE_BASE_URL` | repo | **server** | staging | server-side REST | `wrangler secret put` | set |
| `WORDPRESS_BASE_URL` | repo | **server** | staging | server-side WP REST | `wrangler secret put` | set |
| `SHIPPO_API_KEY` | repo | **server** | ⚠️ **LIVE** | rates, labels | `wrangler secret put` | set — **not exercised** |
| `SHIPPO_FROM_*` | repo | server | live | parcel origin | `wrangler secret put` | set (matches approved address) |
| `SUPABASE_SERVICE_ROLE_KEY` | repo | **server** | live | auth/admin, legacy commerce | `wrangler secret put` | set — **retained, see gap below** |
| `SUPABASE_DB_URL` | repo | **server** | live | migrations | `wrangler secret put` | set |
| `NEXT_PUBLIC_SUPABASE_URL` | repo | public | live | supabase-js client | `vars`/secret | set (public by design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | repo | public | live | supabase-js client | `vars`/secret | set (RLS-protected, public by design) |
| `NEXT_PUBLIC_SHIPPO_ENABLED` | repo | public | — | shipping UI switch | secret | set |
| `NEXT_PUBLIC_WHOLESALE_ENABLED` | repo | public | — | wholesale UI switch | secret | set |
| `STRIPE_SECRET_KEY` | — | server | — | payments | `wrangler secret put` | **MISSING — never configured** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | — | public | — | card form | `vars` | **MISSING — never configured** |
| `STRIPE_WEBHOOK_SECRET` | — | server | — | webhook verification | `wrangler secret put` | **MISSING — never configured** |
| `VERCEL_OIDC_TOKEN` | repo `.env.local` | server | — | Vercel-only runtime auth | none | **Vercel-only; drop on cutover** |
| `GOOGLE_SITE_VERIFICATION` | — | server | — | Search Console meta tag | `wrangler secret put` | placeholder added, value owed by owner |
| `NEXT_PUBLIC_ADSENSE_ENABLED` | — | public | — | ad seam | `vars` | defaults `false` (off) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | owner (AdSense) | public | live | ad seam | `vars` | known to owner; not activated |

Nothing above is committed. The credential file the owner supplied lives **outside
the git repository** (parent directory), and `.env.local`, `.dev.vars` and
`.dev.vars.*` are gitignored.

## Verified on the deployed Worker

Full suite, commit `4fbc39f` (`/api/version` reports the same SHA):

- 25/25 routes answer; `/checkout` now renders a real checkout page (it used to be
  shadowed by a legacy redirect — see the commit for the cause).
- Noindex on every route including `/`; `robots.txt` disallows all.
- Public niche sweep: 0 forbidden matches. Public secret sweep: 0 matches.
- Catalog: 18 authorised SKUs public with live Woo prices; 0 duplicate SKUs.
- Crafted URLs for retired livestock products still 308 to the catalogue.

## Open blocker: the checkout chain is not verifiable

`product → cart → checkout → Stripe → Woo order → My Orders → Shippo` was **not**
verified, and cannot be, for two separate reasons:

1. **No Stripe credentials exist at all** — not in the repo env, not in the Vercel
   project, not in the Worker. There is no test key to charge and no publishable
   key to render a card form.
2. **The only Shippo key is a live key** (`shippo_live_…`). Per the owner's own
   instruction, a live-only shipping credential means the integration test stops
   and is reported rather than exercised.

Independently of credentials, the write path for orders is still Supabase: cart,
`orders/create`, `stripe/create-payment-intent`, `stripe/webhook`,
`shippo/create-label` and `lib/orders/serverCreateOrder.ts` all read and write the
legacy database. WooCommerce is authoritative for products, prices, stock,
categories and coupon/order *reads*; it is **not** yet the order write target. That
is a dual source of truth and is recorded here rather than quietly left.

## Owner decisions outstanding

1. **Legacy products still published beside the authorised SKUs.** Five records
   remain in the public catalog that the price list supersedes, at *different
   prices*: `2446` (16 oz jar, $9.95), `2321` (pouches, $17.95), `2461`
   ($9.95–$17.95), `2372` ($34.57, out of stock), `2352` / `SALT LICKS`
   ($4.52–$7.75, out of stock). Archiving them is a one-line change to the
   provisioning script, but nothing was deleted or drafted without approval.
2. **`HK-LFH-6lbs` price conflict** — the workbook disagrees with itself. Created
   as `draft`, flagged `OWNER PRICE CONFIRMATION REQUIRED`, not published.

## Rollback state (captured before any cutover)

`preview.himalayankoh.com` is a **DNS-only (unproxied) CNAME**:

```
id      2d8c5d2efab86a18e0331b096e25ccfa
type    CNAME
content cname.vercel-dns.com
proxied false
comment "Vercel preview storefront (noindex-guarded)"
```

Reverting the cutover means restoring exactly that record. Apex `A`, `www` CNAME,
MX (`*.jellyfish.systems`) and the SPF/DKIM TXT records are untouched by this
migration and must stay untouched.
