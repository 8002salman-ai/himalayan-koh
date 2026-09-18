# Himalayan Koh niche audit — Himalayan pink salt only

Read live from the WordPress/WooCommerce **staging** install on **2026-09-17**:

```
GET https://himalayankoh.com/staging/wp-json/wp/v2/product?per_page=20&status=publish
GET https://himalayankoh.com/staging/wp-json/wp/v2/product_cat?per_page=30
GET https://himalayankoh.com/staging/wp-json/wc/store/v1/products?per_page=1   → HTTP 500
```

**Production was not read or written. Nothing was deleted, archived or hidden in
WooCommerce by this work.** WooCommerce stays the owner of the catalog; this
document records what it holds and what the storefront does about it.

## 1. The catalog as it stands — 11 published products

| # | ID | Product | WooCommerce category | Pink salt? | Shelf | Action |
|---|----|---------|----------------------|-----------|-------|--------|
| 1 | 2461 | Himalayan Koh Edible Pink Salt | Uncategorized | Yes | Edible Pink Salt | Keep |
| 2 | 2446 | Himalayan Koh Edible Pink Salt Jar | Uncategorized | Yes | Edible Pink Salt | Keep |
| 3 | 2321 | Himalayan Koh Pink Salt Pouches | Uncategorized | Yes | Edible Pink Salt | Keep |
| 4 | 2185 | Himalayan Chef Himalayan Pink Salt Fine Grain, Jar-1 lbs | Uncategorized | Yes | Edible Pink Salt | Keep |
| 5 | 2192 | Himalayan Chef Himalayan Pink Salt Coarse Grain, Jar-1 lbs | Uncategorized | Yes | Edible Pink Salt | Keep |
| 6 | 2295 | HIMALAYAN CRYSTAL ROCK SALT LAMP IONIZER AIR PURIFIER WITH DIMMABLE CONTROL | Uncategorized | Yes | Salt Lamps & Décor | Keep |
| 7 | 2372 | HIMALAYAN ROCK SALT BAG 18 LBS | Bulk Order | Yes | Bulk & Wholesale | Keep |
| 8 | 2367 | HIMALAYAN SALT POUCHES | Bulk Order | Yes | Bulk & Wholesale | Keep |
| 9 | 2352 | SALT LICKS | Bulk Order | **No** | — | Remove from storefront |
| 10 | 286 | Himalayan Pink Salt Block for Deer | animal feed | **No** | — | Remove from storefront |
| 11 | 281 | Himalayan Koh Salt Licks for Horses | animal feed | **No** | — | Remove from storefront |

Totals: **11 products — 8 pink salt, 3 unrelated (livestock feed).**

Two of the three unrelated products are also filed under the `animal feed`
category; `SALT LICKS` (2352) sits under `Bulk Order` and is only identifiable
from its name, which is why the guard judges a product on its name *and* its
category rather than on either alone.

### Category terms as reported

| Term ID | Name | Slug | Reported count |
|---------|------|------|----------------|
| 58 | animal feed | animal-feed | 3 |
| 105 | Bulk Order | bulk-order | 0 |
| 75 | Uncategorized | uncategorized | 3 |

The term counts do not match the published rows (six products carry term 75, and
only two carry term 58), so they are not used as a source of truth anywhere. All
counting in the app is derived from products.

There is also no `Salt Lamps & Décor`, `Bath & Wellness` or `Gift Sets` term yet —
those shelves exist as storefront taxonomy in `src/lib/catalog/niche.ts` and fill
as stock arrives. No empty WooCommerce category is created to match them.

## 2. What the storefront does about the three unrelated rows

`src/lib/catalog/niche.ts` is the single judgement about what the shop sells. It
is applied at **one** seam, `getCatalogProducts()` in `src/lib/backend/products.ts`,
which every public read already goes through — the shop grid, search, the
homepage's featured row, related products, the product detail page, category
hubs, the sitemap and structured data. A product is withheld on its name or its
category, so a neutrally named row filed under `animal feed` is caught too.

Deliberately **not** done:

- No classifier or score. A product leaves the guard by being renamed,
  recategorised or archived in WooCommerce — a human act with a human reason.
- No automatic deletion or archiving. The owner archives in WooCommerce.
- No hiding from the admin console. `readCatalogProducts()` returns the whole
  catalog, because the console is where the three have to be *seen* in order to
  be archived. The console marks each one `Outside pink salt niche`.

Verified against the live staging store with the real code path
(`src/lib/backend/wordpress.integration.test.ts`, 8 tests, all passing):

