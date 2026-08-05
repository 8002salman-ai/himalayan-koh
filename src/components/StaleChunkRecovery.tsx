'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'hk_stale_chunk_reload';

const CHUNK_ERROR_PATTERN =
  /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function isStaleChunkError(message: unknown): boolean {
  return typeof message === 'string' && CHUNK_ERROR_PATTERN.test(message);
}

/**
 * A browser tab left open across a deploy holds JS/RSC chunk URLs that no
 * longer exist once the new build replaces them. Next's client router has no
 * built-in recovery for that: the fetch for the next route's chunk just
 * fails, the in-flight navigation goes nowhere, and the top progress bar sits
 * there (or silently times out) until the visitor manually reloads — which is
 * exactly the "navigation gets stuck, only a refresh fixes it" symptom.
 *
 * This listens for that failure signature anywhere on the page — a clicked
 * Link, a prefetch, a lazy-loaded admin panel — and reloads once, which
 * always picks up the current build. Guarded by sessionStorage so a page that
 * is genuinely broken doesn't reload in a loop; the guard clears itself once
 * the app has been running long enough to prove the current chunks are good.
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
