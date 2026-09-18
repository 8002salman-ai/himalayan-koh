/**
 * Central backend configuration — the public facts only.
 *
 * The migration from Supabase to WordPress/WooCommerce is staged, so the data
 * source is a flag rather than a rewrite. Default stays 'supabase': flipping it
 * must be a deliberate, reversible act, and the Supabase path stays intact as
 * the rollback target until WooCommerce parity is verified.
 *
 * Credentials are NOT here. They live in `./credentials`, which only server
 * modules import, because this file is reachable from client components and
 * every "no secret in the browser bundle" rule needs a structural owner rather
 * than a convention. The data-source flag it re-exports has its own module
 * (`./dataSource`) for the same reason: a client component that wants the flag
 * should not pull the origin and timeout in with it.
 */

import { dataSource, resolveDataSource } from './dataSource';

import type { DataSource } from './dataSource';

export { resolveDataSource };
export type { DataSource };

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

export const backendConfig = {
  /** 'supabase' (default, rollback target) or 'woocommerce'. */
  dataSource,
  wordpressBaseUrl,
  woocommerceBaseUrl,
  /** WordPress REST API root, e.g. https://example.com/staging/wp-json */
  get wordpressApiRoot(): string {
    return wordpressBaseUrl ? `${wordpressBaseUrl}/wp-json` : '';
  },
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

