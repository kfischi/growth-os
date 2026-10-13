// The site builder end to end, against fakes of Supabase (PostgREST and Storage), Anthropic, GitHub and WhatsApp (builder-fakes.mjs).
// Run: node scripts/tests/site-builder.test.mjs  (from the repo root; needs demos/node_modules for @anthropic-ai/sdk)
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SAMPLE } from "./builder-sample.mjs";
const F = new URL("../../demos/netlify/functions/", import.meta.url).href;

import { T, storage, sentWa, aiCalls, ai, gh, DEF } from "./builder-fakes.mjs";
// What the model was told about the draft in its last turn.
const aiCallsState = () => { const m = aiCalls.at(-1).messages.at(-1).content; return typeof m === "string" ? m : m[0].text; };


const builder = (await import(F + "builder.mjs")).default;
const draftPage = (await import(F + "draft.mjs")).default;
const admin = (await import(F + "builder-admin.mjs")).default;
const B = await import(new URL("../../demos/netlify/lib/builder.mjs", import.meta.url).href);
const P = await import(new URL("../../demos/netlify/lib/templates/plumber.mjs", import.meta.url).href);
const ORIGIN = "https://service-pro-web.netlify.app";
let cred = "";
const req = (action, { method = "POST", body, raw, headers = {}, query = "", ip = "1.1.1.1" } = {}) => builder(new Request(`${ORIGIN}/api/builder/${action}${query}`, {
  method, body: raw || (body !== undefined ? JSON.stringify(body) : undefined),
  headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip, ...(cred ? { "x-draft": cred } : {}), ...headers },
}), { params: { action } });
const adm = (method, body, query = "", key = "admin-key-0123456789") => admin(new Request(`${ORIGIN}/api/builder-admin${query}`, { method, headers: { authorization: "Bearer admin:" + key }, body: body ? JSON.stringify(body) : undefined }));
const J = async (r) => ({ ...(await r.json()), status: r.status });

/* ---------------- start ---------------- */
let r = await J(await req("start", { body: { name: "אורן", phone: "0526359513", consent: true }, headers: { origin: "https://evil.com" } })); assert.equal(r.status, 403);
r = await J(await req("start", { body: { name: "אורן", phone: "04-6222222", consent: true } })); assert.equal(r.error, "bad_phone", "a landline can't be the business WhatsApp");
r = await J(await req("start", { body: { name: "אורן", phone: "0526359513" } })); assert.equal(r.error, "no_consent");
r = await J(await req("start", { body: { name: "בוט", phone: "0526359513", consent: true, company: "x" } })); assert.equal(r.status, 429); assert.equal(T.ls_drafts.length, 0);
r = await J(await req("start", { body: { name: "אורן", phone: "0526359513", consent: true, template: "constructor" }, ip: "2.2.2.2" }));
assert.equal(r.status, 201, "an odd template name falls back to plumber"); assert.equal(T.ls_drafts[0].template, "plumber"); T.ls_drafts.length = 0;
r = await J(await req("start", { body: { name: "אורן לוי", phone: "+972 52-635-9513", consent: true } }));
assert.equal(r.status, 201, JSON.stringify(r)); assert.ok(r.id && r.key.length >= 32);
const D = T.ls_drafts[0];
assert.equal(D.key_hash, createHash("sha256").update(r.key).digest("hex")); assert.ok(!JSON.stringify(D).includes(r.key), "the key itself is never stored");
assert.equal(D.owner_phone, "972526359513"); assert.equal(D.content.whatsapp, "0526359513"); assert.equal(D.content.owner_name, "אורן לוי");
assert.match(r.state.greeting, /^היי אורן,/); assert.ok(!("key_hash" in r.state) && !("ip_hash" in r.state));
assert.equal(r.state.checklist.find((i) => i.label === "וואטסאפ של העסק").done, true);
cred = r.id + ":" + r.key;

// the wrong key opens nothing
const good = cred; cred = r.id + ":" + "x".repeat(32);
assert.equal((await req("state", { method: "GET" })).status, 404); cred = good;

