/**
 * Small in-memory fixed-window rate limiter for auth endpoints. Per instance only;
 * account-level lockout in auth-core.ts provides the durable protection.
 */
const g = globalThis as unknown as { __hvacRl?: Map<string, { n: number; reset: number }> };
const buckets = (g.__hvacRl ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.n++;
  return b.n <= limit;
}
