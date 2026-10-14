// The lead system end to end, against a fake Supabase (PostgREST), a fake WhatsApp Graph API and a fake Anthropic API.
// Run: node scripts/tests/lead-system.test.mjs  (from the repo root; needs demos/node_modules for @anthropic-ai/sdk)
import assert from "node:assert/strict";
import { createHmac, createHash, randomUUID } from "node:crypto";
const F = new URL("../../demos/netlify/functions/", import.meta.url).href;
Object.assign(process.env, { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_KEY: "sb_secret_test", WA_TOKEN: "tok", WA_APP_SECRET: "appsecret", WA_VERIFY_TOKEN: "verify-me", LEADS_ADMIN_KEY: "admin-key-0123456789", ANTHROPIC_API_KEY: "sk-test" });

const T = { ls_clients: [], ls_leads: [], ls_messages: [], ls_reports: [], ls_visits: [], ls_links: [], ls_testimonials: [], ls_stats: [], ls_drafts: [] };
const sent = []; let aiReply = ""; let graphDown = false;
const store = new Map(); let storageDown = false; // the private "lead-photos" bucket (0005_lead_photos.sql)
const DEF = {
  ls_clients: { package: "ai", active: true, allowed_origins: [], tpl_lang: "he", tpl_lead_ack: "lead_ack", tpl_owner_alert: "owner_new_lead", tpl_owner_reminder: "owner_reminder", tpl_monthly_report: "monthly_report", auto_reply: true, owner_alerts: true, reminders: true, monthly_report: true, remind_after_min: 60, work_start: 8, work_end: 20, work_days: [0,1,2,3,4,5] },
  ls_leads: () => ({ id: randomUUID(), status: "new", channel: "form", reminded_at: null, handled_at: null, last_inbound_at: null, note: null, created_at: new Date().toISOString() }),
  ls_messages: () => ({ id: Math.random(), created_at: new Date().toISOString() }),
  ls_testimonials: () => ({ id: randomUUID(), hidden: false, stars: null, created_at: new Date().toISOString() }),
};
function match(row, filters) {
  return filters.every(([col, op, val]) => {
    const v = row[col];
    if (op === "eq") return String(v) === val;
    if (op === "is") return val === "null" ? v == null : String(v) === val;
    if (op === "in") return val.slice(1, -1).split(",").includes(String(v));
    const a = new Date(v).getTime(), b = new Date(val).getTime();
    return op === "gte" ? a >= b : op === "lte" ? a <= b : op === "lt" ? a < b : op === "gt" ? a > b : false;
  });
}
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url); const method = opt.method || "GET";
  if (u.pathname.startsWith("/storage/v1/object/")) {
    assert.equal(opt.headers.apikey, "sb_secret_test"); assert.ok(opt.signal, "storage call has a timeout");
    const path = decodeURIComponent(u.pathname.slice("/storage/v1/object/".length));
    if (storageDown) return new Response("down", { status: 503 });
    if (method === "POST") { assert.match(opt.headers["content-type"], /^image\/(jpeg|webp)$/); store.set(path, Buffer.from(opt.body)); return new Response("{}", { status: 200 }); }
    if (method === "DELETE") { assert.equal(path, "lead-photos"); for (const p of JSON.parse(opt.body).prefixes) store.delete("lead-photos/" + p); return new Response("[]", { status: 200 }); }
    return store.has(path) ? new Response(store.get(path), { status: 200 }) : new Response("{}", { status: 400 });
  }
  const body = opt.body ? JSON.parse(opt.body) : null;
  const res = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  if (u.host === "graph.facebook.com") { assert.equal(opt.headers.authorization, "Bearer tok"); assert.ok(opt.signal, "graph call has a timeout"); sent.push({ path: u.pathname, ...body });
    if (graphDown) return res({ error: { message: "Template not approved", code: 132001 } }, 400);
    return res({ messages: [{ id: "wamid." + sent.length }] }); }
  if (u.host === "api.anthropic.com") return res({ id: "m", type: "message", role: "assistant", model: "x", stop_reason: "end_turn", content: [{ type: "text", text: aiReply }], usage: { input_tokens: 1, output_tokens: 1 } });
  assert.equal(u.host, "x.supabase.co"); assert.equal(opt.headers.apikey, "sb_secret_test"); assert.ok(opt.signal, "db call has a timeout"); assert.ok(!opt.headers.authorization);
  if (u.pathname === "/rest/v1/rpc/ls_add_visit") { // the SQL function in 0003_reports.sql
    const b = JSON.parse(opt.body); assert.match(b.p_day, /^\d{4}-\d{2}-\d{2}$/);
    const row = T.ls_visits.find((v) => v.client_slug === b.p_slug && v.day === b.p_day && v.source === b.p_source);
    if (row) row.visits++; else T.ls_visits.push({ client_slug: b.p_slug, day: b.p_day, source: b.p_source, visits: 1 });
    return new Response(null, { status: 204 });
  }
  if (u.pathname === "/rest/v1/rpc/ls_add_stat") { // 0013_stats.sql
    const b = JSON.parse(opt.body); assert.ok(["device", "hour", "act"].includes(b.p_kind));
    const row = T.ls_stats.find((v) => v.client_slug === b.p_slug && v.day === b.p_day && v.kind === b.p_kind && v.label === b.p_label);
    if (row) row.n++; else T.ls_stats.push({ client_slug: b.p_slug, day: b.p_day, kind: b.p_kind, label: b.p_label, n: 1 });
    return new Response(null, { status: 204 });
  }
  const table = u.pathname.split("/").pop(); const rows = T[table]; assert.ok(rows, table);
  const filters = []; let order, limit;
  for (const [k, v] of u.searchParams) {
    if (k === "select" || k === "on_conflict") continue;
    if (k === "order") { order = v; continue; } if (k === "limit") { limit = +v; continue; }
    const i = v.indexOf("."); filters.push([k, v.slice(0, i), v.slice(i + 1)]);
  }
  const prefer = opt.headers.prefer || "";
  if (method === "GET") {
    let out = rows.filter((r) => match(r, filters));
    if (order) { const [c, d] = order.split("."); out.sort((a, b) => (a[c] > b[c] ? 1 : -1) * (d === "desc" ? -1 : 1)); }
    return res(limit ? out.slice(0, limit) : out);
  }
  if (method === "POST") {
    const list = Array.isArray(body) ? body : [body]; const made = [];
    for (const b of list) {
      const conflict = u.searchParams.get("on_conflict");
      if (conflict) { const keys = conflict.split(","); const ex = rows.find((r) => keys.every((k) => r[k] != null && r[k] === b[k]));
        if (ex) { if (prefer.includes("merge-duplicates")) Object.assign(ex, b); continue; } }
      const d = typeof DEF[table] === "function" ? DEF[table]() : { ...(DEF[table] || {}) };
      const row = { ...d, ...b }; rows.push(row); made.push(row);
    }
    return prefer.includes("return=representation") ? res(made, 201) : new Response("", { status: 201 });
  }
  if (method === "DELETE") { const keep = rows.filter((r) => !match(r, filters)); const gone = rows.filter((r) => match(r, filters)); rows.length = 0; rows.push(...keep); return prefer.includes("return=representation") ? res(gone) : new Response(null, { status: 204 }); }
  if (method === "PATCH") { const hit = rows.filter((r) => match(r, filters)); hit.forEach((r) => Object.assign(r, body)); return prefer.includes("return=representation") ? res(hit) : new Response(null, { status: 204 }); }
  throw new Error("unexpected " + method);
};

const key = "owner-key-abcdefghijklmnop";
T.ls_clients.push({ ...DEF.ls_clients, slug: "oren", name: "אורן מים", owner_phone: "972501111111", wa_phone_number_id: "PNID", allowed_origins: ["https://oren.co.il"], key_hash: createHash("sha256").update(key).digest("hex"), chat_facts: "אינסטלטור בחדרה" });
T.ls_clients.push({ ...DEF.ls_clients, slug: "off", name: "מושהה", active: false });