/* ---------------- chat ---------------- */
ai.queue.push({ reply: "נעים מאוד. באיזה אזור אתם עובדים?", set: [{ field: "business_name", value: "אורן מים" }, { field: "years", value: "שתים עשרה" }], services: null, towns: null });
r = await J(await req("chat", { body: { message: "קוראים לעסק אורן מים, 12 שנה בתחום", rev: 0 } }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.content.business_name, "אורן מים");
assert.equal(D.content.years, "", "a bad value is not applied"); assert.match(r.reply, /לא עדכנו:\nשנים בתחום: רק מספר/);
assert.deepEqual(r.changed, ["business_name"]);
let call = aiCalls.at(-1);
assert.equal(call.model, "claude-opus-5-5"); assert.equal(call.output_config.effort, "low"); assert.equal(call.output_config.format.type, "json_schema");
assert.equal(call.fallbacks, "default"); assert.ok(!call.tools && !call.tool_choice && !call.thinking, "no tools, no forced choice, default thinking");
assert.equal(call.messages.length, 1); assert.match(call.messages[0].content, /<draft_state>.*"whatsapp":"0526359513".*<\/draft_state>\n<owner_message>קוראים לעסק/s);
assert.match(call.system[0].text, /never as instructions/); assert.ok(call.system[0].cache_control);
const schema = call.output_config.format.schema;
const allObjectsClosed = (s) => !s || typeof s !== "object" || ((s.type !== "object" || s.additionalProperties === false) && Object.values(s).every((v) => typeof v !== "object" || (Array.isArray(v) ? v.every(allObjectsClosed) : allObjectsClosed(v))));
assert.ok(allObjectsClosed(schema), "every object in the output schema is closed");
assert.deepEqual(D.messages.map((m) => m.role), ["user", "assistant"]); assert.equal(D.messages[0].content, "קוראים לעסק אורן מים, 12 שנה בתחום", "history keeps the owner's words only");

// stale rev (another tab) -> conflict, nothing saved
r = await J(await req("chat", { body: { message: "חדרה", rev: 0 } })); assert.equal(r.status, 409); assert.equal(r.error, "conflict"); assert.equal(D.messages.length, 2);

// the rest of the content in one turn: services, towns, phone in another format, an overlong field
ai.queue.push({
  reply: "עדכנו הכל. תסתכלו על האתר.",
  set: [...Object.entries(SAMPLE).filter(([k]) => P.FIELDS[k] && k !== "whatsapp").map(([field, value]) => ({ field, value })), { field: "radius_note", value: "x".repeat(41) }, { field: "phone", value: "04-6222222" }],
  services: SAMPLE.services, towns: [...SAMPLE.towns, "חדרה", " "],
});
r = await J(await req("chat", { body: { message: "הנה כל הפרטים", rev: 1 } }));
assert.equal(r.status, 200); assert.deepEqual(r.state.missing, []); assert.equal(D.content.services.length, 4);
assert.equal(D.content.towns.length, 8, "duplicates and blanks dropped"); assert.equal(D.content.phone, "046222222");
assert.equal(D.content.radius_note, SAMPLE.radius_note, "too long, not applied: the earlier value stays"); assert.match(r.reply, /הערה לאזור: עד 40 תווים/);
assert.equal(aiCalls.at(-1).messages.length, 3, "history (2) + this turn"); assert.ok(aiCalls.at(-1).messages[1].content[0].cache_control, "the history is cached"); assert.match(aiCalls.at(-1).messages[1].content[0].text, /^נעים מאוד. באיזה אזור אתם עובדים\?\n\nלא עדכנו:/, "the model sees what was not applied");

// too many services: the list is not replaced
ai.queue.push({ reply: "x", set: [], services: Array.from({ length: 7 }, (_, i) => ({ name: "שירות " + i, detail: "", time: "", price: "" })), towns: null });
r = await J(await req("chat", { body: { message: "עוד שירותים", rev: 2 } })); assert.equal(D.content.services.length, 4); assert.match(r.reply, /עד 6 שירותים/);

// a refusal is answered, nothing in the content changes
ai.mode = "refusal"; const before = JSON.stringify(D.content);
r = await J(await req("chat", { body: { message: "משהו לא קשור", rev: 3 } })); assert.equal(r.status, 200); assert.match(r.reply, /נמשיך עם פרטי העסק/); assert.equal(JSON.stringify(D.content), before);
// the AI is down: 503, nothing saved, the owner sends again
ai.mode = "down"; const n = D.messages.length;
r = await J(await req("chat", { body: { message: "שלום", rev: 4 } })); assert.equal(r.status, 503); assert.equal(r.error, "busy"); assert.equal(D.messages.length, n);
ai.mode = "ok";
r = await J(await req("chat", { body: { message: "x".repeat(801), rev: 4 } })); assert.equal(r.error, "too_long");

/* ---------------- the draft page ---------------- */
let page = await draftPage(new Request(`${ORIGIN}/draft/${D.id}?k=${good.split(":")[1]}`), { params: { id: D.id } });
let html = await page.text();
assert.equal(page.status, 200); assert.equal(page.headers.get("x-robots-tag"), "noindex, nofollow"); assert.equal(page.headers.get("referrer-policy"), "no-referrer"); assert.equal(page.headers.get("cache-control"), "no-store");
assert.match(html, /טיוטה לאישור/); assert.match(html, /אורן מים/); assert.match(html, /src="\/shared\/leadbot.js"/); assert.match(html, /"leads":null/, "a draft never sends real leads");
page = await draftPage(new Request(`${ORIGIN}/draft/${D.id}?k=wrong-key-wrong-key-wrong`), { params: { id: D.id } }); assert.equal(page.status, 404);
page = await draftPage(new Request(`${ORIGIN}/draft/${D.id}?a=${B.adminPreviewToken(D.id, Date.now() - 2 * 3600_000)}`), { params: { id: D.id } }); assert.equal(page.status, 404, "an old admin link expires");

/* ---------------- escaping ---------------- */
const evil = P.render({ ...SAMPLE, business_name: '<img src=x onerror=alert(1)>', services: [{ name: "</script><script>alert(2)</script>", detail: "", time: "", price: "1 ₪" }] }, { mode: "site", leads: null });
assert.ok(!evil["index.html"].includes("<img src=x") && !evil["index.html"].includes("</script><script>alert(2)"), "owner text can't inject markup or close the script");
assert.throws(() => P.render({ ...SAMPLE, intro: "" }, { mode: "site" }), /missing/);
// Looks: every look and palette renders; an unknown one falls back to the first; the seal never invents a fact.
for (const [lid, L] of Object.entries(P.LOOKS)) for (const pid of Object.keys(L.palettes)) {
  const html = P.render({ ...SAMPLE, look: lid, palette: pid }, { mode: "site" })["index.html"];
  assert.match(html, new RegExp(`<body class="look-${lid}">`)); assert.ok(html.includes(L.palettes[pid].accent), lid + " " + pid);
}
assert.match(P.render({ ...SAMPLE, look: "nope", palette: "x" }, { mode: "site" })["index.html"], /<body class="look-blueprint">/);
// Testimonials: a hidden section the page fills from the lead system, only with נציג AI; never in a draft.
{
  const withLeads = P.render(SAMPLE, { mode: "site", leads: "https://service-pro-web.netlify.app/api/lead/oren" });
  assert.match(withLeads["index.html"], /<section class="tst-sec" id="testimonials" data-testimonials hidden>/);
  assert.match(withLeads["index.html"], /LeadForm\.testimonials\(SITE\.leads\.replace\("\/api\/lead\/", "\/api\/testimonials\/"\)\)/);
  assert.match(withLeads["privacy.html"], /<h2>המלצות<\/h2>/);
  assert.ok(!/data-testimonials/.test(P.render(SAMPLE, { mode: "site" })["index.html"]), "not in נוכחות");
  assert.ok(!/data-testimonials/.test(P.render(SAMPLE, { mode: "draft", leads: null })["index.html"]));
  assert.equal(Object.values(P.LOOKS).every((l) => Object.keys(l.palettes).length === 8), true, "eight palettes per look");
}
assert.match(P.render({ ...SAMPLE, look: "blueprint", palette: "teal" }, { mode: "site" })["index.html"], /--accent: #123a8c/, "a palette of another look falls back");
{
  const cert = (c) => P.render({ ...SAMPLE, ...c, look: "certificate" }, { mode: "site" })["index.html"].match(/<div class="seal"[\s\S]*?<\/div>/)[0];
  assert.match(cert({ warranty: "12 חודשים" }), /12 חודשים/);
  assert.ok(!/אחריות/.test(cert({ warranty: "", years: "" })), "no warranty on the seal unless the owner gave one");
  assert.match(P.render({ ...SAMPLE, look: "van", business_name: "<i>x</i>" }, { mode: "site" })["index.html"], /vp-name">&lt;i&gt;x&lt;\/i&gt;/);
}
assert.match(P.render({ ...SAMPLE, years: "3" }, { mode: "site" })["index.html"], /<b>3 שנים<\/b>/);
assert.match(P.render({ ...SAMPLE, years: "1" }, { mode: "site" })["index.html"], /שנה אחת · |<b>שנה אחת<\/b>/);
assert.match(P.chatFacts(SAMPLE), /12 שנה בתחום/);

/* ---------------- photos ---------------- */
const webp = Buffer.concat([Buffer.from("RIFF0000WEBPVP8 "), Buffer.alloc(200, 1)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 2)]);
r = await J(await req("photo", { raw: webp, query: "?slot=portrait", headers: { "content-type": "image/webp" } })); assert.equal(r.error, "no_rights");
r = await J(await req("photo", { raw: Buffer.from("<svg onload=alert(1)>"), query: "?slot=portrait", headers: { "x-photo-rights": "yes" } })); assert.equal(r.status, 415);
r = await J(await req("photo", { raw: webp, query: "?slot=hero", headers: { "x-photo-rights": "yes" } })); assert.equal(r.error, "bad_slot");
r = await J(await req("photo", { raw: Buffer.alloc(1_048_577, 0), query: "?slot=portrait", headers: { "x-photo-rights": "yes" } })); assert.equal(r.status, 413);
r = await J(await req("photo", { raw: webp, query: "?slot=portrait", headers: { "x-photo-rights": "yes" } }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.ok(D.photo_rights_at); assert.equal(storage.size, 1);
assert.match(r.state.photos.portrait, /^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/builder\/drafts\//);
const firstPath = D.photos.portrait.path;
r = await J(await req("photo", { raw: jpg, query: "?slot=portrait", headers: { "x-photo-rights": "yes" } }));
assert.equal(D.photos.portrait.ext, "jpg"); assert.ok(!storage.has(firstPath), "the replaced photo is deleted"); assert.equal(storage.size, 1);
r = await J(await req("photo", { raw: webp, query: "?slot=work1", headers: { "x-photo-rights": "yes" } })); assert.equal(Object.keys(D.photos).length, 2);
assert.equal(D.rev, 4, "photos don't bump the chat's rev");
for (const bad of ["constructor", "__proto__", "toString"]) { r = await J(await req("photo", { raw: webp, query: "?slot=" + bad, headers: { "x-photo-rights": "yes" } })); assert.equal(r.error, "bad_slot", bad); }
// two uploads at the same moment: both stay
const [a1, a2] = await Promise.all([
  req("photo", { raw: webp, query: "?slot=work2", headers: { "x-photo-rights": "yes" } }),
  req("photo", { raw: jpg, query: "?slot=work3", headers: { "x-photo-rights": "yes" } }),
]);
assert.equal(a1.status, 200); assert.equal(a2.status, 200);
assert.ok(D.photos.work2 && D.photos.work3, "neither upload erased the other"); assert.equal(storage.size, 4);
for (const slot of ["work2", "work3"]) await req("photo", { method: "DELETE", query: "?slot=" + slot });
assert.equal(storage.size, 2);
r = await J(await req("photo", { method: "DELETE", query: "?slot=work1" })); assert.equal(Object.keys(D.photos).length, 1); assert.equal(storage.size, 1);
r = await J(await req("photo", { raw: webp, query: "?slot=work1", headers: { "x-photo-rights": "yes" } }));

/* ---------------- the short video ---------------- */
const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom"), Buffer.alloc(3000, 3)]);
const vbody = (frame, movie) => Buffer.concat([frame, movie]);
const vreq = (body, headers = {}) => req("video", { raw: body, headers: { "content-type": "application/octet-stream", "x-photo-rights": "yes", "x-poster-length": String(jpg.length), ...headers } });
r = await J(await vreq(vbody(jpg, mp4), { "x-photo-rights": "" })); assert.equal(r.error, "no_rights");
r = await J(await vreq(vbody(jpg, Buffer.from("<html>not a video</html>".repeat(10))))); assert.equal(r.status, 415, "only an MP4");
r = await J(await vreq(vbody(Buffer.alloc(204, 7), mp4))); assert.equal(r.status, 415, "the first frame must be a picture");
r = await J(await vreq(vbody(jpg, mp4), { "x-poster-length": "abc" })); assert.equal(r.status, 415);
r = await J(await vreq(vbody(jpg, Buffer.concat([mp4, Buffer.alloc(4_500_000)])))); assert.equal(r.status, 413);
const stored = storage.size;
r = await J(await vreq(vbody(jpg, mp4)));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.video.ext, "mp4"); assert.equal(D.video.poster.ext, "jpg"); assert.equal(storage.size, stored + 2);
assert.match(r.state.video.src, /\/public\/builder\/drafts\/.*\/video-[0-9a-f]{12}\.mp4$/); assert.match(r.state.video.poster, /poster-.*\.jpg$/);
assert.equal(storage.get(D.video.path).toString("ascii", 4, 8), "ftyp", "the MP4 is stored without the frame in front");
const firstVideo = D.video.path;
r = await J(await vreq(vbody(jpg, mp4))); assert.ok(!storage.has(firstVideo), "a replaced video is deleted"); assert.equal(storage.size, stored + 2);
html = B.renderDraft(D);
assert.match(html, /<figure class="reel">/); assert.match(html, /<video muted loop playsinline preload="none" poster="https:\/\/x\.supabase\.co/); assert.ok(!/<video[^>]*autoplay/.test(html), "the script decides when it plays");
assert.match(html, /class="reel-toggle"/); assert.ok(!html.includes('class="drawing"'), "the video takes the drawing's place");
ai.queue.push({ reply: "יופי של סרטון.", set: [{ field: "video_title", value: "פתיחת סתימה במטבח" }], services: null, towns: null });
r = await J(await req("chat", { body: { message: "העליתי סרטון", rev: D.rev } })); assert.equal(r.status, 200);
assert.match(aiCallsState(), /"video":true/, "the chat knows there is a video"); assert.match(B.renderDraft(D), /צילום מהשטח · פתיחת סתימה במטבח/);
r = await J(await req("video", { method: "DELETE" })); assert.equal(D.video, null); assert.equal(storage.size, stored);
assert.match(B.renderDraft(D), /class="drawing"/);
r = await J(await vreq(vbody(jpg, mp4))); assert.equal(r.error, "rate_limited", "6 videos per 10 minutes from one address");
r = await J(await req("video", { raw: vbody(jpg, mp4), ip: "3.3.3.3", headers: { "content-type": "application/octet-stream", "x-photo-rights": "yes", "x-poster-length": String(jpg.length) } }));
assert.ok(D.video, "back for the publish test");
html = B.renderDraft(D); assert.match(html, /builder\/drafts\/.*work1-/); assert.match(html, /עבודה 2<br>מעלים ב״תמונות״/, "an empty slot is marked in the draft");

/* ---------------- approve ---------------- */
r = await J(await req("approve", { body: { package: "presence", plan: "three", rev: D.rev } })); assert.equal(r.error, "bad_package");
const keep = D.content.intro; D.content.intro = "";
r = await J(await req("approve", { body: { package: "ai", plan: "three", rev: D.rev } })); assert.equal(r.error, "missing"); assert.deepEqual(r.missing, ["פסקת פתיחה"]);
D.content.intro = keep;
process.env.PAY_URL_AI_THREE = "https://pay.example/ai3"; process.env.PAY_URL_AI = "javascript:alert(1)";
r = await J(await req("approve", { body: { package: "ai", plan: "three", rev: D.rev } }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.status, "client_approved"); assert.equal(r.alert, "sent");
assert.deepEqual(r.state.pay, [{ plan: "three", url: "https://pay.example/ai3" }], "only https payment links");
const alertLead = T.ls_leads.at(-1); assert.equal(alertLead.client_slug, "kfir"); assert.equal(alertLead.service, "אתר חדש מחכה לאישור"); assert.match(alertLead.message, /אורן מים · נציג AI · 3 תשלומים/);
assert.ok(sentWa.some((m) => m.to === "972526359513" && m.template.name === "owner_new_lead"));
r = await J(await req("chat", { body: { message: "עוד שינוי", rev: D.rev } })); assert.equal(r.error, "locked");
r = await J(await req("photo", { raw: webp, query: "?slot=work2", headers: { "x-photo-rights": "yes" } })); assert.equal(r.error, "locked");
// back to editing and approve again
r = await J(await req("reopen", { body: { rev: D.rev } })); assert.equal(D.status, "draft");
r = await J(await req("approve", { body: { package: "ai", plan: "three", rev: D.rev } })); assert.equal(D.status, "client_approved");

/* ---------------- כפיר ---------------- */
r = await J(await adm("GET", null, "", "wrong-admin-key-0000")); assert.equal(r.status, 401);
r = await J(await adm("GET")); assert.equal(r.drafts.length, 1); assert.equal(r.drafts[0].business, "אורן מים"); assert.ok(!("key_hash" in r.drafts[0]));
r = await J(await adm("GET", null, "?id=" + D.id)); assert.match(r.preview, new RegExp(`^/draft/${D.id}\\?a=\\d{10}\\.`));
page = await draftPage(new Request(ORIGIN + r.preview), { params: { id: D.id } }); assert.equal(page.status, 200, "the admin preview link works");
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.status, 409, "not paid yet");
r = await J(await adm("POST", { action: "return", id: D.id, note: "" })); assert.equal(r.error, "note_required");
r = await J(await adm("POST", { action: "return", id: D.id, note: "תחליפו את התמונה הראשית" })); assert.equal(D.status, "returned");
r = await J(await req("state", { method: "GET" })); assert.equal(r.state.returnNote, "תחליפו את התמונה הראשית");
r = await J(await req("approve", { body: { package: "ai", plan: "full", rev: D.rev } })); assert.equal(D.status, "client_approved"); assert.equal(D.return_note, null);
r = await J(await adm("POST", { action: "paid", id: D.id })); assert.equal(D.status, "paid");
// sent back after payment: the owner fixes, approves again, and it goes straight back to paid
r = await J(await adm("POST", { action: "return", id: D.id, note: "תקנו את שם הישוב" })); assert.equal(D.status, "returned");
D.updated_at = "2026-08-01T00:00:00Z";
assert.equal((await B.deleteStaleDrafts(new Date("2026-10-10T03:00:00Z"))).draftsDeleted, 0, "a paid draft is never cleaned up");
r = await J(await req("approve", { body: { package: "presence", plan: "full", rev: D.rev } }));
assert.equal(D.status, "paid"); assert.equal(D.package, "ai", "the package stays as paid for"); assert.deepEqual(r.state.pay, [], "no second payment");
r = await J(await adm("POST", { action: "delete", id: D.id })); assert.equal(r.status, 409, "a paid draft can't be deleted");
for (const bad of ["Oren", "-oren", "a", "sample-plumber", "../x", "kfir"]) { r = await J(await adm("POST", { action: "publish", id: D.id, slug: bad })); assert.equal(r.error, "bad_slug", bad); }
gh.files.set("clients/taken/index.html", "x");
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "taken" })); assert.equal(r.error, "slug_taken", "never overwrite another site");
assert.equal(D.published_slug, null, "the name is released");
T.ls_clients.push({ ...DEF.ls_clients(), slug: "by-hand", name: "עסק אחר" });
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "by-hand" })); assert.equal(r.error, "slug_taken", "never take over a lead system client");
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "admin" })); assert.equal(r.error, "bad_slug");
// GitHub fails half way: the name stays reserved, and publishing again finishes the job
gh.moveFails = 3;
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.status, 502);
assert.equal(D.status, "paid"); assert.equal(D.published_slug, "oren-mayim");
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-2" })); assert.equal(r.status, 409, "a reserved draft keeps its name");
gh.moveFails = 0;
// the commit went in but the draft wasn't marked (a timeout): the folder is ours, so it's written again
gh.files.set("clients/oren-mayim/CLIENT.md", "טיוטה `" + D.id + "`");
gh.moveFails = 1; // and someone pushed in between
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.status, "published"); assert.equal(D.published_slug, "oren-mayim"); assert.equal(r.folder, "clients/oren-mayim/");
const tree = gh.trees.at(-1); assert.equal(tree.base_tree, "tree-c-other", "rebuilt on the new head");
const paths = tree.tree.map((e) => e.path).sort();
assert.deepEqual(paths, ["CLIENT.md", "_headers", "accessibility.html", "assets/a11y.js", "assets/favicon.svg", "assets/leadbot.js", "assets/leadform.js", "assets/hero-poster.jpg", "assets/hero.mp4", "assets/photos/portrait.jpg", "assets/photos/work1.webp", "contact.vcf", "guides.html", "index.html", "privacy.html"].map((p) => "clients/oren-mayim/" + p).sort());
const file = (p) => tree.tree.find((e) => e.path === "clients/oren-mayim/" + p);
assert.equal(file("assets/leadbot.js").sha, "sha-bot"); assert.ok(file("assets/photos/portrait.jpg").sha.startsWith("blob-"));
const index = file("index.html").content;
assert.ok(!/noindex|טיוטה|class="todo"/.test(index), "no draft marks on the real site"); assert.match(index, /"leads":"https:\/\/service-pro-web.netlify.app\/api\/lead\/oren-mayim"/);
assert.match(index, /src="assets\/photos\/portrait.jpg"/); assert.match(index, /src="assets\/leadbot.js"/); assert.match(index, /<source src="assets\/hero.mp4" type="video\/mp4">/); assert.match(index, /poster="assets\/hero-poster.jpg"/);
assert.ok(!file("_headers").content.includes("noindex")); assert.ok(!/0526359513|972526359513/.test(file("CLIENT.md").content), "no phone in the public repo card");
const C = T.ls_clients.find((c) => c.slug === "oren-mayim");
assert.ok(C && C.key_hash && C.owner_phone === "972526359513"); assert.match(C.chat_facts, /סתימה בכיור.*250 עד 450 ₪/);
assert.match(r.leads.panel, /^https:\/\/service-pro-web.netlify.app\/panel\/#k=oren-mayim:[A-Za-z0-9_-]{32}$/);
assert.equal(C.key_hash, createHash("sha256").update(r.leads.panel.split(":").pop()).digest("hex"));
// publishing again with the same slug updates; another slug is refused
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.status, 200); assert.equal(r.leads.row, "updated"); assert.equal(T.ls_clients.filter((c) => c.slug === "oren-mayim").length, 1);
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-2" })); assert.equal(r.status, 409);
r = await J(await adm("POST", { action: "delete", id: D.id })); assert.equal(r.status, 409, "a published draft stays");

