// Fake backends for the site builder tests: Supabase (PostgREST and Storage), Anthropic, GitHub and WhatsApp.
// Importing this file replaces globalThis.fetch. Used by site-builder.test.mjs and builder-page.test.mjs.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
Object.assign(process.env, { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_KEY: "sb_secret_test", WA_TOKEN: "tok", LEADS_ADMIN_KEY: " admin-key-0123456789\n", ANTHROPIC_API_KEY: "sk-test", GITHUB_TOKEN: "ghp_test", BUILDER_DAILY_MAX: "5" });
// LEADS_ADMIN_KEY carries the space and line break a paste into Netlify can add: the functions must trim it.

/* ---------------- fakes ---------------- */
export const T = { ls_clients: [], ls_leads: [], ls_messages: [], ls_drafts: [], ls_payments: [], ls_billing: [], ls_links: [] };
export const storage = new Map(); export const sentWa = []; export const aiCalls = []; export const ai = { queue: [], mode: "ok" };
export const gh = { calls: [], files: new Map([["clients/sample-plumber/assets/leadbot.js", "sha-bot"], ["clients/sample-plumber/assets/leadform.js", "sha-form"], ["clients/sample-plumber/assets/a11y.js", "sha-a11y"]]), head: "c0", moveFails: 0, trees: [] };
export const DEF = {
  ls_drafts: () => ({ id: randomUUID(), template: "plumber", content: {}, photos: {}, messages: [], status: "draft", rev: 0, photo_rev: 0, paid_at: null, video: null, videos: [], photo_rights_at: null, package: null, plan: null, return_note: null, published_slug: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  ls_leads: () => ({ id: randomUUID(), status: "new", created_at: new Date().toISOString() }),
  ls_messages: () => ({ id: Math.random(), created_at: new Date().toISOString() }),
  ls_payments: () => ({ id: randomUUID(), status: "pending", created_at: new Date().toISOString() }),
  ls_billing: () => ({ state: "active", fails: 0, created_at: new Date().toISOString() }),
  ls_clients: () => ({ package: "ai", active: true, allowed_origins: [], tpl_lang: "he", tpl_lead_ack: "lead_ack", tpl_owner_alert: "owner_new_lead", auto_reply: true, owner_alerts: true }),
};
function match(row, filters) {
  return filters.every(([col, op, val]) => {
    const v = row[col];
    if (op === "eq") return String(v) === val;
    if (op === "neq") return String(v) !== val;
    if (op === "is") return val === "null" ? v == null : String(v) === val;
    if (op === "in") return val.slice(1, -1).split(",").includes(String(v));
    const a = new Date(v).getTime(), b = new Date(val).getTime();
    return op === "gte" ? a >= b : op === "lte" ? a <= b : op === "lt" ? a < b : op === "gt" ? a > b : false;
  });
}
const res = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
export const imageCalls = [];
export const indexNow = []; // the pings to IndexNow after a deploy (lib/search.mjs)
// Netlify (lib/hosting.mjs): sites, deploys by digest, uploads, the DNS zone of SITES_DOMAIN.
export const nl = { sites: new Map(), taken: new Set(), deploys: new Map(), have: new Set(), uploads: [], zones: [{ id: "z1", name: "sites.example.co.il" }], records: [], ssl: 0, bodies: new Map(), failDeploy: 0 };
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url); const method = opt.method || "GET";
  if (u.host === "api.anthropic.com") {
    const body = JSON.parse(opt.body); aiCalls.push(body);
    if (ai.mode === "down") return res({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }, 529);
    if (ai.mode === "refusal") return res({ id: "m", type: "message", role: "assistant", model: "x", stop_reason: "refusal", content: [], usage: { input_tokens: 1, output_tokens: 0 } });
    const out = ai.queue.shift(); assert.ok(out, "an AI answer was queued");
    return res({ id: "m", type: "message", role: "assistant", model: "x", stop_reason: "end_turn", content: [{ type: "text", text: typeof out === "string" ? out : JSON.stringify(out) }], usage: { input_tokens: 1, output_tokens: 1 } });
  }
  if (u.host === "generativelanguage.googleapis.com") { // the background image (heroImage)
    imageCalls.push(JSON.parse(opt.body));
    return res({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "iVBORw0KGgo=" } }] } }] });
  }
  if (u.host === "service-pro-web.netlify.app" && u.pathname.startsWith("/shared/")) return new Response("/* " + u.pathname + " */");
  if (u.host === "api.indexnow.org") { indexNow.push(JSON.parse(opt.body)); return new Response("", { status: 202 }); }
  if (u.host === "api.netlify.com") {
    assert.equal(opt.headers.authorization, "Bearer nf-test"); assert.ok(opt.signal, "netlify call has a timeout");
    const p = u.pathname.replace("/api/v1", ""), body = opt.body && !Buffer.isBuffer(opt.body) && typeof opt.body === "string" ? JSON.parse(opt.body) : null;
    let m;
    if (method === "POST" && p === "/sites") {
      if (nl.taken.has(body.name) || [...nl.sites.values()].some((x) => x.name === body.name)) return res({ errors: { subdomain: ["must be unique"] } }, 422);
      const site = { id: "site-" + (nl.sites.size + 1), name: body.name, default_domain: body.name + ".netlify.app", custom_domain: body.custom_domain || null, domain_aliases: [] };
      nl.sites.set(site.id, site); return res(site, 201);
    }
    if ((m = /^\/sites\/([\w.%-]+)$/.exec(p))) { // the API takes the site's id or one of its domains
      const key = decodeURIComponent(m[1]);
      const site = nl.sites.get(key) || [...nl.sites.values()].find((x) => x.custom_domain === key || x.default_domain === key); if (!site) return res({ message: "Not Found" }, 404);
      if (method === "GET") return res(site);
      if (method === "PATCH") { Object.assign(site, body); return res(site); }
    }
    if (method === "POST" && /^\/sites\/[\w-]+\/ssl$/.test(p)) { nl.ssl++; return res({}); }
    if (method === "POST" && (m = /^\/sites\/([\w-]+)\/deploys$/.exec(p))) {
      assert.ok(nl.sites.has(m[1]));
      if (nl.failDeploy > 0) { nl.failDeploy--; return res({ message: "Internal" }, 500); } // a deploy that fails (or a run cut off)
      const id = "dep-" + (nl.deploys.size + 1); nl.deploys.set(id, { site: m[1], files: body.files });
      return res({ id, required: [...new Set(Object.values(body.files))].filter((h) => !nl.have.has(h)) });
    }
    if (method === "PUT" && (m = /^\/deploys\/([\w-]+)\/files(\/.+)$/.exec(p))) {
      const dep = nl.deploys.get(m[1]); const path = decodeURIComponent(m[2]); assert.ok(dep && dep.files[path], "uploads only a file of the deploy: " + path);
      assert.equal(opt.headers["content-type"], "application/octet-stream");
      const h = createHash("sha1").update(opt.body).digest("hex"); assert.equal(h, dep.files[path], "the bytes match the digest");
      nl.have.add(h); nl.uploads.push(path); nl.bodies.set(path, Buffer.from(opt.body).toString("utf8")); return res({});
    }
    if (method === "GET" && p === "/dns_zones") return res(nl.zones);
    if ((m = /^\/dns_zones\/([\w-]+)\/dns_records$/.exec(p))) {
      if (method === "GET") return res(nl.records.filter((r) => r.zone === m[1]));
      if (method === "POST") { nl.records.push({ zone: m[1], ...body }); return res(body, 201); }
    }
    throw new Error("unexpected netlify " + method + " " + p);
  }
  if (u.host === "graph.facebook.com") { sentWa.push(JSON.parse(opt.body)); return res({ messages: [{ id: "wamid." + sentWa.length }] }); }
  if (u.host === "api.github.com") {
    assert.equal(opt.headers.authorization, "Bearer ghp_test"); assert.ok(opt.signal, "github call has a timeout");
    const body = opt.body ? JSON.parse(opt.body) : null; const p = u.pathname.replace("/repos/kfischi/growth-os", ""); gh.calls.push([method, p]);
    if (method === "GET" && p.startsWith("/contents/clients/sample-plumber/assets")) return res([{ name: "leadbot.js", type: "file", sha: "sha-bot" }, { name: "leadform.js", type: "file", sha: "sha-form" }, { name: "a11y.js", type: "file", sha: "sha-a11y" }, { name: "photos", type: "dir", sha: "x" }]);
    if (method === "GET" && p.startsWith("/contents/") && p.endsWith(".md")) { const f = gh.files.get(p.slice(10)); return f ? res({ content: Buffer.from(f).toString("base64"), encoding: "base64" }) : res({ message: "Not Found" }, 404); }
    if (method === "GET" && p.startsWith("/contents/")) { // a folder: its direct children
      const dir = p.slice(10), kids = new Map();
      for (const k of gh.files.keys()) if (k.startsWith(dir + "/")) { const rest = k.slice(dir.length + 1); kids.set(rest.split("/")[0], rest.includes("/") ? "dir" : "file"); }
      return kids.size ? res([...kids].map(([name, type]) => ({ name, type }))) : res({ message: "Not Found" }, 404);
    }
    if (method === "GET" && p.startsWith("/git/ref/heads/")) return res({ object: { sha: gh.head } });
    if (method === "GET" && p.startsWith("/git/commits/")) return res({ sha: p.split("/").pop(), tree: { sha: "tree-" + p.split("/").pop() } });
    if (method === "POST" && p === "/git/blobs") { assert.equal(body.encoding, "base64"); return res({ sha: "blob-" + body.content.length }, 201); }
    if (method === "POST" && p === "/git/trees") { gh.trees.push(body); return res({ sha: "tree-new" }, 201); }
    if (method === "POST" && p === "/git/commits") { assert.equal(body.parents[0], gh.head); return res({ sha: "commit-" + gh.calls.length }, 201); }
    if (method === "PATCH" && p.startsWith("/git/refs/heads/")) {
      assert.equal(body.force, false);
      if (gh.moveFails > 0) { gh.moveFails--; gh.head = "c-other"; return res({ message: "Update is not a fast forward" }, 422); }
      for (const e of gh.trees.at(-1).tree) { if (e.sha === null) { assert.ok(gh.files.has(e.path), "deletes only a file that is there: " + e.path); gh.files.delete(e.path); } else gh.files.set(e.path, e.sha || e.content); }
      gh.head = body.sha; return res({ object: { sha: body.sha } });
    }
    throw new Error("unexpected github " + method + " " + p);
  }
  assert.equal(u.host, "x.supabase.co"); assert.equal(opt.headers.apikey, "sb_secret_test"); assert.ok(opt.signal, "supabase call has a timeout");
  if (u.pathname.startsWith("/storage/v1/object/")) {
    const rest = u.pathname.slice("/storage/v1/object/".length);
    if (method === "POST") { assert.ok(/^builder\/drafts\/[0-9a-f-]{36}\/\w+-[0-9a-f]{12}\.(webp|jpg|mp4)$/.test(rest), rest); storage.set(rest.slice(8), Buffer.from(opt.body)); return res({ Key: rest }); }
    if (method === "DELETE") { for (const p of JSON.parse(opt.body).prefixes) storage.delete(p); return res([]); }
    if (method === "GET") { const b = storage.get(rest.slice(8)); return b ? new Response(b) : res({}, 404); }
  }
  const table = u.pathname.split("/").pop(); const rows = T[table]; assert.ok(rows, table);
  const filters = []; let limit;
  for (const [k, v] of u.searchParams) {
    if (["select", "order", "on_conflict"].includes(k)) continue;
    if (k === "limit") { limit = +v; continue; }
    const i = v.indexOf("."); filters.push([k, v.slice(0, i), v.slice(i + 1)]);
  }
  const prefer = (opt.headers.prefer || ""); const body = opt.body ? JSON.parse(opt.body) : null;
  if (method === "GET") { const out = rows.filter((r) => match(r, filters)); return res(limit ? out.slice(0, limit) : out); }
  if (method === "POST") { const row = { ...(DEF[table] ? DEF[table]() : {}), ...body }; rows.push(row); return prefer.includes("representation") ? res([row], 201) : new Response("", { status: 201 }); }
  if (method === "PATCH") { const hit = rows.filter((r) => match(r, filters)); hit.forEach((r) => Object.assign(r, JSON.parse(JSON.stringify(body)), { updated_at: new Date().toISOString() })); return prefer.includes("representation") ? res(hit) : new Response(null, { status: 204 }); }
  if (method === "DELETE") { const keep = rows.filter((r) => !match(r, filters)); rows.length = 0; rows.push(...keep); return new Response(null, { status: 204 }); }
  throw new Error("unexpected " + method);
};

T.ls_clients.push({ ...DEF.ls_clients(), slug: "kfir", name: "Easy Landing", owner_phone: "972526359513", wa_phone_number_id: "PNID" });
