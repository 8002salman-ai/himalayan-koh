interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let lastCleanup = 0;

function maybeCleanup(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  maybeCleanup(now);

  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= opts.limit,
    remaining: Math.max(0, opts.limit - entry.count),
    resetAt: entry.resetAt,
  };
}