```bash
BACKEND_INTEGRATION=1 NEXT_PUBLIC_DATA_SOURCE=woocommerce \
  NEXT_PUBLIC_WORDPRESS_BASE_URL=https://himalayankoh.com/staging \
  npx vitest run src/lib/backend/wordpress.integration.test.ts
```

- storefront read returns **8** products, none of them livestock, with a warning
  naming what was withheld;
- admin read returns **11**, including `salt-licks`, `salt-licks-for-horses` and
  `block-of-salt`;
- requesting a withheld slug directly resolves to **nothing** rather than to the
  product.

### Owner action

Archive products **2352**, **286** and **281** in WooCommerce staging (Products →
the row → Move to trash), and delete or rename the `animal feed` term once
nothing is filed under it. The storefront guard clears itself the moment they are
gone — the warning disappears from the storefront source and the console banner
stops appearing. Nothing needs to be changed in code.

## 3. Live stock — what the routes can and cannot report

Live stock is a hard requirement, and today the staging install cannot deliver
it. Measured on 2026-09-17:

| Route | Result |
|-------|--------|
| `/wp-json/wc/store/v1/products` | **HTTP 500** — WordPress PHP fatal (`WP_DEBUG_DISPLAY` off, so the page carries no detail) |
| `/wp-json/wc/v3/products` | Not attempted — needs a consumer key/secret pair, which is not configured |
| `/wp-json/wp/v2/product` | HTTP 200, but the post type exposes **no** price, SKU or stock |

So every product currently reads `stockStatus: 'unknown'` and no unit count, and
the storefront says so rather than implying availability: no `In stock` claim, no
quantity ceiling, and Add to Cart is off for an unreported stock state.

What is already wired, so that the moment either route reports stock it flows to
both surfaces without further code changes:

- the Store API mapper reads `stock_availability.remaining` and the REST v3
  mapper reads `stock_quantity` — into the product model's `stockQuantity`, and
  only when the number is real (`null`/`undefined`/`NaN`/negative all stay
  `null`, so untracked stock never becomes a zero);
- the product page caps a cart line at that count and disables the stepper at the
  limit;
- the admin catalog row and the inventory figures read the same field from the
  same read, so the console and the storefront cannot disagree.

Two owner tasks unblock it:

1. **Fix the Store API fatal on staging.** Enable `WP_DEBUG=true`,
   `WP_DEBUG_LOG=true`, `WP_DEBUG_DISPLAY=false` in `wp-config.php`, hit
   `/wp-json/wc/store/v1/products?per_page=1` once, then read
   `wp-content/debug.log` through cPanel for the exact plugin/theme, file and
   line. That is the real fix; nothing in this repo can substitute for it.
2. **Or provide a staging WooCommerce REST v3 read key**
   (`WOOCOMMERCE_CONSUMER_KEY` / `WOOCOMMERCE_CONSUMER_SECRET`, server-side only,
   never `NEXT_PUBLIC_`). REST v3 is already the first read the adapter tries, so
   price, SKU and stock come alive as soon as the pair exists.

Until one of those lands, "live stock" is honestly reported as unknown — not as
in stock.

## 4. Livestock-era copy: what was rewritten, what is left

**Rewritten in this pass** (each verified in a production build served locally in
WooCommerce mode — see the run in §6):

| Where | Before | Now |
|-------|--------|-----|
| `/` homepage hero, benefits, cards, imagery | "World's Best for Livestock", cattle/horse paragraphs, a horse photo | "Pure Himalayan Pink Salt", unrefined-salt copy, salt imagery |
| `/about` page + metadata | livestock mission, "Healthier Livestock", milk-production card, horse photo | unrefined-salt story, 84-minerals and grain-size cards |
| `/gallery` page + metadata | "benefits livestock across ranches", Horses/Cattle filters, horse and cattle photographs | salt photographs only; filters derived from the images themselves |
| `/blog` page + metadata | "Expert insights on livestock health" | salt-focused framing (see the seeded posts note below) |
| `/products?category=…` hubs | four livestock hubs with livestock copy | four pink-salt shelves, livestock hubs retired |
| topbar, footer | "Himalayan salt for horses, cattle and deer" | pink salt for the kitchen, table and home |
| product page metadata + FAQ schema | "for livestock and cooking", salt-lick FAQs, veterinary advice, blood-pressure claim | salt FAQs: colour, grain size, additives, storage |
| `Organization` schema description | "for livestock and edible use" | unrefined pink salt for cooking and the home |
| AI assistant prompts and system prompt | livestock salt guidance, horse/cattle categories | pink-salt shelves only, told never to name a product it was not given |
| legacy redirects | livestock product and service URLs → livestock hubs | retired URLs → the salt shelves that replaced them |

