import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * No file may call `useSearchParams` from `next/navigation`.
 *
 * That hook may only be called during a render that sits inside a Suspense
 * boundary, and a boundary above a route is expensive in two ways that both
 * showed up here:
 *
 *  1. React error #419 — "this Suspense boundary received an update before it
 *     finished hydrating". The boundary had to resolve before it could know the
 *     query string, the update that resolved it landed mid-hydration, and the
 *     failure surfaced as the generic "an error occurred in the Server Components
 *     render" page. Every admin route answered `200` with that page.
 *  2. It swallowed HTTP status. A boundary above a route commits a `200` shell
 *     before the page can call `notFound()`, so retired product URLs answered
 *     `200` with "Product not found" — which is why the root boundary and then
 *     `app/loading.tsx` were removed (see
 *     `app/(main)/products/[slug]/page.status.test.ts`).
 *
 * Both are the same root cause, and the fix is the same one: read the query string
 * from `window.location` through this shim, which is empty on the server and filled
 * in on the client. This test scans every source file rather than just the shim,
 * because the failure is invisible until a route is rendered — re-introducing the
 * hook anywhere restores the boundary requirement silently.
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, found);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

/** The names a file imports from `next/navigation`, however they are aliased. */
function navigationImports(source: string): string[] {
  return [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'next\/navigation'/g)]
    .flatMap((match) => match[1].split(','))
    .map((name) => name.trim())
    .filter(Boolean);
}

describe('router shim SSR safety', () => {
  const files = sourceFiles(SRC);

  it('finds the source tree', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('imports useSearchParams from next/navigation nowhere in src', () => {
    const offenders = files.filter((file) =>
      navigationImports(readFileSync(file, 'utf8')).some((name) => name.startsWith('useSearchParams'))
    );
    expect(offenders).toEqual([]);
  });

  it('keeps the shim reading the query string from the browser', () => {
    const shim = readFileSync(fileURLToPath(new URL('./router-compat.tsx', import.meta.url)), 'utf8');
    expect(shim).toMatch(/useSyncExternalStore/);
    expect(shim).toMatch(/window\.location\.search/);
    expect(navigationImports(shim)).not.toContain('useSearchParams');
  });

  it('keeps the app free of a Suspense boundary above the route tree', () => {
    // providers.tsx is the only place a boundary could sit above every route; the
    // components it mounts read from window and therefore do not suspend.
    const providers = readFileSync(fileURLToPath(new URL('../app/providers.tsx', import.meta.url)), 'utf8');
    expect(providers).not.toMatch(/<Suspense/);
  });
});