const lead = (await import(F + "lead.mjs")).default;
const hook = (await import(F + "wa-webhook.mjs")).default;
const api = (await import(F + "leads-api.mjs")).default;
const chat = (await import(F + "client-chat.mjs")).default;
const lib = await import(new URL("../../demos/netlify/lib/leads.mjs", import.meta.url).href);
const post = (path, body, headers = {}) => new Request("https://service-pro-web.netlify.app" + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const ctx = (client) => ({ params: { client } });

// --- lead intake
let r = await lead(new Request("https://service-pro-web.netlify.app/api/lead/oren", { method: "OPTIONS", headers: { origin: "https://oren.co.il" } }), ctx("oren"));
assert.equal(r.status, 204); assert.equal(r.headers.get("access-control-allow-origin"), "https://oren.co.il");
r = await lead(post("/api/lead/oren", { name: "דנה", phone: "050-2222222" }, { origin: "https://evil.com" }), ctx("oren")); assert.equal(r.status, 403);
r = await lead(post("/api/lead/off", { name: "דנה", phone: "0502222222" }), ctx("off")); assert.equal(r.status, 409);
r = await lead(post("/api/lead/nope", { name: "דנה", phone: "0502222222" }), ctx("nope")); assert.equal(r.status, 404);
r = await lead(post("/api/lead/oren", { name: "דנה", phone: "123" }), ctx("oren")); assert.equal(r.status, 422);
r = await lead(post("/api/lead/oren", { name: "בוט", phone: "0502222222", company: "x" }), ctx("oren")); assert.equal(r.status, 200); assert.equal(T.ls_leads.length, 0);
r = await lead(post("/api/lead/oren", { name: "דנה כהן", phone: "+972 50-222-2222", service: "נזילה\nבמטבח", message: "מתחת לכיור", source: "Facebook", page: "https://oren.co.il/" }, { origin: "https://oren.co.il" }), ctx("oren"));
let out = await r.json(); assert.equal(r.status, 200, JSON.stringify(out)); assert.ok(out.ok && out.id);
assert.equal(T.ls_leads.length, 1); const L = T.ls_leads[0];
assert.equal(L.phone, "0502222222"); assert.equal(L.phone_intl, "972502222222"); assert.equal(L.source, "facebook"); assert.equal(L.auto_reply, "sent"); assert.equal(L.owner_alert, "sent");
assert.equal(sent.length, 2);
const ack = sent.find((s) => s.template.name === "lead_ack"), alert = sent.find((s) => s.template.name === "owner_new_lead");
assert.equal(ack.to, "972502222222"); assert.equal(ack.path, "/v23.0/PNID/messages");
assert.deepEqual(ack.template.components[0].parameters.map((p) => p.text), ["דנה", "נזילה במטבח"]);
assert.equal(alert.to, "972501111111"); assert.equal(alert.template.components[1].parameters[0].payload, "done:" + L.id);
assert.deepEqual(alert.template.components[0].parameters.map((p) => p.text), ["דנה כהן", "0502222222", "נזילה במטבח", "מתחת לכיור", "פייסבוק"]);
// duplicate within 10 minutes
r = await lead(post("/api/lead/oren", { name: "דנה כהן", phone: "0502222222" }), ctx("oren")); out = await r.json(); assert.ok(out.duplicate); assert.equal(sent.length, 2);
// landline: stored, no auto reply
r = await lead(post("/api/lead/oren", { name: "משה", phone: "04-6222222" }), ctx("oren")); assert.equal(r.status, 200);
assert.equal(T.ls_leads[1].auto_reply, "skipped"); assert.equal(sent.length, 3);

// --- webhook
r = await hook(new Request("https://s/api/wa-webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42")); assert.equal(await r.text(), "42");
r = await hook(new Request("https://s/api/wa-webhook?hub.mode=subscribe&hub.verify_token=no&hub.challenge=42")); assert.equal(r.status, 403);
const wh = (payload) => { const raw = JSON.stringify(payload); return new Request("https://s/api/wa-webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": "sha256=" + createHmac("sha256", "appsecret").update(raw).digest("hex") } }); };
r = await hook(new Request("https://s/api/wa-webhook", { method: "POST", body: "{}", headers: { "x-hub-signature-256": "sha256=00" } })); assert.equal(r.status, 401);
const val = (v) => ({ entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "PNID" }, ...v } }] }] });
r = await hook(wh(val({ statuses: [{ id: "wamid.1", status: "delivered" }, { id: "wamid.2", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] }] }))); assert.equal(r.status, 200);
assert.equal(T.ls_messages.find((m) => m.wa_id === "wamid.1").status, "delivered");
assert.match(T.ls_messages.find((m) => m.wa_id === "wamid.2").error, /131026/);
// the lead writes back
r = await hook(wh(val({ messages: [{ from: "972502222222", id: "in1", type: "text", text: { body: "תודה, מתי תגיעו?" } }] }))); assert.equal(r.status, 200);
assert.ok(L.last_inbound_at);
// owner taps the button, twice (Meta retry)
const tap = val({ messages: [{ from: "972501111111", id: "in2", type: "button", button: { text: "טיפלתי", payload: "done:" + L.id } }] });
await hook(wh(tap)); await hook(wh(tap));
assert.equal(L.status, "handled"); assert.ok(L.handled_at);
assert.equal(sent.filter((s) => s.type === "text").length, 1); assert.match(sent.at(-1).text.body, /סומן כטופל: דנה כהן/);

// --- reminders: lead 2 (landline) is 2 hours old, on a Tuesday 10:00 Israel time
T.ls_leads[1].created_at = "2026-10-06T05:00:00Z";
const tue10 = new Date("2026-10-06T07:00:00Z");
let rem = await lib.runReminders(tue10); assert.equal(rem.reminders, 1);
assert.equal(sent.at(-1).template.name, "owner_reminder"); assert.equal(sent.at(-1).template.components[0].parameters[2].text, "שעתיים");
rem = await lib.runReminders(tue10); assert.equal(rem.reminders, 0, "never twice");
T.ls_leads[1].reminded_at = null;
rem = await lib.runReminders(new Date("2026-10-06T20:00:00Z")); assert.equal(rem.reminders, 0, "23:00 is outside working hours");
rem = await lib.runReminders(new Date("2026-10-10T07:00:00Z")); assert.equal(rem.reminders, 0, "Saturday");
T.ls_leads[1].reminded_at = "x";

// --- panel API
const get = (q, auth) => new Request("https://service-pro-web.netlify.app/api/leads" + q, { headers: { authorization: auth } });
r = await api(get("", "Bearer oren:wrong-key-wrong-key")); assert.equal(r.status, 401);
r = await api(get("", "Bearer oren:" + key)); out = await r.json(); assert.equal(r.status, 200); assert.equal(out.leads.length, 2); assert.equal(out.client.name, "אורן מים"); assert.ok(!("key_hash" in out.client));
assert.equal(out.messages.length, 1);
r = await api(get("?client=off", "Bearer oren:" + key)); out = await r.json(); assert.equal(out.client.slug, "oren", "an owner can't read another business");
const patch = (b, auth, q = "") => new Request("https://service-pro-web.netlify.app/api/leads" + q, { method: "PATCH", headers: { authorization: auth }, body: JSON.stringify(b) });
const handledAt = L.handled_at;
r = await api(patch({ id: L.id, status: "won", note: "קבענו לשלישי" }, "Bearer oren:" + key)); out = await r.json();
assert.equal(out.lead.status, "won"); assert.equal(out.lead.handled_at, handledAt, "first handled time kept");
r = await api(patch({ id: L.id, status: "bogus" }, "Bearer oren:" + key)); assert.equal(r.status, 400);
r = await api(get("", "Bearer admin:admin-key-0123456789")); out = await r.json(); assert.equal(out.clients.length, 2);
r = await api(post("/api/leads", { run: "report", client: "oren", month: "2026-10", send: false }, { authorization: "Bearer admin:admin-key-0123456789" })); out = await r.json();
assert.equal(out.total, 2); assert.equal(out.handled, 1); assert.equal(T.ls_reports.length, 1);
r = await api(post("/api/leads", { run: "reminders" }, { authorization: "Bearer oren:" + key })); assert.equal(r.status, 403);

