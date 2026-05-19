/**
 * Client-side error reporting (Phase 0 baseline).
 * Logs structured errors with a support reference ID.
 * For Sentry: see DEPLOYMENT.md (install @sentry/react in a follow-up).
 */

export type ErrorContext = Record<string, string | number | boolean | undefined>;

export function createErrorId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function initMonitoring(): Promise<void> {
  if (import.meta.env.VITE_SENTRY_DSN) {
    console.info(
      '[monitoring] VITE_SENTRY_DSN is set. Install @sentry/react and wire init in monitoring.ts to enable Sentry.'
    );
  }
}

export function reportClientError(
  error: unknown,
  context: ErrorContext = {},
  errorId: string = createErrorId()
): string {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error('[monitoring]', {
    errorId,
    message,
    stack,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    context,
    timestamp: new Date().toISOString(),
  });

  return errorId;
}
