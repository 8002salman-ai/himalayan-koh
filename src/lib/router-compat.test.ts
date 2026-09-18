import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The router shim must not call `useSearchParams` from `next/navigation`.
 *
 * That hook may only be called during a render that sits inside a Suspense
 * boundary. The shim is consumed by components that render at the top of a route
 * — `AdminRoute`, `ProtectedRoute`, the account sidebar, `LoginPage` — so each of
 * those routes needed a boundary of its own. When the app's root boundary was
 * removed so a retired product URL could answer a real `404` (a boundary above
 * the product route swallows the status), every admin route answered `200` with
 * React's "An error occurred in the Server Components render" boundary and React
 * error #419 on the console — the console was unusable, and `/account`,
 * `/checkout/success` and `/track` were exposed to the same failure.
 *
 * The shim now reads `window.location.search` through `useSyncExternalStore`,
 * which is empty on the server and filled in on the client. This test is the
 * guard: re-introducing the hook restores the boundary requirement silently.
 */
const SHIM = fileURLToPath(new URL('./router-compat.tsx', import.meta.url));

describe('router shim SSR safety', () => {
  const source = readFileSync(SHIM, 'utf8');

  it('does not import useSearchParams from next/navigation', () => {
    const navigationImports = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'next\/navigation'/g)]
      .flatMap((match) => match[1].split(','))
      .map((name) => name.trim())
      .filter(Boolean);

    expect(navigationImports).not.toContain('useSearchParams');
    expect(navigationImports).not.toContain('useSearchParams as useNextSearchParams');
  });

  it('reads the query string from the browser instead', () => {
    expect(source).toMatch(/useSyncExternalStore/);
    expect(source).toMatch(/window\.location\.search/);
  });
});
