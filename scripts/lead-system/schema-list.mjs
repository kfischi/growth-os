// Writes demos/netlify/lib/schema.mjs: every table and column the lead system's migrations create, so /api/health
// can tell when a migration was not run in Supabase (a column the code reads is missing, and its feature fails).
// Run after adding a migration: node scripts/lead-system/schema-list.mjs   (check-all.sh fails when it is out of date)
// With --check it only compares.
import fs from "node:fs";
const DIR = new URL("../../supabase/lead-system/", import.meta.url), OUT = new URL("../../demos/netlify/lib/schema.mjs", import.meta.url);
const tables = {};
const add = (t, c) => { (tables[t] ||= new Set()).add(c); };
for (const f of fs.readdirSync(DIR).filter((x) => /^\d{4}_.*\.sql$/.test(x)).sort()) {
  const sql = fs.readFileSync(new URL(f, DIR), "utf8").replace(/--[^\n]*/g, "");
  for (const m of sql.matchAll(/create table if not exists public\.(ls_\w+)\s*\(([\s\S]*?)\n\);/g)) {
    for (const line of m[2].split("\n")) {
      const c = /^\s*([a-z_]+)\s+(?:bigint|uuid|text|int|integer|smallint|boolean|date|timestamptz|jsonb|numeric|real)\b/.exec(line);
      if (c && !["primary", "unique", "check", "constraint"].includes(c[1])) add(m[1], c[1]);
    }
  }
  for (const m of sql.matchAll(/alter table public\.(ls_\w+) add column if not exists ([a-z_]+)/g)) add(m[1], m[2]);
}
const body = `// Made by scripts/lead-system/schema-list.mjs from supabase/lead-system/*.sql. Do not edit by hand.
// Every table and column the migrations create; /api/health checks they are all there (healthCheck in leads.mjs).
export const SCHEMA = ${JSON.stringify(Object.fromEntries(Object.entries(tables).sort().map(([t, s]) => [t, [...s].sort()])), null, 2)};
`;
if (process.argv.includes("--check")) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (now !== body) { console.error("demos/netlify/lib/schema.mjs is out of date: run node scripts/lead-system/schema-list.mjs"); process.exit(1); }
  console.log("schema list up to date:", Object.keys(tables).length, "tables");
} else { fs.writeFileSync(OUT, body); console.log("wrote", Object.keys(tables).length, "tables"); }