// --- the client's AI chat
aiReply = "תודה רונית, קיבלנו ונחזור אליכם היום. [[lead:רונית לוי|054-3333333|נזילה בגג|נזילה מהתקרה בסלון בחדרה, מבקשת להגיע מחר בבוקר]]";
r = await chat(post("/api/chat/oren", { messages: [{ role: "user", content: "יש לי נזילה, רונית 0543333333" }] }, { origin: "https://oren.co.il" }), ctx("oren"));
out = await r.json(); assert.equal(r.status, 200, JSON.stringify(out)); assert.ok(out.lead); assert.ok(!out.reply.includes("[["));
const C = T.ls_leads.at(-1); assert.equal(C.channel, "chat"); assert.equal(C.phone, "0543333333"); assert.match(C.message, /סלון/);
aiReply = "תודה. [[lead:רונית|12|נזילה|x]]";
r = await chat(post("/api/chat/oren", { messages: [{ role: "user", content: "רונית 12" }] }), ctx("oren")); out = await r.json(); assert.match(out.reply, /לא נראה תקין/);
r = await chat(post("/api/chat/off", { messages: [{ role: "user", content: "היי" }] }), ctx("off")); assert.equal(r.status, 503);

// --- the owner alert fails: lead stored, but the page is told to fall back to WhatsApp
graphDown = true;
r = await lead(post("/api/lead/oren", { name: "יוסי", phone: "0527777777", service: "דוד" }), ctx("oren"));
out = await r.json(); assert.equal(r.status, 202); assert.equal(out.ok, false); assert.equal(out.error, "alert_failed");
const Y = T.ls_leads.find((l) => l.phone === "0527777777"); assert.ok(Y); assert.equal(Y.owner_alert, "failed");
let h = await lib.healthCheck(); assert.equal(h.ok, false); assert.equal(h.ownerAlertsFailed, 2, "Dana (failed delivery reported by Meta earlier) and Yossi"); assert.deepEqual(h.clients, ["oren"]);
// a reminder that fails is retried next run
Y.created_at = "2026-10-06T05:00:00Z";
rem = await lib.runReminders(tue10); assert.equal(rem.reminders, 0); assert.equal(rem.failed, 1); assert.equal(Y.reminded_at, null, "failed reminder is retried");
graphDown = false;
rem = await lib.runReminders(tue10); assert.equal(rem.reminders, 1); assert.ok(Y.reminded_at);
// the chat: alert failed -> WhatsApp button
graphDown = true;
aiReply = "תודה. [[lead:מיכל|0548888888|נזילה|נזילה בחדר רחצה]]";
r = await chat(post("/api/chat/oren", { messages: [{ role: "user", content: "מיכל 0548888888" }] }), ctx("oren")); out = await r.json();
assert.equal(out.lead, false); assert.match(out.reply, /\[\[whatsapp:/);
graphDown = false;

// --- delivery failure reported later by Meta marks the lead
const okLead = await lib.processLead(T.ls_clients[0], { name: "אבי", phone: "0529999999" });
assert.equal(okLead.ok, true);
const alertMsg = T.ls_messages.find((m) => m.lead_id === okLead.id && m.kind === "owner_alert");
await hook(wh(val({ statuses: [{ id: alertMsg.wa_id, status: "failed", errors: [{ code: 131049, title: "Not delivered" }] }] })));
assert.equal(T.ls_leads.find((l) => l.id === okLead.id).owner_alert, "failed");
// statuses never go backwards
const ack2 = T.ls_messages.find((m) => m.lead_id === okLead.id && m.kind === "lead_ack");
await hook(wh(val({ statuses: [{ id: ack2.wa_id, status: "read" }] }))); await hook(wh(val({ statuses: [{ id: ack2.wa_id, status: "delivered" }] })));
assert.equal(ack2.status, "read");

// --- owner taps "טיפלתי" on a deleted lead: no crash, answered once
const gone = "99999999-9999-4999-8999-999999999999";
r = await hook(wh(val({ messages: [{ from: "972501111111", id: "in-gone", type: "button", button: { text: "טיפלתי", payload: "done:" + gone } }] })));
assert.equal(r.status, 200); assert.match(sent.at(-1).text.body, /כבר לא במערכת/);

// --- retention: two years
T.ls_leads.push({ ...DEF.ls_leads(), client_slug: "oren", name: "ישן", phone: "0501010101", phone_intl: "972501010101", created_at: "2024-01-01T00:00:00Z" });
const del = await lib.deleteOldLeads(new Date("2026-10-10T00:00:00Z")); assert.equal(del.deleted, 1); assert.ok(!T.ls_leads.some((l) => l.name === "ישן"));

// --- panel API: Origin null doesn't crash
r = await api(new Request("https://service-pro-web.netlify.app/api/leads", { headers: { authorization: "Bearer oren:" + key, origin: "null" } })); assert.equal(r.status, 403);

// --- a photo with the enquiry: stored privately, linked in the alert (one line), shown in the panel, deleted with the lead
const JPEG = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]).toString("base64");
r = await lead(post("/api/lead/oren", { name: "רון", phone: "0503333333", service: "נזילה", message: "מתחת לכיור", photo: JPEG }, { origin: "https://oren.co.il", "x-nf-client-connection-ip": "10.0.0.1" }), ctx("oren"));
out = await r.json(); assert.ok(out.ok, JSON.stringify(out));
const PL = T.ls_leads.find((l) => l.id === out.id); assert.equal(PL.photo, `oren/${PL.id}.jpg`); assert.ok(store.has("lead-photos/" + PL.photo));
const palert = sent.at(-1); assert.equal(palert.template.name, "owner_new_lead");
const p4 = palert.template.components[0].parameters[3].text;
assert.ok(!/\n/.test(p4), "a template parameter takes no line break");
assert.equal(p4, "מתחת לכיור · תמונה: " + lib.photoLink(PL.id)); assert.match(lib.photoLink(PL.id), /^https:\/\/service-pro-web\.netlify\.app\/p\/[0-9a-f-]{36}\.[\w-]{22}$/);
// not a photo, or too big: the lead goes in without one
r = await lead(post("/api/lead/oren", { name: "גל", phone: "0503333334", photo: "data:image/jpeg;base64," + Buffer.from("<svg onload=x>").toString("base64") }, { "x-nf-client-connection-ip": "10.0.0.2" }), ctx("oren"));
out = await r.json(); assert.ok(out.ok); assert.equal(T.ls_leads.find((l) => l.id === out.id).photo, undefined);
assert.equal(lib.decodePhoto("data:image/png;base64,iVBORw0KGgo="), null);
assert.equal(lib.decodePhoto("data:image/jpeg;base64," + Buffer.alloc(1_048_577, 0xff).toString("base64")), null);
// storage down: the lead and the alert still go out, and the alert says the photo was lost
storageDown = true;
r = await lead(post("/api/lead/oren", { name: "טל", phone: "0503333335", photo: JPEG }, { "x-nf-client-connection-ip": "10.0.0.3" }), ctx("oren")); out = await r.json(); storageDown = false;
assert.ok(out.ok, JSON.stringify(out)); assert.equal(T.ls_leads.find((l) => l.id === out.id).photo, undefined);
assert.match(sent.at(-1).template.components[0].parameters[3].text, /^הלקוח צירף תמונה, והיא לא נשמרה$/);
// the private link
const pic = (await import(F + "lead-photo.mjs")).default;
const getPic = (token) => pic(new Request("https://service-pro-web.netlify.app/p/" + token), { params: { token } });
const token = lib.photoLink(PL.id).split("/p/")[1];
r = await getPic(token); assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/jpeg");
assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow"); assert.match(r.headers.get("cache-control"), /^private/);
assert.deepEqual(Buffer.from(await r.arrayBuffer()), store.get("lead-photos/" + PL.photo));
r = await getPic(PL.id + ".AAAAAAAAAAAAAAAAAAAAAA"); assert.equal(r.status, 404, "a guessed signature");
r = await getPic(T.ls_leads[0].id + "." + token.split(".")[1]); assert.equal(r.status, 404, "another lead's signature");
r = await getPic("../../etc/passwd"); assert.equal(r.status, 404);
// the panel gets the link, never the storage path
r = await api(get("", "Bearer oren:" + key)); out = await r.json();
const pl = out.leads.find((l) => l.id === PL.id); assert.equal(pl.photo_url, lib.photoLink(PL.id)); assert.ok(!("photo" in pl));
assert.ok(out.leads.filter((l) => l.id !== PL.id).every((l) => l.photo_url === null));
// two years on, the photo goes with its lead
PL.created_at = "2024-01-01T00:00:00Z";
await lib.deleteOldLeads(new Date("2026-10-10T00:00:00Z")); assert.ok(!store.has("lead-photos/" + PL.photo), "the photo is deleted too");

