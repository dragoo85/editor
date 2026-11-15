/** Pure transfer math shared by client and server. Kept dependency-free for tests. */

export interface ChunkPlan {
  chunkSize: number;
  totalChunks: number;
  lastChunkSize: number;
}

export function planChunks(size: number, chunkSize: number): ChunkPlan {
  if (!Number.isFinite(size) || size < 0) throw new Error("Invalid file size");
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error("Invalid chunk size");
  if (size === 0) return { chunkSize, totalChunks: 0, lastChunkSize: 0 };
  const totalChunks = Math.ceil(size / chunkSize);
  const lastChunkSize = size - (totalChunks - 1) * chunkSize;
  return { chunkSize, totalChunks, lastChunkSize };
}

export function offsetForChunk(index: number, chunkSize: number): number {
  if (!Number.isInteger(index) || index < 0) throw new Error("Invalid chunk index");
  return index * chunkSize;
}

export function nextChunkIndex(bytesTransferred: number, chunkSize: number): number {
  if (chunkSize <= 0) throw new Error("Invalid chunk size");
  return Math.floor(bytesTransferred / chunkSize);
}

export function percentComplete(bytesTransferred: number, size: number): number {
  if (size <= 0) return 100;
  const pct = (bytesTransferred / size) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

/** Exponential backoff with full jitter, capped at 30s. */
export function backoffDelay(attempt: number, baseMs = 500, capMs = 30_000): number {
  const exp = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(Math.random() * exp);
}

export function isValidContentRange(
  totalSize: number,
  chunkStart: number,
  chunkSize: number,
): boolean {
  if (chunkStart < 0 || chunkStart > totalSize) return false;
  const end = Math.min(chunkStart + chunkSize, totalSize) - 1;
  return end >= chunkStart;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value >= 100 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}