**Left, and tracked rather than finished:**

| File | What is left | Why it is not urgent |
|------|--------------|----------------------|
| `src/data/products.ts` | the bundled demo catalogue keeps livestock names, descriptions and gallery copy | the raw list is never served (`storefrontProducts` is), and no backend is configured it is local-dev fallback only; the residue is prose, not catalogue scope |
| `src/lib/categoryContent/blogArticles.ts`, `pdpContent/articles.ts`, seeded `blogPosts` | seeded editorial placeholders on herd and equine topics | these are demo posts; the live `/blog` reads Supabase `blog_posts`, which the owner curates |
| `src/lib/images/legacyAssets.ts` | asset *names* (`horseLick`, `cattleGrazing`) still exist for images no longer referenced | renaming files is a chore with no visible effect |
| `src/lib/products/productContent.ts` | slug overrides for retired livestock SKUs | only reached if that exact old slug is requested, which the guard then withholds |
| `src/lib/shippo/packing/rules.ts` | packing rules keyed by retired livestock slugs | shipping config, not storefront content; harmless while those products do not exist |

## 5. Owner actions (WooCommerce staging — no code required)

1. **Archive products 2352, 286, 281** (see §1). The storefront warning and the
   console banner clear themselves once they are gone.
2. **Replace the featured image on product 2372** (`HIMALAYAN ROCK SALT BAG 18
   LBS`). Its WooCommerce media is `2021/03/himalayan-salt-lump-cattle4.jpg` — an
   old livestock photograph — and because the storefront must not invent images,
   that photo is what a customer sees on the bulk salt card today. Upload a salt
   photograph and set it as the product image.
3. **Fix the Store API fatal** or **provide a staging REST v3 read key** (§3) to
   turn on live price and stock.
4. **Delete or rename the `animal feed` category** once nothing is filed under it,
   so it cannot reappear in any category listing.

## 6. Checks run

```bash
npx tsc --noEmit                     # clean
npm run lint                         # 0 errors
npm test                             # 128 passed, 8 skipped (integration)
BACKEND_INTEGRATION=1 … npx vitest run src/lib/backend/wordpress.integration.test.ts
                                     # 8 passed against live staging
NEXT_PUBLIC_DATA_SOURCE=woocommerce … npm run build
                                     # 67 routes compiled
npm run start -- -p 3032             # production build, WooCommerce mode
```

Against that production server: `/products` renders 3 pills and 8 salt products
with no livestock name anywhere in the DOM; `/products/salt-licks` answers
"Product Not Found" with no Add to Cart; `/products?category=lamps-decor` is
`index, follow`; `/products?category=cooking-serving` (a shelf with no stock yet)
is `noindex, nofollow`; `/sitemap.xml` lists the 3 stocked shelves and 8 products
and no livestock URL.

**Temporary deployment.** `https://himalayan-koh-admin-verify.vercel.app` carries
this branch publicly (`X-Robots-Tag: noindex, nofollow`, `robots.txt` Disallow,
host listed in `PREVIEW_HOSTS` for the life of the alias). Its Preview
environment has **no WooCommerce data source configured**, so its catalog renders
empty rather than live: inspecting the salt-only catalog needs the local
production build in WooCommerce mode (recipe in §6), and configuring that
deployment would mean changing env vars the working `preview.himalayankoh.com`
deployment also runs on — out of scope for this pass.

One observation worth recording: in **`next dev`** the raw WordPress
`/wp/v2/product` JSON — all 11 products — appears in the page source, because
Next's dev-mode fetch instrumentation streams server response bodies. It is a
dev-only artifact: the production build served locally contains none of it. The
rendered DOM is correctly scoped in both modes.

## 7. Structure this pass leaves behind

- `src/lib/catalog/niche.ts` — **one owner** of the niche: admission
  (`isNicheProduct`, `isOffNicheText`, `isNicheCategory`) and the shelf taxonomy
  (`NICHE_SECTIONS`, `nicheSectionKeyFor`, `sectionsWithProducts`).
- `src/lib/categoryContent/keys.ts` — a routing adapter over that taxonomy:
  filter pills, `?category=` values, retired values, title → path. It holds no
  taxonomy of its own and declares no labels that `niche.ts` does not own.
- `src/lib/backend/products.ts` — one seam, two reads: `getCatalogProducts`
  (storefront, scoped) and `readCatalogProducts` (admin, complete).
- `src/lib/categoryContent/registry.ts`, `blogMapping.ts`,
  `src/lib/products/productContent.ts` — content keyed by shelf, so a page, a
  meta description and a content block cannot be filed on different shelves.
