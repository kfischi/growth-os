// The watchdog (lib/watchdog.mjs, functions/watchdog.mjs) and /api/health with it, against fakes of Supabase, Meta,
// Anthropic, Google, GitHub and Netlify. Each outside service can be made to fail, to see the check name it.
// Run: node scripts/tests/watchdog.test.mjs  (from the repo root)
import assert from "node:assert/strict";
const ENV = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_KEY: "sb_secret_test", WA_APP_SECRET: "s", WA_VERIFY_TOKEN: "v", WA_TOKEN_KFIR: "tok-kfir", WA_TOKEN_OREN: "tok-oren",
  ANTHROPIC_API_KEY: "sk-test", GITHUB_TOKEN: "ghp_test", NETLIFY_TOKEN: "nf-test", LEADS_ADMIN_KEY: "admin-key-0123456789", SITES_DOMAIN: "off" };
Object.assign(process.env, ENV);
const NOW = new Date("2026-11-06T12:00:00Z");
const T = { ls_clients: [
  { slug: "kfir", name: "כפיר", package: "ai", active: true, owner_phone: "972501111111", wa_phone_number_id: "PN-K", tpl_owner_alert: "owner_new_lead", tpl_lang: "he" },
  { slug: "oren", name: "אורן", package: "ai", active: true, owner_phone: "972502222222", wa_phone_number_id: "PN-O", tpl_lang: "he" },
  { slug: "new", name: "חדש", package: "ai", active: true, owner_phone: "972503333333", wa_phone_number_id: null, tpl_lang: "he" },
], ls_heartbeats: [], ls_messages: [] };
const down = new Set(); const sent = []; let tokenExpires = "2027-06-01 00:00:00 UTC", quality = "GREEN";
const res = (d, status = 200, headers = {}) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", ...headers } });
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url), m = opt.method || "GET";
  if (u.host === "api.anthropic.com") { assert.equal(opt.headers["x-api-key"], "sk-test"); return down.has("claude") ? res({}, 401) : res({ data: [] }); }
  if (u.host === "generativelanguage.googleapis.com") return down.has("gemini") ? res({}, 403) : res({ models: [] });
  if (u.host === "api.github.com") { assert.equal(opt.headers.authorization, "Bearer ghp_test"); return down.has("github") ? res({}, 404) : res({ name: "x" }, 200, { "github-authentication-token-expiration": tokenExpires }); }
  if (u.host === "api.netlify.com") return down.has("netlify") ? res({}, 401) : res({ id: "u" });
  if (u.host === "graph.facebook.com") {
    if (m === "POST") { sent.push(JSON.parse(opt.body)); return res({ messages: [{ id: "wamid.x" }] }); }
    const id = u.pathname.split("/").pop();
    if (down.has("wa:" + id)) return res({ error: { code: 190, message: "token expired" } }, 401);
    return res({ display_phone_number: "+972 50-000-0000", quality_rating: quality });
  }
  assert.equal(u.host, "x.supabase.co");
  if (down.has("supabase")) return new Response("down", { status: 503 });
  if (u.pathname.startsWith("/storage/v1/bucket/")) return down.has("bucket") ? res({}, 404) : res({ id: "b" });
  const table = u.pathname.split("/").pop(), rows = T[table] || [];
  if (u.searchParams.get("limit") === "0") return down.has("column") && table === "ls_leads" ? res({ code: "42703" }, 400) : res([]);
  if (m === "GET") {
    let out = rows;
    for (const [k, v] of u.searchParams) { if (["select", "limit", "order"].includes(k)) continue; const [op, val] = [v.slice(0, v.indexOf(".")), v.slice(v.indexOf(".") + 1)];
      if (op === "eq") out = out.filter((r) => String(r[k]) === val); }
    return res(out);
  }
  if (m === "POST") { const b = JSON.parse(opt.body); const i = rows.findIndex((r) => r.name === b.name); if (i >= 0) rows[i] = { ...rows[i], ...b }; else rows.push(b); return new Response("", { status: 201 }); }
  if (m === "PATCH") return new Response(null, { status: 204 });
  throw new Error("unexpected " + m + " " + u.pathname);
};
const W = await import(new URL("../../demos/netlify/lib/watchdog.mjs", import.meta.url).href);
const health = (await import(new URL("../../demos/netlify/functions/health.mjs", import.meta.url).href)).default;
const byName = (r) => Object.fromEntries(r.results.map((x) => [x.name, x]));

// all well, with the schedules fresh; a number not connected yet and no Gemini/Grow are notes, not failures
T.ls_heartbeats.push({ name: "reminders", at: new Date(NOW - 10 * 60_000).toISOString(), ok: true }, { name: "billing", at: new Date(NOW - 5 * 3600_000).toISOString(), ok: true });
let r = await W.runWatchdog(NOW);
assert.equal(r.ok, true, JSON.stringify(r.failed)); assert.deepEqual(r.failed, []);
let n = byName(r);
assert.ok(n["whatsapp:new"].warn && /אין מספר וואטסאפ/.test(n["whatsapp:new"].detail)); assert.ok(n.gemini.warn); assert.ok(n.grow.warn);
assert.equal(n["whatsapp:kfir"].ok, true); assert.equal(n.github.ok, true);
assert.equal(T.ls_heartbeats.find((x) => x.name === "watchdog").ok, true);
assert.equal(sent.length, 0, "no alert when all is well");

