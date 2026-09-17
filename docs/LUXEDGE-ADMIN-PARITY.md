# Luxedge admin → Himalayan Koh parity matrix

The mandate for this workstream was a **full clone of the Luxedge admin system into
Himalayan Koh**, not a visual resemblance: every Luxedge admin route needs a
Himalayan Koh equivalent, with the interaction patterns preserved and the data
adapters pointed at WooCommerce instead of Supabase.

Reference: `8002salman-ai/luxedge-website` (React + Vite SPA; admin in
`src/admin/`, ~22.7k LOC across 19 modules, one 6,243-line `AdminSection.tsx`
shell holding 31 routes, Supabase repository + 30 serverless endpoints).
Target: this repository, branch `integration/luxedge-full-admin`.

Read this with `docs/LUXEDGE-ADMIN-MIGRATION.md`, which records the inventory that
preceded the migration and the module-by-module classification.

## 1. Route parity

Every route in the Luxedge rail, and what it became here. `HK-only` rows are
screens this store needs that Luxedge has no counterpart for.

| Luxedge route | Himalayan Koh route | UI parity | Function parity | Backend | Status | Missing |
|---|---|---|---|---|---|---|
| `/admin` Dashboard | `/admin` | Yes — stat tiles, charts, low-stock, recent orders, quick actions | Partial | Catalog adapter + Supabase orders | Live | Woo-backed revenue/orders; widgets that need a source say so |
| `/admin/products` | `/admin/products` | Yes | Read yes / write blocked | WooCommerce catalog adapter | Live read | `woo-write` for add/edit/duplicate/variations |
| `/admin/promotions` | `/admin/promotions` | Yes | No | WooCommerce coupons (unreachable) | Pending | `woo-rest-read`, `woo-write` |
| `/admin/gift-drop` | `/admin/gift-drop` | Yes | Configuration only | No claim store | Pending | Claim table + inventory decrement |
| `/admin/campaigns` | `/admin/campaigns` | Yes | Drafting + real catalog targeting | Catalog adapter | Partial | `email-send`, `woo-write` |
| `/admin/orders` | `/admin/orders` | Yes | Yes | Supabase orders (existing) | Live | Migration of orders to WooCommerce |
| `/admin/users` | `/admin/users` | Yes | Read + own-account | Supabase auth/profiles | Partial | Invite/disable/remove/reset (needs auth-admin key) |
| `/admin/categories` | `/admin/categories` | Yes | Read yes / write blocked | WooCommerce categories | Live read | `woo-write` |
| `/admin/reviews` | `/admin/reviews` | Yes | No | WooCommerce reviews | Pending | `woo-rest-read`, `woo-write` |
| `/admin/blogs` | `/admin/blog` | Yes | Yes | Supabase blog tables | Live | — |
| `/admin/media` | `/admin/media` | Yes | Read only | WordPress media via Woo auth | Pending | `woo-rest-read` (+ upload scope for writes) |
| `/admin/seo-engine` | `/admin/seo` | Yes | Live checks + Gemini flows | Own checks + Gemini (server) | Partial | `ai-text` for generation |
| `/admin/marketing` | `/admin/marketing` | Yes | Tab structure + honest pending | Catalog adapter | Partial | `ai-text`, `email-send` |
| `/admin/marketing-traffic` | `/admin/marketing-traffic` | Yes | **Working** UTM builder | None needed for the builder | Partial | `traffic-analytics` for sessions/channels |
| `/admin/email-marketing` | `/admin/email-marketing` | Yes | Composer only | Resend (existing lib) | Pending | `email-send` + verified domain |
| `/admin/crm` | `/admin/crm` | Yes | Yes (leads + HubSpot) | Supabase + HubSpot | Live | — |
| `/admin/variant-gen` | `/admin/variant-gen` | Yes — 3-step matrix | **Working** matrix maths | Catalog adapter | Partial | `woo-write` to create variations |
| `/admin/ai` | `/admin/ai` | Yes | Surface inventory | None needed | Partial | `ai-text` for the unwired surfaces |
| `/admin/ai-import` | `/admin/ai-import` | Yes — 4-step wizard | **Working** URL validation | None needed | Partial | `ai-text`, `woo-write` |
| `/admin/listing-task` | `/admin/listing-task` | Yes | **Working** defect queue | Catalog adapter | Live | `woo-write` to fix from the list |
| `/admin/scout` | `/admin/scout` | Yes | **Working** source validation | Catalog adapter | Partial | `ai-text`, `supplier-feed` |
| `/admin/product-research` | `/admin/product-research` | Yes | **Working** shelf composition | Catalog adapter | Partial | Demand data |
| `/admin/ai-control` | `/admin/ai-control` | Yes | Guardrails (read-only by design) | None needed | Partial | Settings write for a spend ceiling |
| `/admin/hermes-intel` AI Intelligence | `/admin/ai-intelligence` | Yes | Input inventory + catalog read | Catalog adapter | Partial | `ai-text`, traffic, Woo orders |
| `/admin/cj-setup` CJ Supplier | `/admin/suppliers` | Adapted | No | None | Partial | Supplier records (adapted: own-warehouse sourcing, not dropship) |
| `/admin/payments` | `/admin/payments` | Yes | **Working** for card config | `/api/stripe/config` (real) | Partial | `woo-rest-read` for gateways/tax |
| `/admin/settings` | `/admin/settings` | Yes | Yes | Supabase settings + env | Live | — |
| `/admin/settings/listing-playbook` | `/admin/listing-playbook` | Yes | **Working** checklist | None needed | Live | — |
| — | `/admin/customers` *(HK-only)* | — | Yes | Supabase | Live | Woo customer migration |
| — | `/admin/category-hubs` *(HK-only)* | — | Yes | Supabase | Live | — |
| — | `/admin/inventory` *(HK-only)* | — | Read only | Catalog adapter | Partial | `woo-rest-read` for counts |
| — | `/admin/coupons` *(HK-only)* | — | No | WooCommerce coupons | Pending | `woo-rest-read`, `woo-write` |
| — | `/admin/analytics` *(HK-only)* | — | Partial | Supabase orders | Live | Woo-backed figures |
| — | `/admin/labels` *(HK-only)* | — | Yes | Shippo | Live | — |
| — | `/admin/api-keys` *(HK-only)* | — | Yes | Supabase settings | Live | — |

