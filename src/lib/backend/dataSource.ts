/**
 * Which backend serves catalog and commerce reads — the flag alone.
 *
 * Split out of `./config` so that a *client* component can ask this question
 * without pulling the whole backend configuration into its bundle. Measured on the
 * built output: with the flag living in `./config`, the homepage and `/products`
 * chunks each carried the WordPress REST root, the WooCommerce base URL and the
 * `WOOCOMMERCE_CONSUMER_KEY` / `_SECRET` reads — server-only values that must
 * never be shipped, packed next to the flag that was all either page wanted.
 *
 * The value is `NEXT_PUBLIC_DATA_SOURCE`, so it is public by construction; the
 * config module imports this one rather than keeping a second copy of the rule.
 */

/** Which backend serves catalog/commerce reads. */
export type DataSource = 'supabase' | 'woocommerce';

/**
 * Maps a raw `NEXT_PUBLIC_DATA_SOURCE` value to a data source.
 *
 * Pure and exported so the default can be pinned by a test without depending on
 * whatever the environment happens to hold. The previous test asserted the
 * ambient default, so it failed for anyone who followed the migration doc and
 * set the flag — the exact state that doc tells a developer to reach.
 */
export function resolveDataSource(raw: string | undefined): DataSource {
  return (raw || '').trim().toLowerCase() === 'woocommerce' ? 'woocommerce' : 'supabase';
}

/** The configured source. 'supabase' stays the default (and the rollback target). */
export const dataSource: DataSource = resolveDataSource(process.env.NEXT_PUBLIC_DATA_SOURCE);

/** True when the storefront should read catalog data from WordPress/WooCommerce. */
export function isWooCommerceDataSource(): boolean {
  return dataSource === 'woocommerce';
}

/**
 * True when Supabase is still the catalog source (the default, and the
 * rollback target). Views use this to decide whether Supabase-specific
 * behaviour — the bundled demo catalog and realtime invalidation — applies.
 */
export function isSupabaseDataSource(): boolean {
  return dataSource === 'supabase';
}
