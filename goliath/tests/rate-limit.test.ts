import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, pruneRateLimits } from "../src/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    pruneRateLimits(0);
  });

  it("allows up to the limit inside the window", () => {
    const key = `test-${Math.random()}`;
    const results = Array.from({ length: 3 }, () => rateLimit(key, 3, 60_000));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true]);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps buckets isolated per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});