/**
 * The site's public origin, resolved in exactly one place.
 *
 * Why this module exists
 * ----------------------
 * The origin appears in canonical tags, OG URLs, JSON-LD, email links, Stripe
 * return URLs and the sitemap. It used to be resolved in five separate places
 * (this file's callers), which is survivable right up until one of them is wrong
 * — and one of them was: a local `.env.local` carried
 * `NEXT_PUBLIC_SITE_URL=http://localhost:3001`, and because `NEXT_PUBLIC_*` is
 * inlined at build time, every prerendered artifact and the deployed sitemap
 * shipped `http://localhost:3001/...` URLs. The Worker's runtime variable said
 * `https://himalayankoh.com`, which is exactly what made the bug invisible: the
 * value that mattered was the one baked into the bundle, not the one configured
 * on the deployment.
 *
 * The rule that prevents it recurring
 * -----------------------------------
 * A loopback origin is only ever honoured by a development build. A production
 * build refuses it, says so loudly, and falls back to a real origin — so a stray
 * developer value cannot reach a deployed artifact even silently. `scripts/check-public-origin.mjs`
 * then scans the build output and fails the build if a loopback URL is present
 * anyway, because a rule that is only enforced by careful reading is not enforced.
 *
 * Origins and their owners
 * ------------------------
 * - Staging/QA is served by the Worker from `preview.himalayankoh.com`.
 * - Production is `himalayankoh.com` and is configured separately, per
 *   deployment, by setting `NEXT_PUBLIC_SITE_URL`. Nothing in the code hard-codes
 *   which of the two a given deployment is; the env var decides.
 */

/** Staging/QA origin: the Cloudflare Worker's custom domain. */
export const SITE_ORIGIN_STAGING = 'https://preview.himalayankoh.com';

/**
 * Production origin. Also the fallback for a production build with no usable
 * configuration, because defaulting a deployed build toward production is the
 * safer mistake: a staging deployment pointing canonicals at production is a
 * visible bug, while a production deployment pointing them at staging silently
 * deindexes the store.
 */
export const SITE_ORIGIN_PRODUCTION = 'https://himalayankoh.com';

/** Development default, used only when a development build has nothing configured. */
export const SITE_ORIGIN_LOCAL = 'http://localhost:3000';

export interface SiteOriginInput {
  /** Raw value of `NEXT_PUBLIC_SITE_URL` (or an override, in tests). */
  configured?: string | null;
  /** `process.env.NODE_ENV`. */
  nodeEnv?: string;
  /** Escape hatch for locally building a production bundle against loopback. */
  allowLoopback?: boolean;
}

/** True for origins that can only ever mean "this machine". */
export function isLoopbackOrigin(origin: string): boolean {
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  );
}

/** Trim, drop a trailing slash, and reject anything that is not a URL. */
function normalize(origin: string): string | null {
  const trimmed = origin.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Resolve the public origin for this build/runtime.
 *
 * Pure and total: it never throws, so a bad value degrades to a working site
 * instead of a failed render, and it is trivially testable without touching env.
 */
export function resolveSiteOrigin(input: SiteOriginInput = {}): string {
  const nodeEnv = input.nodeEnv ?? 'development';
  const isProductionBuild = nodeEnv === 'production';
  const allowLoopback =
    input.allowLoopback ?? process.env.ALLOW_LOOPBACK_SITE_ORIGIN === '1';

  const configured = input.configured ? normalize(input.configured) : null;

  if (configured) {
    if (!isLoopbackOrigin(configured) || !isProductionBuild || allowLoopback) {
      return configured;
    }
    // A production build was handed a loopback origin. Refusing it here is the
    // whole point of this module; the warning names the fix.
    console.warn(
      `[site-origin] Refusing NEXT_PUBLIC_SITE_URL=${configured} for a production build: ` +
        `loopback origins must never reach a deployed artifact. Falling back to ` +
        `${SITE_ORIGIN_PRODUCTION}. Set NEXT_PUBLIC_SITE_URL to the deployment's real ` +
        `origin (staging: ${SITE_ORIGIN_STAGING}), or set ALLOW_LOOPBACK_SITE_ORIGIN=1 ` +
        `if you are deliberately building a production bundle for local testing.`
    );
    return SITE_ORIGIN_PRODUCTION;
  }

  return isProductionBuild ? SITE_ORIGIN_PRODUCTION : SITE_ORIGIN_LOCAL;
}

/**
 * The origin for this build. `NEXT_PUBLIC_*` is inlined by the bundler, so this
 * is a build-time constant in a deployed artifact and a runtime read locally —
 * which is why the refusal above has to happen here rather than at request time.
 */
export const SITE_ORIGIN = resolveSiteOrigin({
  configured: process.env.NEXT_PUBLIC_SITE_URL || process.env.VITE_SITE_URL,
  nodeEnv: process.env.NODE_ENV,
});

/**
 * The origin a *server-side* feature should read this site's own pages from.
 *
 * Why the request is consulted first
 * ---------------------------------
 * `SITE_ORIGIN` above is a build-time constant, so it is only as good as the
 * build env. A deployed bundle whose build env carried no `NEXT_PUBLIC_SITE_URL`
 * falls back to a loopback default (`http://localhost:3000`) — and a loopback
 * origin makes every self-referential read fail: the SSRF guard refuses it, so a
 * feature like "find this product's images on our own store" searches
 * `http://localhost:3000`, refuses every page, and reports "nothing found" while
 * the catalogue sits one hostname away. Observed on the staging Worker.
 *
 * The request's own origin cannot be wrong about which host the deployment is
 * serving: staging asks staging, production asks production. So: prefer the
 * request, then a real configured origin, and only fall back to staging when
 * both are loopback (local development), because staging is where the catalogue
 * a local build reads actually lives.
 */
export function resolveRuntimeSiteOrigin(
  requestUrl: string,
  input: SiteOriginInput = {}
): string {
  const fromRequest = (() => {
    try {
      return normalize(new URL(requestUrl).origin);
    } catch {
      return null;
    }
  })();
  if (fromRequest && !isLoopbackOrigin(fromRequest)) return fromRequest;

  const configured = resolveSiteOrigin(input);
  if (!isLoopbackOrigin(configured)) return configured;

  return SITE_ORIGIN_STAGING;
}

/** Absolute URL for a site-relative path, for canonical/OG/JSON-LD builders. */
export function absoluteSiteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