const vreqLink = async (code) => (await import(F + "visit.mjs")).default(new Request("https://service-pro-web.netlify.app/api/visit/oren", {
  method: "POST", body: JSON.stringify({ page: "https://oren.co.il/?s=" + code, referrer: "https://www.facebook.com/", source: "t-" + code }),
  headers: { "content-type": "text/plain", origin: "https://oren.co.il", "user-agent": "Mozilla/5.0 (iPhone)", "x-nf-client-connection-ip": "10.0.2.1" } }), ctx("oren"));
// --- tagged links: the owner names one per group, and sees the name with its visits and leads
const owner = { authorization: "Bearer oren:" + key, "x-nf-client-connection-ip": "10.0.1.1" };
r = await api(post("/api/leads", { link: "קבוצת השכונה\nבפייסבוק" }, owner)); out = await r.json(); assert.equal(r.status, 200, JSON.stringify(out));
const LK = out.link; assert.equal(LK.label, "קבוצת השכונה בפייסבוק"); assert.match(LK.code, /^[a-hj-km-np-z2-9]{4}$/);
assert.equal(LK.url, "https://oren.co.il/?s=" + LK.code, "the business's own site");
r = await api(post("/api/leads", { link: "קבוצת השכונה בפייסבוק" }, owner)); assert.equal(r.status, 400); assert.equal((await r.json()).error, "label_taken");
r = await api(post("/api/leads", { link: " א " }, owner)); assert.equal((await r.json()).error, "bad_label");
r = await api(post("/api/leads", { link: "<b>x</b>".repeat(10) }, owner)); out = await r.json(); assert.equal(out.link.label.length, 40, "clipped, and shown as text only");
r = await api(post("/api/leads", { unlink: out.link.code }, owner)); assert.equal(r.status, 200);
r = await api(post("/api/leads", { link: "x".repeat(5) }, { "x-nf-client-connection-ip": "10.0.1.2" })); assert.equal(r.status, 401);
// a visit and a lead through the link
await vreqLink(LK.code);
r = await lead(post("/api/lead/oren", { name: "נועה", phone: "0503333336", source: "t-" + LK.code }, { origin: "https://oren.co.il", "x-nf-client-connection-ip": "10.0.0.4" }), ctx("oren"));
assert.ok((await r.json()).ok);
assert.equal(sent.at(-1).template.components[0].parameters[4].text, "קבוצת השכונה בפייסבוק", "the alert says which group");
r = await api(get("", "Bearer oren:" + key)); out = await r.json();
assert.deepEqual(out.links.map((l) => [l.label, l.visits, l.leads]), [["קבוצת השכונה בפייסבוק", 1, 1]]);
// an unknown or deleted code still goes through, shown as is
assert.equal(lib.sourceName("t-zzzz", {}), "t-zzzz"); assert.equal(lib.sourceName("google.com", {}), "גוגל");
// an owner can't touch another business's link
T.ls_links.push({ client_slug: "off", code: "abcd", label: "של מישהו אחר", created_at: new Date().toISOString() });
r = await api(post("/api/leads", { unlink: "abcd" }, owner)); assert.equal(r.status, 404); assert.ok(T.ls_links.some((l) => l.code === "abcd"));
r = await api(post("/api/leads", { unlink: "../x" }, owner)); assert.equal(r.status, 400);
// the admin manages a business's links with ?client=
r = await api(post("/api/leads?client=off", { unlink: "abcd" }, { authorization: "Bearer admin:admin-key-0123456789" })); assert.equal(r.status, 200);
// at most 30 per business
for (let i = 0; i < 29; i++) T.ls_links.push({ client_slug: "oren", code: "q" + String(i).padStart(3, "0").replace(/0/g, "a").replace(/1/g, "b"), label: "קישור " + i, created_at: new Date().toISOString() });
r = await api(post("/api/leads", { link: "עוד אחד" }, owner)); assert.equal((await r.json()).error, "too_many_links");
T.ls_links.length = 0;

