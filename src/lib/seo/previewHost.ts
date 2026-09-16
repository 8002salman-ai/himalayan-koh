/**
 * Hosts that serve this storefront outside production.
 *
 * `preview.himalayankoh.com` is a second domain pointed at the *same*
 * production deployment, so a preview request and a production request render
 * byte-for-byte identical HTML — nothing exists at build time to branch on.
 * That rules out putting the noindex guard in `generateMetadata`: reading the
 * request's host there is a dynamic API call, which would opt every public
 * route that is currently prerendered (`/`, `/about`, `/contact`, … — 38 of
 * them) into on-demand server rendering.
 *
 * So the guard is applied per request at the HTTP layer instead, keyed off
 * this list: `next.config.ts` sets `X-Robots-Tag: noindex, nofollow` for these
 * hosts, and `src/app/robots.ts` returns `Disallow: /` for them. Both are
 * no-ops for every other host, which is what keeps production untouched.
 */
export const PREVIEW_HOSTS: readonly string[] = ['preview.himalayankoh.com'];

/** The `host` header may carry a port (`localhost:3002`) and any casing. */
function normalizeHost(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/:\d+$/, '');
}

export function isPreviewHost(raw: string | null | undefined): boolean {
  const host = normalizeHost(raw);
  return host !== '' && PREVIEW_HOSTS.includes(host);
}