**Counts:** Luxedge admin routes **28** (the 31 in its shell include 3
sub-screens of `/admin/products`), Himalayan Koh admin routes **35** (28 mapped +
7 store-specific). Full route parity: **yes** — no Luxedge destination is missing.

## 2. What is genuinely working today

Verification lives in the final report, but this is what can be exercised without a
credential:

- **Catalog read** — every product screen reads the same adapter the storefront
  serves, so the console and the shop cannot disagree.
- **UTM campaign-link builder** (`/admin/marketing-traffic`) — computes and
  normalises a tagged production URL; deterministic, no service needed.
- **Variant matrix** (`/admin/variant-gen`) — builds the exact combination list
  from the attributes entered, with a 200-combination ceiling.
- **Import URL validation** (`/admin/ai-import`) — rejects malformed URLs and the
  store's own host before anything is fetched.
- **Listing defect queue** (`/admin/listing-task`) — derives the fixable defects
  from what the source reported, and reports unreadable fields separately.
- **Shelf composition** (`/admin/product-research`) — per-category counts, priced
  counts and thin-shelf flags, computed from the live catalog.
- **Source validation** (`/admin/scout`) — watches list validation.
- **Card config** (`/admin/payments`) — reads the deployment's own Stripe config
  route: configured, mode, webhook. No key material is displayed.
- **Playbook checklist** (`/admin/listing-playbook`) — interactive, session-scoped.
- **Orders, customers, CRM, blog, labels, settings, API keys** — carried over from
  the existing admin and re-skinned.

## 3. Structure this branch established

Four layers, one owner each. Later passes extend these rather than adding a
parallel style:

| Layer | File | Owns |
|---|---|---|
| Visual system | `src/components/admin/adminTheme.ts` | every surface/control/table/chip/rail class |
| Primitives | `src/components/admin/AdminUI.tsx` | header, panel, stat tile, chip, notice, table, tabs, dialog, pending panel, controls |
| Shell | `src/components/admin/AdminLayout.tsx` | 1280px desktop canvas, always-visible rail, header, breadcrumb, search, session menu |
| Navigation | `src/lib/adminNav.ts` | the 35 destinations, their grouping, icons and `pending` flags |

Two supporting owners were added with the module work:

| Module | File | Owns |
|---|---|---|
| Capabilities | `src/lib/admin/capabilities.ts` | what each unwired capability requires and enables — the text every pending panel is built from |
| Catalog read hook | `src/lib/admin/useAdminCatalog.ts` | the load/stats/error cycle a screen uses when it needs the whole catalog |

**Rules the structure encodes**

1. A module never renders a figure it cannot source. Unknown is `Not connected`,
   `Unavailable`, `Price unavailable` or `source cannot report` — never `0`, and
   never a plausible-looking estimate.
2. `missing` on a catalog row means *the source cannot report this field*. It is a
   connection problem, not a listing defect, and the queue counts the two
   separately.
3. Writes that need `woo-write` are disabled with the reason attached, and never
   fall back to another database.
4. The admin is a desktop application: `min-width: 1280px`, no mobile drawer, no
   bottom bar, no table-to-card conversion. Horizontal scrolling below that width
   is the intended behaviour.
5. No credential is read in the browser. A key status shown in the UI would be a
   guess; screens state what they need instead.

## 4. Not done, in order of what unblocks the most

1. **`woo-write`** — products, variations, stock, coupons, categories. The largest
   single unblock; every disabled Save button in the console waits on it.
2. **`woo-rest-read`** — orders, customers, coupons, reviews, media, gateways,
   unit counts. Also the only way the two split-brain sources (Supabase orders vs
   Woo catalog) can be reconciled.
3. **Store API `/products` fatal on staging** — the reason price and SKU read as
   unavailable for every product, which cascades into campaign readiness,
   listing defects and research margins.
4. **`ai-text`** — SEO suggestions, listing copy, import research, intelligence.
5. **Auth administration** — invite, disable, remove, password reset. Needs the
   Supabase service-role path used by `verifyAdminRequest`, or a move to
   WordPress-identity for customers (see the master plan).
6. **Email sending + verified domain**, **traffic analytics**, **Search Console**,
   **AdSense** — all prepared as screens, none wired.
