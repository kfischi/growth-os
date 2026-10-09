#!/usr/bin/env node
// Prints the SQL that adds a business to the lead system, and the owner's panel key.
// Usage: node scripts/lead-system/new-client.mjs <slug> "<business name>" <owner phone> [https://site.co.il ...]
// Paste the SQL into the lead system's Supabase SQL Editor. Send the panel link to the owner privately.
// The key is printed once and only its hash goes to the database. Lost it? Run again with --rekey.
import { randomBytes, createHash } from "node:crypto";

const args = process.argv.slice(2);
const rekey = args.includes("--rekey");
const [slug, name, ownerRaw, ...origins] = args.filter((a) => a !== "--rekey");
const fail = (m) => { console.error(m); process.exit(1); };
if (!/^[a-z0-9-]{2,40}$/.test(slug || "")) fail("slug: lowercase English letters, digits and -, e.g. oren-mayim");

const key = randomBytes(24).toString("base64url");
const hash = createHash("sha256").update(key).digest("hex");
const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";

if (rekey) {
  console.log(`update public.ls_clients set key_hash = ${lit(hash)} where slug = ${lit(slug)};`);
} else {
  if (!name) fail("missing the business name");
  let owner = String(ownerRaw || "").replace(/\D/g, "");
  if (owner.startsWith("0")) owner = "972" + owner.slice(1);
  if (!/^9725\d{8}$/.test(owner)) fail("owner phone: an Israeli mobile, e.g. 0521234567");
  for (const o of origins) if (!/^https:\/\/[a-z0-9.-]+$/.test(o)) fail("origin: like https://www.example.co.il, no path and no trailing /");
  console.log(`insert into public.ls_clients (slug, name, package, owner_phone, allowed_origins, key_hash)
values (${lit(slug)}, ${lit(name)}, 'ai', ${lit(owner)}, ${lit("{" + origins.join(",") + "}")}, ${lit(hash)});

-- After the WhatsApp number is connected in Meta:
-- update public.ls_clients set wa_phone_number_id = '<Phone number ID>' where slug = ${lit(slug)};
-- And in Netlify: WA_TOKEN_${slug.toUpperCase().replace(/-/g, "_")} = <the business's access token>`);
}
console.log(`\nPanel link for the owner (send privately, it is the password):\nhttps://service-pro-web.netlify.app/panel/#k=${slug}:${key}`);
