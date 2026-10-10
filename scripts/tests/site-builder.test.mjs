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
assert.deepEqual(paths, ["CLIENT.md", "_headers", "accessibility.html", "assets/favicon.svg", "assets/leadbot.js", "assets/leadform.js", "assets/hero-poster.jpg", "assets/hero.mp4", "assets/photos/portrait.jpg", "assets/photos/work1.webp", "index.html", "privacy.html"].map((p) => "clients/oren-mayim/" + p).sort());
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

console.log("all site builder tests passed");