// --- "available now": the owner writes "עסוק" / "פנוי", the site says so; otherwise the working hours
const C0 = T.ls_clients[0];
const at = (iso) => new Date(iso);
assert.deepEqual(lib.availability({ ...C0 }, at("2026-07-07T07:00:00Z")), { state: "open", until: null, text: "זמינים היום עד 20:00." }); // Tuesday 10:00
assert.equal(lib.availability({ ...C0 }, at("2026-07-07T19:30:00Z")).text, "השאירו פרטים, ונחזור אליכם מחר מ-8:00."); // Tuesday 22:30
assert.equal(lib.availability({ ...C0 }, at("2026-07-07T03:00:00Z")).text, "השאירו פרטים, ונחזור אליכם היום מ-8:00."); // Tuesday 06:00
assert.equal(lib.availability({ ...C0 }, at("2026-07-11T08:00:00Z")).text, "השאירו פרטים, ונחזור אליכם מחר מ-8:00."); // Saturday 11:00, Sunday works
assert.equal(lib.availability({ ...C0, work_days: [1, 2, 3, 4] }, at("2026-07-09T19:30:00Z")).text, "השאירו פרטים, ונחזור אליכם ביום שני מ-8:00."); // Thursday night
assert.equal(lib.availability({ ...C0, work_start: 0, work_end: 24, work_days: [0, 1, 2, 3, 4, 5, 6] }).text, "זמינים 24/7.");
assert.deepEqual(lib.availability({ ...C0, avail: "busy", avail_until: "2026-07-07T09:30:00Z" }, at("2026-07-07T07:00:00Z")).text, "באמצע עבודה. חוזרים אליכם עד 12:30.");
assert.equal(lib.availability({ ...C0, avail: "busy", avail_until: "2026-07-07T06:00:00Z" }, at("2026-07-07T07:00:00Z")).state, "open", "it runs out by itself");
assert.deepEqual(lib.availabilityCommand("עסוק"), { avail: "busy", hours: 3 });
assert.deepEqual(lib.availabilityCommand(" עסוק 2! "), { avail: "busy", hours: 2 });
assert.deepEqual(lib.availabilityCommand("עסוק 99"), { avail: "busy", hours: 12 });
assert.deepEqual(lib.availabilityCommand("פנויה"), { avail: "free", hours: null });
assert.deepEqual(lib.availabilityCommand("אוטומטי"), { avail: null });
assert.deepEqual(lib.availabilityCommand("סטטוס"), { status: true });
assert.equal(lib.availabilityCommand("אני עסוק עכשיו, אחזור אליך"), null, "only the word itself");
// from WhatsApp: only the owner's number changes it
const before4 = sent.length;
await hook(wh(val({ messages: [{ from: "972509999999", id: "in-busy-x", type: "text", text: { body: "עסוק" } }] })));
assert.equal(C0.avail, undefined, "a customer writing עסוק changes nothing"); assert.equal(sent.length, before4);
await hook(wh(val({ messages: [{ from: "972501111111", id: "in-busy", type: "text", text: { body: "עסוק" } }] })));
assert.equal(C0.avail, "busy"); assert.ok(new Date(C0.avail_until) - Date.now() > 2.9 * 3600000);
assert.match(sent.at(-1).text.body, /^באתר כתוב עכשיו: באמצע עבודה\. חוזרים אליכם עד \d\d:\d\d\. כשתסיימו, כתבו "פנוי"\.$/);
await hook(wh(val({ messages: [{ from: "972501111111", id: "in-busy", type: "text", text: { body: "עסוק" } }] }))); // Meta retries
assert.equal(sent.filter((m) => m.text && /^באתר כתוב/.test(m.text.body)).length, 1, "answered once");
// the site reads it
const status = (await import(F + "status.mjs")).default;
const st = (slug) => status(new Request("https://service-pro-web.netlify.app/api/status/" + slug), ctx(slug));
r = await st("oren"); out = await r.json(); assert.equal(out.state, "busy"); assert.equal(r.headers.get("access-control-allow-origin"), "*");
assert.ok(!JSON.stringify(out).includes("972"), "no phone numbers");
r = await st("off"); assert.equal((await r.json()).state, null, "a paused business shows nothing");
r = await st("nope"); assert.equal((await r.json()).state, null);
r = await st("../x"); assert.equal((await r.json()).state, null);
await hook(wh(val({ messages: [{ from: "972501111111", id: "in-free", type: "text", text: { body: "פנוי" } }] })));
assert.equal(C0.avail, "free"); assert.equal((await (await st("oren")).json()).state, "free");
// the panel shows it and changes it
r = await api(get("", "Bearer oren:" + key)); out = await r.json(); assert.equal(out.availability.state, "free"); assert.equal(out.availability.manual, true);
r = await api(post("/api/leads", { available: "auto" }, owner)); out = await r.json(); assert.equal(out.availability.manual, false); assert.equal(C0.avail, null);
r = await api(post("/api/leads", { available: "busy", hours: 1 }, owner)); out = await r.json(); assert.equal(out.availability.state, "busy");
assert.ok(new Date(C0.avail_until) - Date.now() < 1.1 * 3600000);
r = await api(post("/api/leads", { available: "maybe" }, owner)); assert.equal(r.status, 400);
await api(post("/api/leads", { available: "auto" }, owner));
// emergency mode: "חירום" from the owner, the site says it with the area, a lead meanwhile is marked urgent in the alert
assert.deepEqual(lib.availabilityCommand("חירום"), { avail: "urgent", hours: 6 }); assert.deepEqual(lib.availabilityCommand("חירום 3"), { avail: "urgent", hours: 3 });
C0.area = "חדרה והשרון";
await hook(wh(val({ messages: [{ from: "972501111111", id: "in-urgent", type: "text", text: { body: "חירום" } }] })));
assert.equal(C0.avail, "urgent"); assert.ok(new Date(C0.avail_until) - Date.now() > 5.9 * 3600000);
assert.equal(sent.at(-1).text.body, "באתר כתוב עכשיו: זמינים עכשיו לקריאות דחופות בחדרה והשרון. כתבו או התקשרו. פניות שייכנסו עכשיו יסומנו כדחופות. לסיום, כתבו \"אוטומטי\".");
assert.equal((await (await st("oren")).json()).state, "urgent");
r = await lead(post("/api/lead/oren", { name: "רון", phone: "0503333331", service: "פיצוץ צינור", message: "דחיפות: עכשיו." }, { origin: "https://oren.co.il", "x-nf-client-connection-ip": "10.0.0.31" }), ctx("oren"));
assert.ok((await r.json()).ok);
assert.match(sent.at(-1).template.components[0].parameters[3].text, /^🚨 קריאה בזמן מצב חירום · דחיפות: עכשיו\.$/);
r = await api(post("/api/leads", { available: "urgent" }, owner)); out = await r.json(); assert.equal(out.availability.state, "urgent");
await api(post("/api/leads", { available: "auto" }, owner));
r = await lead(post("/api/lead/oren", { name: "רון", phone: "0503333332", service: "סתימה", message: "דחיפות: השבוע." }, { origin: "https://oren.co.il", "x-nf-client-connection-ip": "10.0.0.32" }), ctx("oren"));
assert.ok((await r.json()).ok); assert.ok(!/🚨/.test(sent.at(-1).template.components[0].parameters[3].text), "not after it ends");
// the owner teaches the chats and changes prices on WhatsApp (0016_owner_notes.sql, builder.mjs ownerPrice)
assert.deepEqual(lib.ownerCommand("מחיר פתיחת סתימה 350-550"), { price: { service: "פתיחת סתימה", value: "350 עד 550 ₪" } });
assert.deepEqual(lib.ownerCommand("מחיר דוד חשמל 1,200 עד 2,800 ₪"), { price: { service: "דוד חשמל", value: "1,200 עד 2,800 ₪" } });
assert.deepEqual(lib.ownerCommand("מחיר החלפת ברז מ-250"), { price: { service: "החלפת ברז", value: "מ-250 ₪" } });
assert.deepEqual(lib.ownerCommand("מחיר איתור נזילה בלי מחיר"), { price: { service: "איתור נזילה", value: "לפי הצעת מחיר" } });
assert.equal(lib.ownerCommand("מחיר סתימה 550-350"), null, "a range backwards is not a price");
assert.deepEqual(lib.ownerCommand("למד: לא עובדים בשבת"), { learn: "לא עובדים בשבת" });
assert.deepEqual(lib.ownerCommand("מה למדת?"), { notes: true }); assert.deepEqual(lib.ownerCommand("שכח 2"), { forget: 2 });
assert.equal(lib.ownerCommand("כמה עולה סתימה?"), null, "a question is not a command");
{
  const before = sent.length;
  await hook(wh(val({ messages: [{ from: "972509999999", id: "in-learn-x", type: "text", text: { body: "למד: הכול חינם" } }] })));
  assert.ok(!(C0.owner_notes || []).length, "only the owner teaches"); assert.equal(sent.length, before);
  await hook(wh(val({ messages: [{ from: "972501111111", id: "in-learn-1", type: "text", text: { body: "למד: לא עובדים בשבת ובחגים" } }] })));
  await hook(wh(val({ messages: [{ from: "972501111111", id: "in-learn-1", type: "text", text: { body: "למד: לא עובדים בשבת ובחגים" } }] }))); // Meta retries
  await hook(wh(val({ messages: [{ from: "972501111111", id: "in-learn-2", type: "text", text: { body: "לידיעה: חניה בתשלום על חשבון הלקוח" } }] })));
  assert.deepEqual(C0.owner_notes.map((n) => n.text), ["לא עובדים בשבת ובחגים", "חניה בתשלום על חשבון הלקוח"], "once each");
  assert.match(sent.at(-1).text.body, /^למדנו \(2\): חניה/);
  assert.match(lib.factsOf(C0), /מה שבעל העסק עדכן[\s\S]*- לא עובדים בשבת ובחגים/, "the chats read it");
  await hook(wh(val({ messages: [{ from: "972501111111", id: "in-notes", type: "text", text: { body: "מה למדת" } }] })));
  assert.match(sent.at(-1).text.body, /1\. לא עובדים בשבת ובחגים\n2\. חניה/);
  await hook(wh(val({ messages: [{ from: "972501111111", id: "in-forget", type: "text", text: { body: "שכח 1" } }] })));
  assert.deepEqual(C0.owner_notes.map((n) => n.text), ["חניה בתשלום על חשבון הלקוח"]); assert.match(sent.at(-1).text.body, /^נמחק: לא עובדים/);
  // a site not built in the builder: the price becomes something the chats know
  await hook(wh(val({ messages: [{ from: "972501111111", id: "in-price", type: "text", text: { body: "מחיר פתיחת סתימה 350-550" } }] })));
  assert.equal(C0.owner_notes.at(-1).text, "מחיר פתיחת סתימה: 350 עד 550 ₪"); assert.match(sent.at(-1).text.body, /^רשמנו: פתיחת סתימה, 350 עד 550 ₪/);
  await hook(wh(val({ messages: [{ from: "972501111111", id: "in-prices", type: "text", text: { body: "מחירים" } }] })));
  assert.match(sent.at(-1).text.body, /כדי לעדכן מחיר/);
  C0.owner_notes = [];
}
// the owner's average job value: saved, cleared, checked; the panel gets it with this month's "נסגר" count
r = await api(post("/api/leads", { job_value: 450 }, owner)); out = await r.json(); assert.equal(out.job_value, 450); assert.equal(C0.job_value, 450);
r = await api(post("/api/leads", { job_value: -5 }, owner)); assert.equal(r.status, 400);
r = await api(post("/api/leads", { job_value: "abc" }, owner)); assert.equal(r.status, 400);
T.ls_leads.filter((l) => l.client_slug === "oren").slice(-1)[0].status = "won";
r = await api(get("", "Bearer oren:" + key)); out = await r.json();
assert.equal(out.client.job_value, 450); assert.ok(out.month.won >= 1, "won this month");
r = await api(post("/api/leads", { job_value: null }, owner)); assert.equal((await r.json()).job_value, null);