// each broken connection is named, and כפיר gets one alert for what newly broke, not again next hour
down.add("wa:PN-O"); down.add("claude");
r = await W.runWatchdog(NOW);
assert.deepEqual(r.failed.sort(), ["claude", "whatsapp:oren"]);
assert.match(byName(r)["whatsapp:oren"].detail, /Meta דחתה את הטוקן או המספר \(401, קוד 190\)/);
assert.equal(sent.length, 1); assert.equal(sent[0].to, "972501111111"); assert.equal(sent[0].template.name, "owner_new_lead");
assert.match(sent[0].template.components[0].parameters[3].text, /^בדיקת החיבורים מצאה תקלה: /);
await W.runWatchdog(NOW); assert.equal(sent.length, 1, "the same failure isn't repeated");
down.add("netlify"); await W.runWatchdog(NOW); assert.equal(sent.length, 2, "a new one is"); assert.match(sent[1].template.components[0].parameters[3].text, /netlify/);
assert.doesNotMatch(sent[1].template.components[0].parameters[3].text, /claude/);
down.clear();

// the rest of the checks
down.add("column"); r = await W.runWatchdog(NOW); assert.match(byName(r).supabase.detail, /מיגרציה שלא הורצה/); down.clear();
down.add("bucket"); r = await W.runWatchdog(NOW); assert.match(byName(r).supabase.detail, /האחסון לא עונה/); down.clear();
down.add("github"); r = await W.runWatchdog(NOW); assert.equal(byName(r).github.ok, false); down.clear();
tokenExpires = "2026-11-15 00:00:00 UTC"; r = await W.runWatchdog(NOW); assert.ok(byName(r).github.warn && /פג בעוד 8 ימים/.test(byName(r).github.detail)); tokenExpires = "2027-06-01 00:00:00 UTC";
quality = "RED"; r = await W.runWatchdog(NOW); assert.ok(byName(r)["whatsapp:oren"].warn); quality = "GREEN";
delete process.env.WA_TOKEN_OREN; r = await W.runWatchdog(NOW); assert.match(byName(r)["whatsapp:oren"].detail, /חסר WA_TOKEN_OREN/); process.env.WA_TOKEN_OREN = "tok-oren";
delete process.env.WA_APP_SECRET; r = await W.runWatchdog(NOW); assert.equal(byName(r)["whatsapp-webhook"].ok, false); process.env.WA_APP_SECRET = "s";
process.env.GEMINI_API_KEY = "g"; down.add("gemini"); r = await W.runWatchdog(NOW); assert.equal(byName(r).gemini.ok, false); down.clear(); delete process.env.GEMINI_API_KEY;
// the free addresses <slug>.<SITES_DOMAIN>: a wildcard record answers, or the domain is a Netlify DNS zone
assert.ok(byName(await W.runWatchdog(NOW))["sites-domain"].warn, "off is a note");
process.env.SITES_DOMAIN = "sites.example.co.il"; delete process.env.NETLIFY_TOKEN;
assert.equal((await W.checkSitesDomain(async () => ["75.2.60.5"])).ok, true);
let sd = await W.checkSitesDomain(async () => { throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }); });
assert.equal(sd.ok, false); assert.match(sd.detail, /CNAME בשם \*/);
process.env.SITES_DOMAIN = "off"; process.env.NETLIFY_TOKEN = "nf-test";
process.env.GROW_SANDBOX = "1"; r = await W.runWatchdog(NOW); assert.equal(byName(r).grow.ok, false); delete process.env.GROW_SANDBOX;
// a schedule that stopped, or whose last run failed
T.ls_heartbeats.find((x) => x.name === "reminders").at = new Date(NOW - 90 * 60_000).toISOString();
r = await W.runWatchdog(NOW); assert.match(byName(r)["schedule:reminders"].detail, /לא רץ כבר 90 דקות/);
T.ls_heartbeats.find((x) => x.name === "reminders").at = new Date(NOW - 5 * 60_000).toISOString();
Object.assign(T.ls_heartbeats.find((x) => x.name === "billing"), { ok: false, detail: { error: "grow 500" } });
r = await W.runWatchdog(NOW); assert.match(byName(r)["schedule:billing"].detail, /הריצה האחרונה נכשלה: grow 500/);
Object.assign(T.ls_heartbeats.find((x) => x.name === "billing"), { ok: true, detail: null });
r = await W.runWatchdog(NOW); assert.equal(r.ok, true, JSON.stringify(r.failed));

// /api/health carries it: red on a failure, red when the watchdog stopped, ?run=1 only with HEALTH_KEY
const hreq = (q = "") => health(new Request("https://s/api/health" + q));
// the lead checks of healthCheck read ls_leads/ls_messages: none here, so only the watchdog decides
T.ls_messages.length = 0; T.ls_heartbeats.find((x) => x.name === "watchdog").at = new Date().toISOString(); // health reads the real clock
let h = await hreq(); let j = await h.json(); assert.equal(h.status, 200, JSON.stringify(j).slice(0, 600)); assert.equal(j.watchdog.ok, true);
T.ls_heartbeats.find((x) => x.name === "watchdog").ok = false; T.ls_heartbeats.find((x) => x.name === "watchdog").detail = { failed: ["claude"] };
h = await hreq(); j = await h.json(); assert.equal(h.status, 503); assert.deepEqual(j.watchdog.failed, ["claude"]);
T.ls_heartbeats.find((x) => x.name === "watchdog").ok = true; T.ls_heartbeats.find((x) => x.name === "watchdog").at = "2026-01-01T00:00:00Z";
h = await hreq(); j = await h.json(); assert.equal(h.status, 503, "a watchdog that stopped running is red"); assert.equal(j.watchdog.stale, true);
process.env.HEALTH_KEY = "hk-0123456789";
h = await hreq("?key=hk-0123456789&run=1"); j = await h.json(); assert.equal(j.watchdog.ageMin, 0, "ran now"); assert.ok(Array.isArray(j.watchdog.results));
h = await hreq("?key=nope&run=1"); assert.equal(h.status, 403);
console.log("all watchdog tests passed");
