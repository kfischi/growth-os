// The lead system end to end, against a fake Supabase (PostgREST), a fake WhatsApp Graph API and a fake Anthropic API.
// Run: node scripts/tests/lead-system.test.mjs  (from the repo root; needs demos/node_modules for @anthropic-ai/sdk)
import assert from "node:assert/strict";
import { createHmac, createHash, randomUUID } from "node:crypto";
const F = new URL("../../demos/netlify/functions/", import.meta.url).href;
Object.assign(process.env, { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_KEY: "sb_secret_test", WA_TOKEN: "tok", WA_APP_SECRET: "appsecret", WA_VERIFY_TOKEN: "verify-me", LEADS_ADMIN_KEY: "admin-key-0123456789", ANTHROPIC_API_KEY: "sk-test" });

const T = { ls_clients: [], ls_leads: [], ls_messages: [], ls_reports: [], ls_visits: [] };
const sent = []; let aiReply = ""; let graphDown = false;
const DEF = {
  ls_clients: { package: "ai", active: true, allowed_origins: [], tpl_lang: "he", tpl_lead_ack: "lead_ack", tpl_owner_alert: "owner_new_lead", tpl_owner_reminder: "owner_reminder", tpl_monthly_report: "monthly_report", auto_reply: true, owner_alerts: true, reminders: true, monthly_report: true, remind_after_min: 60, work_start: 8, work_end: 20, work_days: [0,1,2,3,4,5] },
  ls_leads: () => ({ id: randomUUID(), status: "new", channel: "form", reminded_at: null, handled_at: null, last_inbound_at: null, note: null, created_at: new Date().toISOString() }),
  ls_messages: () => ({ id: Math.random(), created_at: new Date().toISOString() }),
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
  const u = new URL(url); const method = opt.method || "GET"; const body = opt.body ? JSON.parse(opt.body) : null;
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

console.log("all lead system tests passed");
