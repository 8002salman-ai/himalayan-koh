# AGENT-HANDOFF — Himalayan Koh

This is the canonical handoff file for all coding agents (**Freebuff**, **Codex**, **Antigravity**).
Every coding agent must read this file **FIRST** before touching any code.
Every completed task must update this file **BEFORE** final commit.

---

## 1. Project Metadata & Deployment State

* **PROJECT PATH**: `C:\Users\basco\Downloads\hk\himalayan-koh`
* **BRANCH**: `integration/cloudflare-workers-migration`
* **LOCAL HEAD**: `b0b8cfd24047880360746675c4a063353caac741`
* **GITHUB HEAD**: `b0b8cfd24047880360746675c4a063353caac741`
* **LIVE WORKER SHA**: `b0b8cfd24047880360746675c4a063353caac741`
* **LAST VERIFIED DATE**: September 19, 2026
* **PRIMARY STAGING URL**: `https://preview.himalayankoh.com`
* **ROLLBACK / REFERENCE URL**: `https://himalayan-koh.vercel.app`
* **PRODUCTION STATUS**: `https://himalayankoh.com` is **STRICT READ-ONLY / UNTOUCHED**.

---

## 2. Current Architecture

* **WooCommerce (`https://himalayankoh.com/staging`)**: Source of truth for products, categories, orders, coupons, and inventory. All public catalog and checkout actions flow through WooCommerce REST v3 APIs (`/api/catalog`, `/api/orders/*`, `/api/admin/catalog`).
* **Supabase**: Source of truth for customer authentication, user accounts/profiles, session management, and application-specific state (e.g. blog, reviews, CRM leads). Admin role is determined via `app_metadata.role` or authorized admin email (`8002salman@gmail.com`).
* **OpenRouter**: Customer-facing conversational AI assistant.
* **Gemini**: Admin SEO Engine AI & content generation.
* **Cloudflare Workers (`vinext-cloudflare`)**: Primary hosting infrastructure serving `preview.himalayankoh.com` via KV cache (`VINEXT_KV_CACHE: 7e62970fbe5049dfb678409d6f28d064`).
* **Vercel**: Preserved strictly as rollback / visual reference.

---

## 3. Last Completed Work

* **Full Luxedge Admin Port**: Ported all 19 Luxedge admin modules, layout, components, and tools into `himalayan-koh`.
* **Authentic Luxedge AdminLayout Shell**: Overwrote `src/components/admin/AdminLayout.tsx` with the emerald-gradient sidebar, collapsible sections, Phosphor icon badges, and mobile drawer.
* **Auth Bridge & Session Persistence**: Updated `src/services/supabase.ts` (`readStoredSession`) and `src/context/AuthContext.tsx` (`roleFromUser`) to ensure seamless admin authentication using Himalayan Koh's Supabase session storage.
* **Canonical `/returns` Route**: Created `src/app/(main)/returns/` (matching all footer/internal links and SEO schema), with permanent 308 redirect from legacy `/return` and `/return-policy`.
* **Product Flicker Elimination**: Addressed SSR and hydration layout shifts across `/products` and `/admin/products`.
* **AdminRoute Instant Navigation & Spinner Elimination**: Fixed the "Loading admin panel..." hang on admin link clicks. Decoupled `isAdmin` from `profileLoading` so verified admins enter all `/admin/*` views immediately without being blocked by background profile fetches. Enabled synchronous session hydration in `AuthContext` from cached `localStorage` sessions and added `basco.pk@gmail.com` to admin recognition.
* **OpenRouter AI Integration with Gemini 2.5 Flash**: Configured owner-provided OpenRouter API key and set `google/gemini-2.5-flash` as primary model with automatic fallbacks (`google/gemini-2.5-flash-lite`, `openrouter/free`). Deployed secrets directly to Cloudflare Worker.
* **Admin Products & Categories Live Integration**: Connected `/admin/products` and `listProducts()`/`listCategories()` in `src/features/catalog/repository.ts` directly to the live WooCommerce catalog via `/api/admin/catalog` with fallback to `/api/catalog`. All 18 products with names, prices, SKUs, and categories now load accurately in the Admin Console without relying on the empty Supabase `products` table.
* **Admin Route Audit**: Verified all 14 primary admin routes return HTTP 200, and all admin write APIs strictly require authenticated admin tokens (anonymous requests return HTTP 401).

---

## 4. Current Known Issues

* **Admin Product Writes Blocked by Policy**: Direct write access in `CatalogAdmin.tsx` / `ProductEditorModal.tsx` remains intentionally blocked until a dedicated, fully audited WooCommerce REST write pipeline is validated for mutations (to avoid stale Supabase writes).
* **Draft Products in WooCommerce**: 14 legacy draft products without SKUs exist in WooCommerce staging (these do not display on the public storefront).
* **Vercel Preview Build Incompatibility**: Vercel preview branch deployment experiences a post-build bundling issue due to vinext/edge-runtime differences; Cloudflare Worker staging is primary.

---

## 5. Owner Dependencies

* Final owner approval required before executing production cutover or DNS changes.
* Shippo and Stripe live credentials must remain in test mode on staging.
* Dedicated return facility address instructions: policy directs customers to contact `sales@himalayankoh.com` or `(832) 224-6466` for RMA authorization prior to return shipments.

---

## 6. Next Safe Task

* Wire WooCommerce REST write endpoints (`POST /wp-json/wc/v3/products`) into the admin product editor modal to allow creating and editing products directly against WooCommerce staging.

---

## 7. Mandatory Single-Writer Rule

Only **ONE** coding agent may modify this repository at a time.
Never force push (`git push -f`), hard reset (`git reset --hard`), or rewrite shared history.
Always verify `git status` and pull before starting new tasks.