// --- when to call back: the visitor's choice becomes a time; the alert says it, the reminder waits for it
const cbNow = at("2026-07-07T07:00:00Z"); // Tuesday 10:00 in Israel
assert.equal(lib.callbackAt("היום אחרי 16:00", cbNow).toISOString(), "2026-07-07T13:00:00.000Z");
assert.equal(lib.callbackAt("מחר בבוקר", cbNow).toISOString(), "2026-07-08T06:00:00.000Z");
assert.equal(lib.callbackAt("בעוד שעה", cbNow).toISOString(), "2026-07-07T08:00:00.000Z");
assert.equal(lib.callbackAt("היום אחרי 16:00", at("2026-07-07T14:00:00Z")), null, "already past: as soon as possible");
assert.equal(lib.callbackAt("עכשיו", cbNow), null); assert.equal(lib.callbackAt("<script>", cbNow), null);
assert.equal(lib.callbackAt("מחר בבוקר", at("2026-12-07T08:00:00Z")).toISOString(), "2026-12-08T07:00:00.000Z", "winter time");
assert.equal(lib.callbackText(at("2026-07-07T13:00:00Z"), cbNow), "היום ב-16:00");
assert.equal(lib.callbackText(at("2026-07-08T06:00:00Z"), cbNow), "מחר ב-09:00");
assert.equal(lib.callbackText(at("2026-07-10T06:00:00Z"), cbNow), "ביום שישי ב-09:00");
r = await lead(post("/api/lead/oren", { name: "עדי", phone: "0503333337", service: "שיפוץ", callback: "בעוד שעה" }, { origin: "https://oren.co.il", "x-nf-client-connection-ip": "10.0.0.5" }), ctx("oren"));
out = await r.json(); assert.ok(out.ok);
const CB = T.ls_leads.find((l) => l.id === out.id); assert.ok(Math.abs(new Date(CB.callback_at) - Date.now() - 3600000) < 60000);
assert.match(sent.at(-1).template.components[0].parameters[3].text, /^ביקשו שתחזרו (היום|מחר) ב-\d\d:\d\d$/);
// the reminder: not after remind_after_min, but 5 minutes before the time they asked for
Object.assign(C0, { work_start: 0, work_end: 24, work_days: [0, 1, 2, 3, 4, 5, 6] });
CB.created_at = new Date(Date.now() - 2 * 3600000).toISOString(); // long past remind_after_min
const others = T.ls_leads.filter((l) => l !== CB && l.status === "new" && !l.reminded_at); others.forEach((l) => { l.reminded_at = "2026-01-01T00:00:00Z"; });
rem = await lib.runReminders(new Date()); assert.equal(rem.reminders, 0, "too early: they asked for a call in an hour");
rem = await lib.runReminders(new Date(Date.now() + 56 * 60000)); assert.equal(rem.reminders, 1);
const rt = sent.at(-1); assert.equal(rt.template.name, "owner_reminder");
assert.match(rt.template.components[0].parameters[3].text, /^שיפוץ · ביקשו שתחזרו היום ב-\d\d:\d\d$|^שיפוץ · ביקשו שתחזרו מחר ב-\d\d:\d\d$/);
others.forEach((l) => { l.reminded_at = null; });
Object.assign(C0, { work_start: 8, work_end: 20, work_days: [0, 1, 2, 3, 4, 5] });

// --- a review request after "טיפלתי": the owner approves each one, one per number, "הסר" stops it
const newLead = async (name, phone, ip) => { const x = await lead(post("/api/lead/oren", { name, phone, service: "נזילה" }, { origin: "https://oren.co.il", "x-nf-client-connection-ip": ip }), ctx("oren")); const j = await x.json(); return T.ls_leads.find((l) => l.id === j.id); };
const tapDone = (id, payload, title = "טיפלתי") => hook(wh(val({ messages: [{ from: "972501111111", id, type: "button", button: { text: title, payload } }] })));
const pickReply = (id, replyId) => hook(wh(val({ messages: [{ from: "972501111111", id, type: "interactive", interactive: { type: "button_reply", button_reply: { id: replyId, title: "x" } } }] })));
// off by default: "טיפלתי" answers as before
let RL = await newLead("שירה לוי", "0503333338", "10.0.0.6");
await tapDone("rv-0", "done:" + RL.id); assert.equal(sent.at(-1).text.body, "סומן כטופל: שירה לוי."); assert.equal(RL.review, undefined);
Object.assign(C0, { review_requests: true, review_url: "https://g.page/r/oren-mayim/review", tpl_review_request: "review_request" });
RL = await newLead("רז כהן", "0503333339", "10.0.0.7");
await tapDone("rv-1", "done:" + RL.id);
let ask = sent.at(-1); assert.equal(ask.type, "interactive"); assert.equal(ask.to, "972501111111");
assert.equal(ask.interactive.body.text, "סומן כטופל: רז כהן. לשלוח לרז בקשה לכתוב ביקורת בגוגל? זו הודעה אחת, פעם אחת.");
assert.deepEqual(ask.interactive.action.buttons.map((x) => x.reply.id), ["review:" + RL.id, "noreview:" + RL.id]);
assert.equal(RL.review, "asked");
const beforeRv = sent.length;
await pickReply("rv-2", "review:" + RL.id);
const req = sent.find((m, i) => i >= beforeRv && m.template && m.template.name === "review_request");
assert.equal(req.to, "972503333339"); assert.deepEqual(req.template.components[0].parameters.map((p) => p.text), ["רז", "אורן מים", "https://g.page/r/oren-mayim/review"]);
assert.equal(RL.review, "sent"); assert.equal(sent.at(-1).text.body, "נשלח לרז. תודה!");
await pickReply("rv-2", "review:" + RL.id); await pickReply("rv-3", "review:" + RL.id); // a retry, and a second tap
assert.equal(sent.filter((m) => m.template && m.template.name === "review_request").length, 1, "never twice"); assert.equal(sent.at(-1).text.body, "כבר טיפלנו בזה.");
// the same number again later: not asked again
T.ls_leads.filter((l) => l.phone_intl === "972503333339").forEach((l) => { l.created_at = "2026-01-01T00:00:00Z"; });
const RL2 = await newLead("רז כהן", "0503333339", "10.0.0.8");
await tapDone("rv-4", "done:" + RL2.id); assert.equal(sent.at(-1).text.body, "סומן כטופל: רז כהן."); assert.equal(RL2.review, undefined);
// the owner says no
const RL3 = await newLead("טל בר", "0503333340", "10.0.0.9");
await tapDone("rv-5", "done:" + RL3.id); await pickReply("rv-6", "noreview:" + RL3.id);
assert.equal(RL3.review, "skipped"); assert.equal(sent.at(-1).text.body, "בסדר, לא נשלח.");
// someone else can't approve
await hook(wh(val({ messages: [{ from: "972509999999", id: "rv-7", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "review:" + RL3.id, title: "x" } } }] })));
assert.equal(RL3.review, "skipped");
// "הסר": every lead of that number at this business
await hook(wh(val({ messages: [{ from: "972503333339", id: "rv-8", type: "text", text: { body: "הסר" } }] })));
assert.ok(T.ls_leads.filter((l) => l.phone_intl === "972503333339").every((l) => l.review === "optout"));
assert.equal(sent.at(-1).text.body, "הוסרתם. לא תקבלו מאיתנו הודעות כאלה יותר."); assert.equal(sent.at(-1).to, "972503333339");
// a landline is never asked
const RL4 = await newLead("קווי", "04-6333333", "10.0.0.10");
await tapDone("rv-9", "done:" + RL4.id); assert.equal(sent.at(-1).text.body, "סומן כטופל: קווי.");
Object.assign(C0, { review_requests: false });

