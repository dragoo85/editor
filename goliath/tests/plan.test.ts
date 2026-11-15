import { describe, expect, it } from "vitest";
import {
  backoffDelay,
  formatBytes,
  isValidContentRange,
  nextChunkIndex,
  offsetForChunk,
  percentComplete,
  planChunks,
} from "../src/lib/transfer/plan";

describe("transfer plan", () => {
  it("splits an exact multiple", () => {
    const plan = planChunks(10 * 1024 * 1024, 5 * 1024 * 1024);
    expect(plan.totalChunks).toBe(2);
    expect(plan.lastChunkSize).toBe(5 * 1024 * 1024);
  });

  it("handles a partial final chunk", () => {
    const plan = planChunks(12 * 1024 * 1024, 5 * 1024 * 1024);
    expect(plan.totalChunks).toBe(3);
    expect(plan.lastChunkSize).toBe(2 * 1024 * 1024);
  });

  it("treats empty files as zero chunks", () => {
    const plan = planChunks(0, 5 * 1024 * 1024);
    expect(plan).toEqual({ chunkSize: 5 * 1024 * 1024, totalChunks: 0, lastChunkSize: 0 });
  });

  it("rejects invalid sizes", () => {
    expect(() => planChunks(-1, 1024)).toThrow();
    expect(() => planChunks(10, 0)).toThrow();
    expect(() => planChunks(Number.NaN, 1024)).toThrow();
  });

  it("maps chunk indexes to offsets", () => {
    expect(offsetForChunk(0, 1000)).toBe(0);
    expect(offsetForChunk(3, 1000)).toBe(3000);
    expect(nextChunkIndex(2500, 1000)).toBe(2);
    expect(nextChunkIndex(3000, 1000)).toBe(3);
  });

  it("computes bounded percentages", () => {
    expect(percentComplete(0, 100)).toBe(0);
    expect(percentComplete(50, 100)).toBe(50);
    expect(percentComplete(120, 100)).toBe(100);
    expect(percentComplete(10, 0)).toBe(100);
  });

  it("validates content ranges", () => {
    expect(isValidContentRange(100, 0, 40)).toBe(true);
    expect(isValidContentRange(100, 90, 40)).toBe(true);
    expect(isValidContentRange(100, 100, 40)).toBe(false);
    expect(isValidContentRange(100, -1, 40)).toBe(false);
  });

  it("applies capped jittered backoff", () => {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const delay = backoffDelay(attempt, 500, 30_000);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(30_000);
    }
  });

  it("formats byte sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5.0 GB");
    expect(formatBytes(2 * 1024 ** 4)).toBe("2.0 TB");
  });
});