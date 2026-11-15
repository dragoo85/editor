#!/usr/bin/env node
/**
 * Fails with a precise message when GOLIATH cannot start.
 * Usage: node scripts/check-env.mjs [--json]
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

const required = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anon key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role key (server only)"],
  ["GOLIATH_TOKEN_ENCRYPTION_KEY", "32-byte base64 token encryption key"],
  ["GOOGLE_CLIENT_ID", "Google OAuth client id"],
  ["GOOGLE_CLIENT_SECRET", "Google OAuth client secret"],
];

const optional = [
  ["GEMINI_API_KEY", "enables Gemini AI"],
  ["OLLAMA_BASE_URL", "enables local models"],
];

function parseEnv(text) {
  const values = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function isPlaceholder(value) {
  if (!value) return true;
  return /^(your|changeme|change_me|xxx|placeholder|todo)/i.test(value) || value.includes("YOUR-");
}

const values = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {};
const missing = required.filter(([key]) => isPlaceholder(values[key]));
const enabled = optional.filter(([key]) => !isPlaceholder(values[key]));

if (missing.length > 0) {
  const lines = missing.map(([key, why]) => `  - ${key}: ${why}`);
  if (isPlaceholder(values.GOLIATH_TOKEN_ENCRYPTION_KEY)) {
    lines.push("  - generate local secrets with: node scripts/generate-env.mjs");
  }

  const report = {
    ok: false,
    message: `Missing ${missing.length} required environment variable(s):\n${lines.join("\n")}`,
  };

  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else console.error(report.message);
  process.exit(1);
}

const report = {
  ok: true,
  optionalEnabled: Object.fromEntries(enabled),
  googleRedirectUri: values.GOOGLE_REDIRECT_URI,
  driveScope: values.GOLIATH_DRIVE_SCOPE,
  chunkBytes: values.GOLIATH_UPLOAD_CHUNK_BYTES,
};

console.log(JSON.stringify(report, null, 2));