/**
 * WordPress PHP-fatal detection — the single owner.
 *
 * Both the storefront (`wordpress.ts`) and the read-only diagnostic script
 * (`scripts/check-wordpress-setup.mjs`) must recognise the same response, and
 * this is the migration's most important diagnostic: a WordPress fatal returns
 * HTTP 500 with an HTML page rather than JSON, so a plain `JSON.parse` reports a
 * baffling "Unexpected token '<'" instead of naming the real cause. Two copies
 * of this predicate had already drifted apart.
 *
 * Plain ESM rather than TypeScript because the check script runs directly under
 * Node with no build step; living as a `.mjs` lets both import one
 * implementation instead of maintaining parallel ones.
 */

/**
 * Detects a WordPress PHP fatal / wp_die() page.
 *
 * WordPress renders these as an HTML document titled "WordPress › Error" with
 * "There has been a critical error on this website." — the exact response the
 * staging `/wc/store/v1/products` route currently returns.
 *
 * @param {string} body
 * @returns {boolean}
 */
export function looksLikeWordPressFatal(body) {
  if (!body) return false;
  const normalised = body.toLowerCase();
  return (
    normalised.includes('there has been a critical error on this website') ||
    normalised.includes('wp-die-message') ||
    (normalised.includes('<html') &&
      normalised.includes('wordpress') &&
      normalised.includes('error-page'))
  );
}

/**
 * True when a body is an HTML document rather than JSON.
 *
 * @param {string} body
 * @returns {boolean}
 */
export function looksLikeHtml(body) {
  return /^\s*<(!doctype|html)/i.test(body || '');
}
