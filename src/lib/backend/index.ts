/**
 * Backend abstraction layer.
 *
 * The single source of catalog data. Application code imports from here rather
 * than from `lib/supabase` or a WordPress client directly, so the storefront can
 * move from Supabase to WordPress/WooCommerce with a flag change instead of a
 * rewrite. See docs/WORDPRESS-WOOCOMMERCE-MIGRATION.md.
 *
 * Only the names the app actually calls are re-exported. The layer's internals
 * stay reachable by direct import for tests and diagnostics, so the public
 * surface here stays small enough to audit.
 */

export { isSupabaseDataSource } from './config';

export {
  getCatalogProducts,
  getFeaturedCatalogProducts,
  lookupCatalogProduct,
  type CatalogLookup,
  type CatalogQuery,
  type CatalogResult,
} from './products';
