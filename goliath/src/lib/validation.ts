/** Minimal dependency-free validators used by API routes. */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Expected a JSON object body");
  }
  return value as Record<string, unknown>;
}

export function requireString(
  record: Record<string, unknown>,
  key: string,
  opts: { min?: number; max?: number; pattern?: RegExp } = {},
): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`Field "${key}" is required`);
  }
  const min = opts.min ?? 1;
  const max = opts.max ?? 4096;
  if (value.length < min) throw new ValidationError(`Field "${key}" is too short`);
  if (value.length > max) throw new ValidationError(`Field "${key}" is too long`);
  if (opts.pattern && !opts.pattern.test(value)) {
    throw new ValidationError(`Field "${key}" has an invalid format`);
  }
  return value;
}

export function optionalString(
  record: Record<string, unknown>,
  key: string,
  opts: { max?: number } = {},
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new ValidationError(`Field "${key}" must be a string`);
  if (value.length > (opts.max ?? 4096)) throw new ValidationError(`Field "${key}" is too long`);
  return value;
}

export function requireNumber(
  record: Record<string, unknown>,
  key: string,
  opts: { min?: number; max?: number; int?: boolean } = {},
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`Field "${key}" must be a number`);
  }
  if (opts.int && !Number.isInteger(value)) throw new ValidationError(`Field "${key}" must be an integer`);
  if (opts.min !== undefined && value < opts.min) throw new ValidationError(`Field "${key}" is too small`);
  if (opts.max !== undefined && value > opts.max) throw new ValidationError(`Field "${key}" is too large`);
  return value;
}

export function optionalBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new ValidationError(`Field "${key}" must be a boolean`);
  return value;
}

export function optionalNumber(
  record: Record<string, unknown>,
  key: string,
  opts: { min?: number; max?: number } = {},
): number | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  return requireNumber(record, key, opts);
}

export function optionalStringArray(
  record: Record<string, unknown>,
  key: string,
  opts: { maxItems?: number; maxItemLength?: number } = {},
): string[] | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ValidationError(`Field "${key}" must be an array`);
  const maxItems = opts.maxItems ?? 50;
  if (value.length > maxItems) throw new ValidationError(`Field "${key}" has too many entries`);
  const maxItemLength = opts.maxItemLength ?? 2048;
  return value.map((entry) => {
    if (typeof entry !== "string" || entry.length === 0 || entry.length > maxItemLength) {
      throw new ValidationError(`Field "${key}" contains an invalid entry`);
    }
    return entry;
  });
}

export const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,256}$/;

export function requireDriveId(record: Record<string, unknown>, key: string): string {
  return requireString(record, key, { min: 1, max: 256, pattern: DRIVE_ID_PATTERN });
}

export function optionalDriveId(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  return requireDriveId(record, key);
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}