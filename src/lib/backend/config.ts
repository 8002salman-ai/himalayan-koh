/**
 * Central backend configuration.
 *
 * The migration from Supabase to WordPress/WooCommerce is staged, so the data
 * source is a flag rather than a rewrite. Default stays 'supabase': flipping it
 * must be a deliberate, reversible act, and the Supabase path stays intact as
 * the rollback target until WooCommerce parity is verified.
 */

/** Which backend serves catalog/commerce reads. */
export type DataSource = 'supabase' | 'woocommerce';

function normaliseBaseUrl(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

/**
 * Server-only value wins so a deployment can point the server at an internal
 * or staging origin without shipping it to the browser. The public var is the
 * fallback because the WordPress/WooCommerce read endpoints used by the
 * storefront are public (no secrets), and client components need the origin.
 */
const wordpressBaseUrl = normaliseBaseUrl(
  process.env.WORDPRESS_BASE_URL || process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL
);

const woocommerceBaseUrl = normaliseBaseUrl(
  process.env.WOOCOMMERCE_BASE_URL ||
    process.env.NEXT_PUBLIC_WOOCOMMERCE_BASE_URL ||
    // WooCommerce lives in the same WordPress install unless told otherwise.
    wordpressBaseUrl
);

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

export const backendConfig = {
  /** 'supabase' (default, rollback target) or 'woocommerce'. */
  dataSource: resolveDataSource(process.env.NEXT_PUBLIC_DATA_SOURCE),
  wordpressBaseUrl,
  woocommerceBaseUrl,
  /** WordPress REST API root, e.g. https://example.com/staging/wp-json */
  get wordpressApiRoot(): string {
    return wordpressBaseUrl ? `${wordpressBaseUrl}/wp-json` : '';
  },
  /**
   * WooCommerce REST API consumer credentials. Server-only: a consumer
   * secret grants full store access, so it must never reach the browser via a
   * NEXT_PUBLIC_ variable. Empty here means "use the public Store API only",
   * which cannot read price or stock.
   */
  consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
  /** Default read timeout for backend calls, in ms. */
  requestTimeoutMs: Number(process.env.WORDPRESS_REQUEST_TIMEOUT_MS || 12000),
};

/** True when the storefront should read catalog data from WordPress/WooCommerce. */
export function isWooCommerceDataSource(): boolean {
  return backendConfig.dataSource === 'woocommerce';
}

/**
 * True when Supabase is still the catalog source (the default, and the
 * rollback target). Views use this to decide whether Supabase-specific
 * behaviour — the bundled demo catalog and realtime invalidation — applies.
 */
export function isSupabaseDataSource(): boolean {
  return backendConfig.dataSource === 'supabase';
}

/** True when WooCommerce REST credentials are present (enables price/stock reads). */
export function hasWooCommerceCredentials(): boolean {
  return Boolean(backendConfig.consumerKey && backendConfig.consumerSecret);
}

/** The configuration facts readiness depends on, so the rule can be tested directly. */
export interface BackendReadinessInput {
  wordpressApiRoot: string;
  consumerKey: string;
  consumerSecret: string;
}

/**
 * Why a given configuration can or cannot serve a full catalog. Pure, so both
 * the blocked and the ready answer can be pinned in a test; the ambient
 * wrapper below passes the running configuration in.
 */
export function describeReadiness(input: BackendReadinessInput): { ready: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!input.wordpressApiRoot) {
    blockers.push('WORDPRESS_BASE_URL is not set — no WordPress/WooCommerce origin configured.');
  }
  if (!(input.consumerKey && input.consumerSecret)) {
    blockers.push(
      'WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET are not set — price and stock cannot be read from any public endpoint (the public Store API products route is currently failing on staging).'
    );
  }
  return { ready: blockers.length === 0, blockers };
}

/**
 * Describes why the current configuration can or cannot serve a full catalog.
 * Used by diagnostics and by the degraded-mode warnings the UI surfaces.
 */
export function describeBackendReadiness(): { ready: boolean; blockers: string[] } {
  return describeReadiness({
    wordpressApiRoot: backendConfig.wordpressApiRoot,
    consumerKey: backendConfig.consumerKey,
    consumerSecret: backendConfig.consumerSecret,
  });
}