// --- testimonials on the site: only an invited customer, once per enquiry, up at once, the owner can hide it
const tstFn = (await import(F + "testimonial.mjs")).default;
const tstList = (await import(F + "testimonials.mjs")).default;
const listNow = async () => (await (await tstList(new Request("https://s/api/testimonials/oren"), ctx("oren"))).json()).items;
const tPost = (body, ip = "10.1.0.1") => tstFn(post("/api/testimonial", body, { "x-nf-client-connection-ip": ip }), {});
const tGet = (tstToken) => tstFn(new Request("https://s/r/" + tstToken), { params: { token: tstToken } });
assert.deepEqual(await listNow(), [], "off: nothing");
Object.assign(C0, { testimonials: true, tpl_testimonial_request: "testimonial_request" }); lib.forgetClient("oren");
let TL = await newLead("נועה שחר", "0503333350", "10.0.0.20");
await tapDone("ts-1", "done:" + TL.id);
ask = sent.at(-1); assert.equal(ask.type, "interactive");
assert.equal(ask.interactive.body.text, "סומן כטופל: נועה שחר. לשלוח לנועה בקשה לכתוב המלצה לאתר? היא עולה מיד, ואפשר להסתיר אותה. זו הודעה אחת, פעם אחת.");
assert.deepEqual(ask.interactive.action.buttons.map((x) => x.reply.id), ["tst:" + TL.id, "noreview:" + TL.id]);
assert.equal(TL.testimonial, "asked"); assert.equal(TL.review, undefined);
await pickReply("ts-2", "tst:" + TL.id);
const tr = sent.find((m) => m.template && m.template.name === "testimonial_request");
assert.equal(tr.to, "972503333350");
const [p1, p2, link] = tr.template.components[0].parameters.map((p) => p.text);
assert.equal(p1, "נועה"); assert.equal(p2, "אורן מים"); assert.match(link, new RegExp("^https://service-pro-web\\.netlify\\.app/r/" + TL.id + "\\.[A-Za-z0-9_-]{22}$"));
assert.equal(TL.testimonial, "sent"); assert.match(sent.at(-1).text.body, /^נשלח לנועה\./);
const tstToken = link.split("/r/")[1];
// the form opens only from the real link
let pg = await tGet(tstToken); let html = await pg.text(); assert.equal(pg.status, 200); assert.match(html, /כמה מילים על אורן מים\?/); assert.match(html, /value="נועה"/); assert.match(html, /noindex/);
html = await (await tGet(TL.id + ".AAAAAAAAAAAAAAAAAAAAAA")).text(); assert.match(html, /הקישור כבר לא פעיל/, "a forged signature");
// plain words only, and nothing changes on a refusal
let tres = await tPost({ token: tstToken, name: "נועה", text: "מומלץ מאוד! www.spam.co.il" }); assert.equal(tres.status, 422); assert.equal((await tres.json()).error, "contact");
tres = await tPost({ token: tstToken, name: "נועה", text: "תתקשרו אליו 050-1234567 מעולה" }); assert.equal((await tres.json()).error, "contact");
tres = await tPost({ token: tstToken, name: "נועה", text: "טוב" }); assert.equal((await tres.json()).error, "short");
tres = await tPost({ token: tstToken, name: "נועה", text: "הגיע מהר ופתר את הסתימה בלי בלגן.", stars: 9 }); assert.equal((await tres.json()).error, "stars");
assert.equal(TL.testimonial, "sent"); assert.equal(T.ls_testimonials.length, 0);
const beforeT = sent.length;
tres = await tPost({ token: tstToken, name: "נועה <b>ש.</b>", text: "הגיע תוך שעה ופתר את הסתימה בלי בלגן. ממליצה!", stars: 5 });
let tj = await tres.json(); assert.equal(tres.status, 200, JSON.stringify(tj)); assert.equal(tj.site, "https://oren.co.il/");
assert.equal(T.ls_testimonials.length, 1); const T1 = T.ls_testimonials[0];
assert.equal(T1.name, "נועה b ש. /b"); assert.equal(T1.stars, 5); assert.equal(T1.lead_id, TL.id); assert.equal(TL.testimonial, "done");
const alertT = sent.slice(beforeT).find((m) => m.type === "interactive");
assert.equal(alertT.to, "972501111111"); assert.match(alertT.interactive.body.text, /^המלצה חדשה עלתה לאתר ★★★★★:/);
assert.deepEqual(alertT.interactive.action.buttons.map((x) => x.reply.id), ["hidetst:" + T1.id]);
// up on the site at once; once per enquiry
assert.deepEqual((await listNow()).map((t) => [t.name, t.stars]), [["נועה b ש. /b", 5]]);
tres = await tPost({ token: tstToken, name: "נועה", text: "עוד המלצה, שוב מאותו קישור, לא אמורה לעלות." }); assert.equal(tres.status, 410);
assert.match(await (await tGet(tstToken)).text(), /הקישור כבר לא פעיל/);
// the owner hides it from the alert; someone else can't
await hook(wh(val({ messages: [{ from: "972509999999", id: "ts-3", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "hidetst:" + T1.id, title: "x" } } }] })));
assert.equal(T1.hidden, false);
await pickReply("ts-4", "hidetst:" + T1.id); assert.equal(T1.hidden, true); assert.match(sent.at(-1).text.body, /^ההמלצה הוסתרה מהאתר/);
assert.deepEqual(await listNow(), []);
// and brings it back from the panel
r = await api(post("/api/leads", { testimonial: T1.id, hidden: false }, { authorization: "Bearer oren:" + key }));
assert.equal(r.status, 200); assert.equal(T1.hidden, false); assert.equal((await listNow()).length, 1);
r = await api(get("", "Bearer oren:" + key)); out = await r.json(); assert.equal(out.testimonials.length, 1); assert.equal(out.testimonials[0].body, T1.body);
// the same number is never asked again
T.ls_leads.filter((l) => l.phone_intl === "972503333350").forEach((l) => { l.created_at = "2026-01-01T00:00:00Z"; });
const TL2 = await newLead("נועה שחר", "0503333350", "10.0.0.21");
await tapDone("ts-5", "done:" + TL2.id); assert.equal(sent.at(-1).text.body, "סומן כטופל: נועה שחר."); assert.equal(TL2.testimonial, undefined);
// with Google reviews on too: three buttons, and one answer closes both questions
Object.assign(C0, { review_requests: true, review_url: "https://g.page/r/oren-mayim/review" });
const TL3 = await newLead("גיל רון", "0503333351", "10.0.0.22");
await tapDone("ts-6", "done:" + TL3.id);
assert.deepEqual(sent.at(-1).interactive.action.buttons.map((x) => x.reply.title), ["המלצה לאתר", "ביקורת בגוגל", "לא הפעם"]);
await pickReply("ts-7", "review:" + TL3.id); assert.equal(TL3.review, "sent"); assert.equal(TL3.testimonial, "skipped");
const TL4 = await newLead("דור לב", "0503333352", "10.0.0.23");
await tapDone("ts-8", "done:" + TL4.id); await pickReply("ts-9", "noreview:" + TL4.id);
assert.equal(TL4.review, "skipped"); assert.equal(TL4.testimonial, "skipped"); assert.equal(sent.at(-1).text.body, "בסדר, לא נשלח.");
// a business that turned it off: the site shows nothing, the link stops working
Object.assign(C0, { review_requests: false, testimonials: false }); lib.forgetClient("oren");
assert.deepEqual(await listNow(), []);