/* ---------------- self edit: the owner changes the live site ---------------- */
cred = good;
r = await J(await req("chat", { body: { message: "תשנו את הכותרת", rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.error, "locked", "not before כפיר turns it on");
assert.equal(r.state.edit, null);
r = await J(await adm("POST", { action: "self_edit", id: D.id, on: true })); assert.equal(r.status, 200); assert.equal(D.self_edit, true);
assert.deepEqual(D.live.content, D.content, "what the site shows now"); assert.deepEqual(D.messages, [], "a fresh chat for changes");
r = await J(await req("state", { method: "GET" }));
assert.deepEqual(r.state.edit, { dirty: false, canUndo: false, messagesLeft: 60, publishesLeft: 10 }); assert.match(r.state.greeting, /האתר שלכם באוויר/);
r = await J(await req("publish", { body: { rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.error, "no_changes");
r = await J(await req("approve", { body: { package: "ai", plan: "full", rev: D.rev } })); assert.equal(r.error, "locked", "a live site is never approved again");
// a change in the chat: on the draft, not on the site
const liveIntro = D.content.intro;
ai.queue.push({ reply: "עדכנו את הפתיחה.", set: [{ field: "intro", value: "פתיחה חדשה מבעל העסק." }], services: null, towns: null });
r = await J(await req("chat", { body: { message: "תשנו את הפתיחה", rev: D.rev }, ip: "6.6.6.1" }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.state.edit.dirty, true); assert.equal(r.state.edit.messagesLeft, 59);
assert.match(aiCalls.at(-1).system[0].text, /The site is already live/); assert.ok(!/Order of the conversation/.test(aiCalls.at(-1).system[0].text));
assert.equal(D.live.content.intro, liveIntro, "the live copy is untouched until publish");
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.error, "owner_editing", "כפיר never publishes the owner's unfinished changes");
// a new portrait of another type, then publish: the old file leaves the repo, the old storage file stays for "back"
const oldPortrait = D.photos.portrait.path;
r = await J(await req("photo", { raw: webp, query: "?slot=portrait", headers: { "x-photo-rights": "yes" }, ip: "6.6.6.1" })); assert.equal(r.status, 200, JSON.stringify(r));
assert.ok(storage.has(oldPortrait), "the live site's photo stays in storage while editing");
T.ls_leads.forEach((l) => { l.created_at = "2026-01-01T00:00:00Z"; }); // the lead system merges alerts within 10 minutes
const leadsBefore = T.ls_leads.length;
r = await J(await req("publish", { body: { rev: D.rev }, ip: "6.6.6.1" }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.state.edit.dirty, false); assert.equal(r.state.edit.canUndo, true); assert.equal(r.state.edit.publishesLeft, 9);
const t2 = gh.trees.at(-1).tree, at = (f) => t2.find((e) => e.path === "clients/oren-mayim/" + f);
assert.match(at("index.html").content, /פתיחה חדשה מבעל העסק/); assert.ok(at("assets/photos/portrait.webp").sha.startsWith("blob-"));
assert.equal(at("assets/photos/portrait.jpg").sha, null, "the replaced photo leaves the site"); assert.ok(!gh.files.has("clients/oren-mayim/assets/photos/portrait.jpg"));
assert.ok(gh.files.has("clients/oren-mayim/assets/hero.mp4"), "the video stays");
assert.equal(D.live.content.intro, "פתיחה חדשה מבעל העסק."); assert.equal(D.prev_live.content.intro, liveIntro); assert.deepEqual(D.messages, []);
assert.ok(storage.has(oldPortrait), "kept for back"); assert.equal(T.ls_leads.length, leadsBefore + 1); assert.equal(T.ls_leads.at(-1).service, "בעל העסק פרסם שינוי באתר");
assert.match(T.ls_clients.find((c) => c.slug === "oren-mayim").chat_facts, /פתיחה חדשה|סתימה/);
// discard: a change and a new photo, then back to what is live; the unused upload is deleted
ai.queue.push({ reply: "הורדנו.", set: [{ field: "intro", value: "טעות." }], services: null, towns: null });
r = await J(await req("chat", { body: { message: "תשנו", rev: D.rev }, ip: "6.6.6.1" })); assert.equal(D.content.intro, "טעות.");
r = await J(await req("photo", { raw: jpg, query: "?slot=work2", headers: { "x-photo-rights": "yes" }, ip: "6.6.6.1" }));
const unused = D.photos.work2.path;
r = await J(await req("discard", { body: { rev: D.rev }, ip: "6.6.6.1" }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.content.intro, "פתיחה חדשה מבעל העסק."); assert.ok(!D.photos.work2); assert.ok(!storage.has(unused)); assert.equal(r.state.edit.dirty, false);
// back to the previous version: loaded as changes, published like any change
r = await J(await req("undo", { body: { rev: D.rev }, ip: "6.6.6.1" }));
assert.equal(r.status, 200); assert.equal(D.content.intro, liveIntro); assert.equal(D.photos.portrait.path, oldPortrait); assert.equal(r.state.edit.dirty, true);
r = await J(await req("publish", { body: { rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.status, 200, JSON.stringify(r));
assert.ok(gh.files.has("clients/oren-mayim/assets/photos/portrait.jpg")); assert.ok(!gh.files.has("clients/oren-mayim/assets/photos/portrait.webp"));
assert.equal(D.prev_live.content.intro, "פתיחה חדשה מבעל העסק.");
// the monthly allowance
D.edit_publishes = 10;
ai.queue.push({ reply: "שינינו.", set: [{ field: "intro", value: "עוד שינוי." }], services: null, towns: null });
await req("chat", { body: { message: "עוד", rev: D.rev }, ip: "6.6.6.1" });
r = await J(await req("publish", { body: { rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.error, "edit_limit");
D.edit_messages = 60; const aiBefore = aiCalls.length;
r = await J(await req("chat", { body: { message: "עוד", rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.error, "edit_limit"); assert.equal(aiCalls.length, aiBefore, "no AI call over the allowance");
D.edit_month = "2020-01"; r = await J(await req("state", { method: "GET" })); assert.equal(r.state.edit.publishesLeft, 10, "a new month starts from zero");
// turned off: the unpublished change is dropped, and the chat is locked again
r = await J(await adm("POST", { action: "self_edit", id: D.id, on: false })); assert.equal(r.status, 200);
assert.equal(D.content.intro, liveIntro); assert.equal(D.self_edit, false);
r = await J(await req("chat", { body: { message: "עוד", rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.error, "locked");
r = await J(await req("publish", { body: { rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.error, "locked");

/* ---------------- the questionnaire: answers picked, no AI ---------------- */
{
  // every answer in the knowledge base fits the template, so a pick never fails
  const G = P.GUIDE, t = { FIELDS: P.FIELDS, SERVICES: P.SERVICES, TOWNS: P.TOWNS };
  for (const r of G.regions) { const u = B.applyUpdate(t, {}, { set: [{ field: "area", value: r.label }], towns: r.towns }); assert.deepEqual(u.errors, [], r.label); }
  assert.deepEqual(B.applyUpdate(t, {}, { services: G.services.slice(0, 6) }).errors, []);
  assert.deepEqual(B.applyUpdate(t, {}, { services: G.services.slice(6) }).errors, []);
  for (const st of G.steps) {
    if (st.type === "pick") for (const o of st.options) assert.deepEqual(B.applyUpdate(t, {}, { set: [{ field: st.field, value: typeof o === "string" ? o : o.value }] }).errors, [], st.id);
    if (st.type === "copy") for (const o of st.options) for (const when of ["תוך 15 דק׳", "תוך שעתיים", "באותו יום"])
      assert.deepEqual(B.applyUpdate(t, {}, { set: Object.entries(o).map(([field, value]) => ({ field, value: value.replace("{when}", when) })) }).errors, [], st.id + " " + when);
  }
  // a fresh draft, answered through /answer: the draft fills, the AI is never called
  cred = ""; ai.queue.length = 0;
  r = await J(await req("start", { body: { name: "דנה", phone: "0541234567", consent: true }, ip: "8.8.8.1" }));
  cred = r.id + ":" + r.key; const Q = T.ls_drafts.find((x) => x.id === r.id);
  assert.equal(r.state.guide.steps[0].type, "style"); assert.equal(r.state.guide.steps[1].field, "business_name"); assert.match(r.state.greeting, /בוחרים תשובה/);
  const calls = aiCalls.length;
  // the design: a look and one of its palettes, checked against the template's looks, no AI
  assert.equal(r.state.looks.length, 3); assert.deepEqual(r.state.style, { look: "blueprint", palette: "blue" });
  r = await J(await req("answer", { body: { style: { look: "van", palette: "teal" }, rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(r.status, 200, JSON.stringify(r)); assert.deepEqual(r.changed, ["style"]); assert.deepEqual(r.state.style, { look: "van", palette: "teal" });
  assert.equal(Q.content.look, "van"); assert.equal(Q.content.palette, "teal");
  r = await J(await req("answer", { body: { style: { look: "van", palette: "blue" }, rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(r.status, 422, "a palette of another look"); assert.equal(Q.content.palette, "teal");
  r = await J(await req("answer", { body: { style: { look: "__proto__", palette: "x" }, rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(r.status, 422); assert.equal(Q.content.look, "van");
  r = await J(await req("answer", { body: { set: [{ field: "business_name", value: "דנה צנרת" }], rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(Q.content.business_name, "דנה צנרת"); assert.deepEqual(r.changed, ["business_name"]);
  r = await J(await req("answer", { body: { set: [{ field: "area", value: P.GUIDE.regions[2].label }], towns: P.GUIDE.regions[2].towns, rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(Q.towns, undefined); assert.equal(Q.content.towns.length, P.GUIDE.regions[2].towns.length);
  r = await J(await req("answer", { body: { services: [{ ...P.GUIDE.services[0], price: "" }, { name: "שירות שלי" }], rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(Q.content.services.length, 2); assert.equal(Q.content.services[0].price, "", "no price until the owner keeps one");
  assert.equal(aiCalls.length, calls, "the questionnaire never calls the AI");
  // the same checks as the chat: a bad answer changes nothing
  r = await J(await req("answer", { body: { set: [{ field: "years", value: "שתים עשרה" }], rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(r.status, 422); assert.equal(r.error, "bad_answer"); assert.equal(Q.content.years, "");
  r = await J(await req("answer", { body: { set: [{ field: "key_hash", value: "x" }, { field: "intro", value: "<b>hi</b>" }], rev: Q.rev }, ip: "8.8.8.1" }));
  assert.equal(r.status, 200); assert.ok(!("key_hash" in Q.content)); assert.equal(Q.content.intro, " b hi /b ".trim().replace(/\s+/g, " "), "markup brackets are cleaned");
  r = await J(await req("answer", { body: { set: [{ field: "intro", value: "x" }], rev: Q.rev - 1 }, ip: "8.8.8.1" })); assert.equal(r.error, "conflict");
  Q.status = "client_approved";
  r = await J(await req("answer", { body: { set: [{ field: "intro", value: "x" }], rev: Q.rev }, ip: "8.8.8.1" })); assert.equal(r.error, "locked");
  assert.equal(r.state.guide.steps.length > 0, true);
  T.ls_drafts.splice(T.ls_drafts.indexOf(Q), 1); // the daily-cap test below counts drafts
}

/* ---------------- a faster model: its own settings ---------------- */
for (const [model, check] of [["claude-haiku-5-5", (c) => { assert.ok(!c.fallbacks && !c.betas, "Haiku has no server-side fallback"); assert.deepEqual(c.thinking, { type: "disabled" }); }],
  ["claude-sonnet-5-5", (c) => { assert.ok(!c.fallbacks); assert.deepEqual(c.thinking, { type: "between_tools" }); }]]) {
  process.env.BUILDER_MODEL = model;
  const F2 = T.ls_drafts.find((x) => x.status === "draft") || T.ls_drafts.at(-1);
  F2.status = "draft"; const fKey = "f".repeat(32); F2.key_hash = createHash("sha256").update(fKey).digest("hex"); F2.messages = []; cred = F2.id + ":" + fKey;
  ai.queue.push({ reply: "בסדר.", set: [], services: null, towns: null });
  r = await J(await req("chat", { body: { message: "שלום", rev: F2.rev }, ip: "4.4.4." + model.length }));
  assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(aiCalls.at(-1).model, model); check(aiCalls.at(-1)); assert.equal(aiCalls.at(-1).output_config.effort, "low");
}
delete process.env.BUILDER_MODEL;

/* ---------------- limits and housekeeping ---------------- */
for (let i = 0; i < 3; i++) { cred = ""; r = await J(await req("start", { body: { name: "בודק", phone: "0501234567", consent: true }, ip: "9.9.9." + i })); assert.equal(r.status, 201); }
r = await J(await req("start", { body: { name: "בודק", phone: "0501234567", consent: true }, ip: "9.9.9.9" })); assert.equal(r.status, 201);
r = await J(await req("start", { body: { name: "בודק", phone: "0501234567", consent: true }, ip: "9.9.9.10" })); assert.equal(r.error, "busy_today", "the daily cap (5)");
cred = ""; for (let i = 0; i < 3; i++) await req("start", { body: { name: "בודק", phone: "0501234567", consent: true }, ip: "7.7.7.7" });
r = await J(await req("start", { body: { name: "בודק", phone: "0501234567", consent: true }, ip: "7.7.7.7" })); assert.equal(r.error, "rate_limited");
// an untouched draft with a photo is deleted after 30 days; a published one stays
const old = T.ls_drafts[1]; old.updated_at = "2026-08-01T00:00:00Z"; old.photos = { portrait: { path: "drafts/old/portrait-1.webp", ext: "webp" } }; storage.set("drafts/old/portrait-1.webp", webp);
D.updated_at = "2026-08-01T00:00:00Z";
const del = await B.deleteStaleDrafts(new Date("2026-10-10T03:00:00Z"));
assert.equal(del.draftsDeleted, 1); assert.ok(!T.ls_drafts.includes(old)); assert.ok(T.ls_drafts.includes(D)); assert.ok(!storage.has("drafts/old/portrait-1.webp"));
// the message cap: a draft that already holds 80 messages gets no more AI turns
const E = T.ls_drafts[1], eKey = "e".repeat(32); E.key_hash = createHash("sha256").update(eKey).digest("hex");
E.messages = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" })); cred = E.id + ":" + eKey;
const calls = aiCalls.length;
r = await J(await req("chat", { body: { message: "עוד", rev: E.rev }, ip: "5.5.5.5" })); assert.equal(r.error, "limit"); assert.equal(aiCalls.length, calls);
cred = E.id + ":k"; assert.equal((await req("state", { method: "GET" })).status, 404, "a malformed key");

// --- before and after: a slider on the site only with both photos; the draft shows the frame with one
{
  const both = P.render({ ...SAMPLE, ba_title: "סיפון <b>חדש</b>" }, { mode: "site", photos: { before: "assets/photos/before.jpg", after: "assets/photos/after.jpg" } })["index.html"];
  assert.ok(both.includes('class="ba-range"') && both.includes("<h2>לפני ואחרי</h2>"));
  assert.ok(both.includes("סיפון &lt;b&gt;חדש&lt;/b&gt;") && !both.includes("<b>חדש</b>"), "the caption is escaped");
  assert.ok(both.includes('alt="לפני: סיפון &lt;b&gt;חדש&lt;/b&gt;"'));
  const one = P.render(SAMPLE, { mode: "site", photos: { before: "assets/photos/before.jpg" } })["index.html"];
  assert.ok(!one.includes("<section class=\"ba-sec\">"), "a site never shows half a before/after");
  const draft = P.render(SAMPLE, { mode: "draft", photos: { after: "/x.jpg" } })["index.html"];
  assert.ok(draft.includes("<section class=\"ba-sec\">") && draft.includes('class="ba half"') && !draft.includes('class="ba-range"'));
  assert.ok(!P.render(SAMPLE, { mode: "draft" })["index.html"].includes("<section class=\"ba-sec\">"), "nothing until a photo is in");
  assert.ok(P.PHOTOS.before && P.PHOTOS.after && P.FIELDS.ba_title.max === 40);
}

// --- schema.org JSON-LD: on a live site only, from the owner's facts
{
  const S = await import(new URL("../../demos/netlify/lib/templates/schema.mjs", import.meta.url).href);
  const ld = (html) => { const m = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html); return m && JSON.parse(m[1]); };
  const site = P.render({ ...SAMPLE, business_name: "אורן </script><b>", hours: "א׳–ה׳ 7:00–19:00" }, { mode: "site" })["index.html"];
  assert.equal(site.match(/<\/script>/g).length, site.match(/<script\b/g).length, "nothing closes the JSON-LD early");
  const j = ld(site);
  assert.equal(j["@type"], "Plumber"); assert.equal(j.name, "אורן </script><b>"); assert.equal(j.telephone, "+972526359513");
  assert.deepEqual(j.areaServed, SAMPLE.towns);
  assert.deepEqual(j.openingHoursSpecification[0].dayOfWeek, ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]);
  assert.equal(j.openingHoursSpecification[0].opens, "07:00");
  const offers = j.hasOfferCatalog.itemListElement;
  assert.equal(offers.length, SAMPLE.services.length);
  assert.deepEqual(offers[2].priceSpecification, { "@type": "PriceSpecification", minPrice: 350, maxPrice: 2800, priceCurrency: "ILS" });
  assert.ok(!("aggregateRating" in j) && !("address" in j), "nothing the owner didn't give");
  assert.equal(ld(P.render(SAMPLE, { mode: "draft" })["index.html"]), null, "not in a draft");
  assert.equal(S.openingHours("בתיאום מראש"), null); assert.equal(S.priceRange("לפי הצעת מחיר"), null); assert.equal(S.priceRange("2026"), null);
  assert.equal(S.schemaType("חשמלאי מוסמך"), "Electrician"); assert.equal(S.schemaType("גינון"), "HomeAndConstructionBusiness");
  const bare = ld(P.render({ ...SAMPLE, hours: "", services: [{ name: "שירות", price: "" }] }, { mode: "site" })["index.html"]);
  assert.ok(!bare.openingHoursSpecification && !bare.hasOfferCatalog.itemListElement[0].priceSpecification);
  assert.equal(S.localBusiness({ ...SAMPLE, towns: [] }).areaServed, SAMPLE.area);
}

// --- "save to contacts": a vCard on a live site, linked from the page, with its own content type
{
  const site = P.render({ ...SAMPLE, business_name: "אורן; מים", phone: "04-6222222" }, { mode: "site" });
  const v = site["contact.vcf"];
  assert.ok(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n") && v.endsWith("END:VCARD\r\n"));
  assert.ok(v.includes("FN:אורן\\; מים\r\n"), "vCard special characters are escaped");
  assert.ok(v.includes("TEL;TYPE=WORK,VOICE:+97246222222\r\n") && v.includes("TEL;TYPE=CELL:+972526359513\r\n"));
  assert.ok(site["index.html"].includes('href="contact.vcf"'));
  assert.ok(!("contact.vcf" in P.render(SAMPLE, { mode: "draft" })), "not in a draft");
  assert.match(P.HEADERS, /\/contact\.vcf\n  Content-Type: text\/vcard; charset=utf-8/);
}

// --- guides: the urgent ones on the main page, everything on guides.html with FAQPage for Google
{
  const G = JSON.parse((await import("node:fs")).readFileSync(new URL("../../demos/shared/guides/plumber.json", import.meta.url), "utf8"));
  const site = P.render(SAMPLE, { mode: "site" });
  const now = G.items.filter((x) => x.kind === "now");
  assert.ok(now.every((x) => site["index.html"].includes(`id="g-${x.id}"`)), "the urgent guides are on the main page");
  assert.ok(site["index.html"].includes('href="guides.html"'));
  assert.ok(G.items.every((x) => site["guides.html"].includes(`id="g-${x.id}"`)));
  const m = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(site["guides.html"]);
  const faq = JSON.parse(m[1]); assert.equal(faq["@type"], "FAQPage"); assert.equal(faq.mainEntity.length, G.items.filter((x) => x.kind !== "now").length);
  assert.ok(!("guides.html" in P.render(SAMPLE, { mode: "draft" })), "not in a draft");
  assert.ok(site["index.html"].includes('id: "leak"'), "the chat links to the leak guide when it's urgent");
  // every item in every trade has what the page needs
  const dir = new URL("../../demos/shared/guides/", import.meta.url);
  for (const f of (await import("node:fs")).readdirSync(dir)) {
    const g = JSON.parse((await import("node:fs")).readFileSync(new URL(f, dir), "utf8"));
    const ids = new Set();
    for (const it of g.items) {
      assert.ok(/^[a-z0-9-]+$/.test(it.id) && !ids.has(it.id), f + ": id " + it.id); ids.add(it.id);
      assert.ok(["now", "tip", "faq"].includes(it.kind) && it.q && (it.a || it.steps), f + ": " + it.id);
      assert.ok(!/₪|ש״ח/.test(JSON.stringify(it)), f + ": no prices in general guides");
    }
  }
}

console.log("all site builder tests passed");
