/**
 * In-process token bucket rate limiter. Sufficient for a single-instance
 * deployment; swap for Upstash/Redis when running multiple instances.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const refillPerMs = limit / windowMs;

  if (!existing) {
    buckets.set(key, { tokens: limit - 1, updatedAt: now });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  const elapsed = now - existing.updatedAt;
  const tokens = Math.min(limit, existing.tokens + elapsed * refillPerMs);

  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now });
    const deficit = 1 - tokens;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(deficit / refillPerMs / 1000)),
    };
  }

  buckets.set(key, { tokens: tokens - 1, updatedAt: now });
  return { allowed: true, remaining: Math.floor(tokens - 1), retryAfterSeconds: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}

/** Opportunistic cleanup so the map cannot grow without bound. */
export function pruneRateLimits(maxEntries = 5000): void {
  if (buckets.size <= maxEntries) return;
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.updatedAt < cutoff) buckets.delete(key);
  }
}