// --- helpers
assert.equal(lib.israeliPhone("0771234567").intl, "972771234567");
assert.equal(lib.israeliPhone("12345"), null);
const mr = lib.monthRange("2026-07"); assert.equal(mr.start, "2026-07-01T00:00:00+03:00"); assert.equal(mr.end, "2026-08-01T00:00:00+03:00");
assert.equal(lib.monthRange("2026-12").end, "2027-01-01T00:00:00+02:00");
assert.equal(lib.monthRange(null, new Date("2026-10-01T08:00:00Z")).key, "2026-09");
// --- visits: a number per day and source, only from the business's own site, once per visitor
const visit = (await import(F + "visit.mjs")).default;
const vreq = (slug, { origin = "https://oren.co.il", ip = "5.5.5.5", ua = "Mozilla/5.0 (iPhone)", body = {} } = {}) => visit(new Request("https://service-pro-web.netlify.app/api/visit/" + slug, {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "text/plain", origin, "user-agent": ua, "x-nf-client-connection-ip": ip } }), ctx(slug));
const today = lib.israelDay();
const count = (src) => (T.ls_visits.find((v) => v.client_slug === "oren" && v.day === today && v.source === src) || {}).visits || 0;
r = await vreq("oren", { body: { page: "https://oren.co.il/", referrer: "https://www.google.com/" } }); assert.equal(r.status, 204);
assert.equal(count("google.com"), 1, "a visit from Google");
await vreq("oren", { body: { page: "https://oren.co.il/", referrer: "https://www.google.com/" } }); assert.equal(count("google.com"), 1, "the same visitor again is not a new visit");
await vreq("oren", { ip: "6.6.6.6", ua: "Googlebot/2.1", body: {} }); assert.equal(count("direct"), 0, "bots don't count");
await vreq("oren", { ip: "7.7.7.7", origin: "https://evil.com" }); assert.equal(count("direct"), 0, "another site can't add visits");
await vreq("off", { ip: "8.8.8.8", origin: "https://service-pro-web.netlify.app" }); assert.ok(!T.ls_visits.some((v) => v.client_slug === "off"), "a paused business isn't counted");
await vreq("nope", { ip: "8.8.8.9" });
await vreq("oren", { ip: "9.9.9.9", body: { page: "https://oren.co.il/?utm_source=facebook", referrer: "https://oren.co.il/", source: "facebook" } }); assert.equal(count("facebook"), 1, "utm_source wins over the site's own pages");
await vreq("oren", { ip: "9.9.9.10", origin: "https://service-pro-web.netlify.app", body: { page: "https://service-pro-web.netlify.app/plumber/", referrer: "" } }); assert.equal(count("direct"), 1);
assert.ok(!JSON.stringify(T.ls_visits).includes("5.5.5.5"), "no IP is stored");
// with each visit: the device and the hour; a click that counts, once per visit, only a known one
const stat = (kind, label) => (T.ls_stats.find((v) => v.client_slug === "oren" && v.day === today && v.kind === kind && v.label === label) || {}).n || 0;
const visitsToday = T.ls_visits.filter((v) => v.client_slug === "oren" && v.day === today).reduce((n, v) => n + v.visits, 0);
assert.equal(stat("device", "mobile"), visitsToday, "every counted visit, from an iPhone"); assert.equal(T.ls_stats.filter((v) => v.kind === "hour").reduce((n, v) => n + v.n, 0), visitsToday);
assert.equal(lib.deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0)"), "tablet"); assert.equal(lib.deviceOf("Mozilla/5.0 (Windows NT 10.0)"), "desktop"); assert.equal(lib.deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel) Mobile"), "mobile");
await vreq("oren", { body: { act: "wa" } }); await vreq("oren", { body: { act: "wa" } }); await vreq("oren", { ip: "5.5.5.6", body: { act: "wa" } });
assert.equal(stat("act", "wa"), 2, "one WhatsApp click per visitor"); assert.equal(count("google.com"), 1, "a click is not a visit");
await vreq("oren", { body: { act: "<script>" } }); await vreq("oren", { ip: "7.7.7.8", origin: "https://evil.com", body: { act: "call" } });
assert.ok(!T.ls_stats.some((v) => v.label === "<script>" || (v.kind === "act" && v.label === "call")), "only known clicks, only from the site");
assert.ok(!JSON.stringify(T.ls_stats).includes("5.5.5"), "no IP in the statistics");
// the panel's 30 days
{
  const st = await lib.siteStats({ slug: "oren" }, 30);
  assert.equal(st.daily.length, 30); assert.equal(st.daily.at(-1).day, today);
  assert.equal(st.daily.at(-1).visits, visitsToday); assert.equal(st.acts.wa, 2); assert.equal(st.devices.mobile, visitsToday); assert.equal(st.deviceTotal, visitsToday);
  assert.equal(st.hours.reduce((a, b) => a + b, 0), visitsToday); assert.ok(st.sources.some((x) => x.source === "google.com"));
}

// --- the monthly report: visits, leads, outside working hours, handled, where from
T.ls_visits.push({ client_slug: "oren", day: "2026-07-03", source: "google.com", visits: 40 }, { client_slug: "oren", day: "2026-07-20", source: "direct", visits: 20 }, { client_slug: "oren", day: "2026-08-01", source: "direct", visits: 999 });
const jl = (name, at, extra = {}) => T.ls_leads.push({ ...DEF.ls_leads(), client_slug: "oren", name, phone: "0500000000", phone_intl: "972500000000", source: "google.com", auto_reply: "sent", created_at: at, ...extra });
jl("ביום", "2026-07-07T07:00:00Z", { status: "handled", handled_at: "2026-07-07T07:20:00Z" }); // Tuesday 10:00 in Israel
jl("בלילה", "2026-07-07T21:30:00Z");                                                          // Wednesday 00:30
jl("בשבת", "2026-07-11T08:00:00Z", { status: "won", handled_at: "2026-07-12T06:00:00Z", source: "facebook" }); // Saturday
const sentBefore = sent.length;
const rep = await lib.buildReport(T.ls_clients[0], "2026-07");
assert.equal(rep.visits, 60, "only July's visits"); assert.equal(rep.total, 3); assert.equal(rep.afterHours, 2, "the night and the Saturday leads");
assert.equal(rep.handled, 2); assert.equal(rep.open, 1); assert.equal(rep.conversion, 5, "3 leads of 60 visits"); assert.equal(rep.autoAnswered, 3);
const mt = sent.slice(sentBefore).find((m) => m.template && m.template.name === "monthly_report");
assert.deepEqual(mt.template.components[0].parameters.map((p) => p.text), ["יולי 2026", "60", "3", "2", "2", "גוגל"]);

// --- the weekly update, for owners who asked for it
T.ls_clients[0].weekly_report = true;
T.ls_visits.push({ client_slug: "oren", day: "2026-07-08", source: "direct", visits: 15 }, { client_slug: "oren", day: "2026-07-12", source: "direct", visits: 7 }); // inside the week, and the next day
let wk = await lib.runWeeklyReports(new Date("2026-07-12T06:00:00Z")); // Sunday morning: the week of 5 to 11 July
assert.equal(wk.length, 1); assert.equal(wk[0].sent, "sent");
const wt = sent.at(-1); assert.equal(wt.template.name, "weekly_report");
assert.deepEqual(wt.template.components[0].parameters.map((p) => p.text), ["15", "3", "2", "1"], "visits, leads, outside working hours, still waiting");
T.ls_clients[0].weekly_report = false;
wk = await lib.runWeeklyReports(new Date("2026-07-12T06:00:00Z")); assert.equal(wk.length, 0, "off unless asked for");

// --- the panel shows this month so far
r = await api(get("", "Bearer oren:" + key)); out = await r.json();
assert.ok(out.month && out.month.visits >= 3 && typeof out.month.afterHours === "number", JSON.stringify(out.month));

// --- the WhatsApp assistant (0011_wa_agent.sql): off by default; on, it answers the customer and updates the owner
{
  const oren = T.ls_clients.find((c) => c.slug === "oren");
  let before = sent.length;
  await hook(wh(val({ messages: [{ from: "972502222222", id: "ag0", type: "text", text: { body: "יש לי עוד שאלה" } }] })));
  assert.equal(sent.length, before, "off by default: no answer");
  Object.assign(oren, { wa_agent: true, chat_facts: "שירותים ומחירים:\n- סתימה: 250 עד 450 ₪" });
  aiReply = JSON.stringify({ reply: "כאן העוזר הדיגיטלי של אורן מים. באיזה רחוב בחדרה?", notify_owner: true, owner_note: "הלקוח בחדרה, נזילה מתחת לכיור." });
  before = sent.length;
  r = await hook(wh(val({ messages: [{ from: "972502222222", id: "ag1", type: "text", text: { body: "אני בחדרה, נזילה מתחת לכיור" } }] }))); assert.equal(r.status, 200);
  const out = sent.slice(before);
  const toLead = out.find((x) => x.to === "972502222222" && x.type === "text");
  assert.ok(toLead && /העוזר הדיגיטלי/.test(toLead.text.body), JSON.stringify(out));
  const toOwner = out.find((x) => x.to === "972501111111" && x.type === "template");
  assert.ok(toOwner && JSON.stringify(toOwner).includes("עדכון בוואטסאפ"), "the owner hears about the new detail");
  assert.ok(T.ls_messages.some((m) => m.kind === "agent" && m.lead_id), "the answer is logged as the assistant's");
  // the same delivery again (Meta retry): no second answer
  before = sent.length;
  await hook(wh(val({ messages: [{ from: "972502222222", id: "ag1", type: "text", text: { body: "אני בחדרה, נזילה מתחת לכיור" } }] })));
  assert.equal(sent.length, before, "a retried delivery is answered once");
  // the owner writing is never answered by the assistant
  before = sent.length;
  await hook(wh(val({ messages: [{ from: "972501111111", id: "ag2", type: "text", text: { body: "מה קורה" } }] })));
  assert.ok(!sent.slice(before).some((x) => x.type === "text" && /העוזר הדיגיטלי/.test(x.text.body)));
  oren.wa_agent = false;
}

console.log("all lead system tests passed");
