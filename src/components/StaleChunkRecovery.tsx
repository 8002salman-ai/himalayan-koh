'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'hk_stale_chunk_reload';

const CHUNK_ERROR_PATTERN =
  /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function isStaleChunkError(message: unknown): boolean {
  return typeof message === 'string' && CHUNK_ERROR_PATTERN.test(message);
}

/**
 * Fallback only — not the fix for stuck navigation in general. The actual
 * cause of navigation hanging site-wide was server-rendered routes awaiting
 * Supabase queries with no timeout (see lib/seo/server.ts) and Admin/My
 * Account's role check racing ahead of the profile it depends on (see
 * AuthContext/AdminRoute); both are fixed at the source, not by reloading.
 *
 * What this component alone handles: a browser tab left open across a
 * deploy, holding JS/RSC chunk URLs that no longer exist once the new build
 * replaces them. There's no way to recover from a 404'd chunk without a
 * fresh page load, so this is a legitimate case for a one-time reload rather
 * than something fixable in application code. Guarded by sessionStorage so a
 * page that is genuinely broken doesn't reload in a loop; the guard clears
 * itself once the app has been running long enough to prove the current
 * chunks are good.
 */
export default function StaleChunkRecovery() {
  useEffect(() => {
    const clearGuard = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, 8_000);

    const recover = () => {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      if (isStaleChunkError(event.message) || isStaleChunkError(event.error?.message)) {
        recover();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      if (isStaleChunkError(message)) recover();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.clearTimeout(clearGuard);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
