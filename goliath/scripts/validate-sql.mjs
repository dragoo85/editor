#!/usr/bin/env node
/**
 * Parses every SQL migration with the real PostgreSQL grammar (libpg-query) so
 * schema errors are caught without a running database.
 *
 * Usage: node scripts/validate-sql.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "libpg-query";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

let statements = 0;
const failures = [];

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  try {
    const result = await parse(sql);
    const count = Array.isArray(result.stmts) ? result.stmts.length : 0;
    statements += count;
    console.log(`ok   ${file} (${count} statements)`);
  } catch (error) {
    failures.push({ file, message: error instanceof Error ? error.message : String(error) });
    console.error(`FAIL ${file}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} migration file(s) failed to parse:`);
  for (const failure of failures) console.error(`  ${failure.file}: ${failure.message}`);
  process.exit(1);
}

console.log(`\n${files.length} file(s), ${statements} statement(s) parsed with the PostgreSQL grammar.`);