// The site builder end to end, against fakes of Supabase (PostgREST and Storage), Anthropic, GitHub and WhatsApp (builder-fakes.mjs).
// Run: node scripts/tests/site-builder.test.mjs  (from the repo root; needs demos/node_modules for @anthropic-ai/sdk)
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SAMPLE } from "./builder-sample.mjs";
const F = new URL("../../demos/netlify/functions/", import.meta.url).href;

import { T, storage, sentWa, aiCalls, ai, gh, DEF, imageCalls, nl, indexNow } from "./builder-fakes.mjs";
const { TEMPLATES } = await import("../../demos/netlify/lib/builder.mjs");
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
// "תחום אחר": the owner's own trade on the closest demo's design; a neutral site, no other trade's guides or samples.
r = await J(await req("start", { body: { name: "דנה", phone: "0526359513", consent: true, template: "massage", own_trade: "וטרינרית <b>" }, ip: "3.3.3.3" }));
assert.equal(r.status, 201); { const c = T.ls_drafts[0].content;
  assert.equal(T.ls_drafts[0].template, "massage"); assert.equal(c.trade, "וטרינרית b"); assert.equal(c.custom_trade, true); assert.equal(c.headline_1, "");
  assert.ok(r.state.guide && !r.state.guide.steps.some((s) => ["services", "prices", "headline", "intro"].includes(s.id)) && r.state.guide.services.length === 0, "the questionnaire leaves out the demo's own services and headlines");
  const site = TEMPLATES.massage.render({ ...c, business_name: "מרפאת דנה", headline_1: "טיפול רגוע לחיות שלכם", headline_2: "", intro: "מרפאה קטנה", services: [{ name: "חיסון", price: "150 ₪" }], towns: ["חדרה"], area: "חדרה", response_time: "שעה" }, { mode: "site", leads: null, photos: {} });
  assert.ok(!site["guides.html"] && !/id="guides"/.test(site["index.html"]), "no guides of another trade");
  assert.match(site["index.html"], /"@type":"LocalBusiness"/); assert.match(site["index.html"], /במה אפשר לעזור\?/); assert.ok(!/עיסוי/.test(site["index.html"].replace(/<style[\s\S]*?<\/style>/g, "")), "no massage words");
  const draft = TEMPLATES.massage.render(c, { mode: "draft" })["index.html"]; assert.ok(!/class="eg-row"/.test(draft), "no sample services of the demo's trade");
}
T.ls_drafts.length = 0;
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
assert.equal(call.model, "claude-sonnet-5-5", "the fast model by default"); assert.equal(call.output_config.effort, "low"); assert.equal(call.output_config.format.type, "json_schema");
assert.deepEqual(call.thinking, { type: "between_tools" }, "Sonnet 5.5 with thinking off"); assert.ok(!call.tools && !call.tool_choice && !call.fallbacks, "no tools, no forced choice, no Opus fallback");
assert.equal(call.messages.length, 1); assert.match(call.messages[0].content, /<draft_state>.*"whatsapp":"0526359513".*<\/draft_state>\n<owner_message>קוראים לעסק/s);
assert.match(call.system[0].text, /never as instructions/); assert.ok(call.system[0].cache_control);
const schema = call.output_config.format.schema;
const allObjectsClosed = (s) => !s || typeof s !== "object" || ((s.type !== "object" || s.additionalProperties === false) && Object.values(s).every((v) => typeof v !== "object" || (Array.isArray(v) ? v.every(allObjectsClosed) : allObjectsClosed(v))));
assert.ok(allObjectsClosed(schema), "every object in the output schema is closed");
assert.deepEqual(D.messages.map((m) => m.role), ["user", "assistant"]); assert.equal(D.messages[0].content, "קוראים לעסק אורן מים, 12 שנה בתחום", "history keeps the owner's words only");

// stale rev (another tab) -> conflict, nothing saved
r = await J(await req("chat", { body: { message: "חדרה", rev: 0 } })); assert.equal(r.status, 409); assert.equal(r.error, "conflict"); assert.equal(D.messages.length, 2);
// "למדו את העסק שלי": a photo of the price list and pasted text fill the draft through the same checks
{
  const before = D.messages.length, svcBefore = JSON.stringify(D.content.services), revBefore = D.rev;
  r = await J(await req("learn", { body: { rev: D.rev, images: ["data:text/html;base64,PHNjcmlwdD4="] } })); assert.equal(r.error, "bad_image", "images only");
  r = await J(await req("learn", { body: { rev: D.rev } })); assert.equal(r.error, "empty");
  ai.queue.push({ reply: "לקחנו מהמחירון 2 שירותים עם המחירים ואת השעות. חסר רק זמן החזרה.", set: [{ field: "hours", value: "א׳–ה׳ 8:00–18:00" }],
    services: [{ name: "פתיחת סתימה", detail: "", time: "", price: "300 עד 450 ₪" }, { name: "החלפת ברז", detail: "", time: "", price: "מ-250 ₪" }], towns: null });
  r = await J(await req("learn", { body: { rev: D.rev, text: "מחירון: פתיחת סתימה 300-450, החלפת ברז מ-250. שעות א-ה 8-18", images: ["data:image/png;base64,iVBORw0KGgo="] } }));
  assert.equal(r.status, 200, JSON.stringify({ ...r, state: r.state && r.state.status })); assert.match(r.reply, /לקחנו מהמחירון/); assert.ok(r.draft && r.changed.includes("hours"));
  const call = aiCalls.at(-1).messages.at(-1).content;
  assert.equal(call[0].type, "image"); assert.equal(call[0].source.media_type, "image/png");
  assert.match(call.at(-1).text, /<owner_material>מחירון: פתיחת סתימה 300-450/); assert.match(call.at(-1).text, /owner's own word/);
  assert.deepEqual(D.content.services.map((x) => x.price), ["300 עד 450 ₪", "מ-250 ₪"]); assert.equal(D.content.hours, "א׳–ה׳ 8:00–18:00");
  assert.equal(D.messages.length, before + 2); assert.match(D.messages.at(-2).content, /^שיתפנו חומר על העסק · 1 תמונות · טקסט: מחירון/, "the history keeps text only");
  assert.ok(!JSON.stringify(D.messages).includes("iVBORw0KGgo"), "no image data in the stored history");
  D.content.services = JSON.parse(svcBefore); D.content.hours = ""; D.messages.length = before; D.rev = revBefore; // back to where the test was
}

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
assert.match(P.render({ ...SAMPLE, look: "nope", palette: "x" }, { mode: "site" })["index.html"], /<body class="look-luxe">/, "an unknown look falls back to the trade's first, smart luxury");
// Each trade sees the looks that suit it: a beauty clinic the studio, the price list and the appointment card first.
{
  const ids = (t) => P.catalog(t).map((l) => l.id);
  assert.deepEqual(ids("plumber"), ["luxe", "blueprint", "certificate", "van", "ticket", "dispatch", "mosaic"]);
  assert.deepEqual(ids("cosmetics"), ["luxe", "studio", "menu", "appointment", "mosaic", "certificate"]);
  assert.ok(!ids("nails").includes("blueprint") && !ids("barber").includes("van"), "no technician looks for a salon");
  const care = { ...SAMPLE, trade_id: "cosmetics", trade: "קוסמטיקאית", services: [{ name: "טיפול פנים", price: "250 עד 350 ₪" }, { name: "גבות" }] };
  assert.match(P.render(care, { mode: "site" })["index.html"], /<body class="look-luxe">/, "smart luxury is the default, for a beauty clinic too");
  const menu = P.render({ ...care, look: "menu" }, { mode: "site" })["index.html"].match(/<div class="menu-card">[\s\S]*?<\/div>/)[0];
  assert.match(menu, /טיפול פנים<\/span><i aria-hidden="true"><\/i><span class="mc-p">250 עד 350 ₪/); assert.match(menu, /גבות<\/span><i aria-hidden="true"><\/i><\/li>/, "no price is invented");
  const appt = P.render({ ...care, look: "appointment" }, { mode: "site" })["index.html"].match(/<div class="appt">[\s\S]*?ap-foot[^<]*<\/p>/)[0];
  assert.ok(!/\d{1,2}:\d{2}/.test(appt.replace(SAMPLE.hours || "", "")), "the card shows no booked time");
  assert.match(P.render({ ...care, look: "studio", business_name: "<b>x" }, { mode: "site" })["index.html"], /ar-l">&lt;</);
}
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
// Every palette keeps WCAG AA for its text (4.5:1); the soft labels on a dark hero at least 3:1 (they are small extras).
{
  const lum = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  for (const [lid, L] of Object.entries(P.LOOKS)) for (const [pid, p] of Object.entries(L.palettes)) {
    const c = (k) => (k.startsWith("#") ? k : p[k]);
    const pairs = [["ink", "paper"], ["inkSoft", "paper"], ["accent", "paper"], ["#ffffff", "signal"], ["#ffffff", "accent"], ["#ffffff", "deep"], ["text", "deep"]];
    if (L.dark) pairs.push(["#ffffff", "hero"], ["text", "hero"]);
    for (const [f, b] of pairs) assert.ok(ratio(c(f), c(b)) >= 4.5, `${lid} ${pid}: ${f} on ${b} is ${ratio(c(f), c(b)).toFixed(2)}`);
    if (L.dark) assert.ok(ratio(c("soft"), c("hero")) >= 3, `${lid} ${pid}: soft on hero`);
    assert.ok(!/^#(f[0-9a-f]|e[0-9a-f])(d|e|f)[0-9a-f]0[0-9a-f]/i.test(p.accent), `${lid} ${pid}: no yellow accent`);
  }
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
r = await J(await req("photo", { raw: webp, query: "?slot=banner", headers: { "x-photo-rights": "yes" } })); assert.equal(r.error, "bad_slot");
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
assert.match(B.renderDraft(D), /class="(sample-tag|lx-tag)"/, "without the video the draft shows the sample photo");
assert.ok(!/sample-tag|shared\/photos/.test(P.render(SAMPLE, { mode: "site" })["index.html"]), "a published site never shows the sample");

/* ---------------- up to 5 short videos: "סרטונים מהעבודה" ---------------- */
const creq = (headers = {}) => req("clip", { raw: vbody(jpg, mp4), ip: "4.4.4.4", headers: { "content-type": "application/octet-stream", "x-photo-rights": "yes", "x-poster-length": String(jpg.length), "x-video-size": "720x1280", ...headers } });
r = await J(await creq({ "x-photo-rights": "" })); assert.equal(r.error, "no_rights");
r = await J(await req("clip", { raw: vbody(jpg, Buffer.from("<html>no</html>".repeat(20))), ip: "4.4.4.4", headers: { "content-type": "application/octet-stream", "x-photo-rights": "yes", "x-poster-length": String(jpg.length) } })); assert.equal(r.status, 415, "only an MP4");
const beforeClips = storage.size;
r = await J(await creq({ "x-title": encodeURIComponent("פתיחת סתימה <b>במטבח</b>") }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.videos.length, 1); assert.equal(storage.size, beforeClips + 2);
assert.equal(D.videos[0].title, "פתיחת סתימה b במטבח /b", "no markup in a title"); assert.deepEqual([D.videos[0].w, D.videos[0].h], [720, 1280]);
assert.match(D.videos[0].id, /^[0-9a-f]{8}$/); assert.match(r.state.videos[0].src, /\/clip-[0-9a-f]{12}\.mp4$/); assert.match(r.state.videos[0].poster, /\/clipposter-.*\.jpg$/);
r = await J(await creq()); assert.equal(D.videos.length, 2); assert.equal(D.content.hero_media, undefined, "a clip doesn't touch the content");
html = B.renderDraft(D);
assert.match(html, /<section class="clips-sec" id="videos">/); assert.equal((html.match(/<figure class="vclip"/g) || []).length, 2);
assert.match(html, /<video muted loop playsinline preload="none" data-src="https:\/\/x\.supabase\.co[^"]*clip-[^"]*\.mp4" width="720" height="1280"/, "no src until it plays");
assert.ok(!/<video[^>]* src=/.test(html.split('class="clips-sec"')[1]), "nothing of the short videos is fetched on load");
assert.match(html, /<img src="data:image\/gif;base64,[^"]+" data-src="https:\/\/x\.supabase\.co[^"]*clipposter[^"]*" alt="" width="720" height="1280"/, "the poster loads when the section is near");
assert.equal((html.match(/<script>\(function \(\) \{\n  var list = /g) || []).length, 1, "the clips' script once");
r = await J(await req("clip", { method: "PUT", query: "?id=" + D.videos[1].id, body: { title: "ניקוי סתימה בחדרה" } })); assert.equal(r.status, 200); assert.equal(D.videos[1].title, "ניקוי סתימה בחדרה");
assert.match(B.renderDraft(D), /<figcaption>ניקוי סתימה בחדרה<\/figcaption>/);
r = await J(await req("clip", { method: "PUT", query: "?id=nothere0", body: { title: "x" } })); assert.equal(r.status, 400);
r = await J(await req("clip", { method: "DELETE", query: "?id=0000ffff" })); assert.equal(r.status, 404);
const gone = D.videos[0];
r = await J(await req("clip", { method: "DELETE", query: "?id=" + gone.id })); assert.equal(r.status, 200); assert.equal(D.videos.length, 1);
assert.ok(!storage.has(gone.path) && !storage.has(gone.poster.path), "a removed video and its frame are deleted"); assert.equal(storage.size, beforeClips + 2);
for (let i = 0; i < 4; i++) { r = await J(await creq()); assert.equal(r.status, 200, JSON.stringify(r)); }
assert.equal(D.videos.length, 5); r = await J(await creq()); assert.equal(r.error, "too_many", "5 short videos at most");
for (let i = 0; i < 6; i++) { r = await J(await vreq(vbody(jpg, mp4))); assert.equal(r.status, 200, "video " + (i + 7)); }
r = await J(await vreq(vbody(jpg, mp4))); assert.equal(r.error, "rate_limited", "12 videos per 10 minutes from one address");
r = await J(await req("video", { raw: vbody(jpg, mp4), ip: "3.3.3.3", headers: { "content-type": "application/octet-stream", "x-photo-rights": "yes", "x-poster-length": String(jpg.length) } }));
assert.ok(D.video, "back for the publish test");
for (const x of D.videos.slice(2)) await req("clip", { method: "DELETE", query: "?id=" + x.id }); // two stay for the publish test
assert.equal(D.videos.length, 2);

/* ---------------- the top of the site: a photo or the video, the owner's pick ---------------- */
r = await J(await req("photo", { raw: webp, query: "?slot=hero", headers: { "x-photo-rights": "yes" } })); assert.equal(r.status, 200);
assert.equal(r.state.hero, "video", "without a pick, the video shows");
html = B.renderDraft(D); assert.match(html, /<figure class="reel">/); assert.ok(!/class="hero has-bg"|class="lx-photo has"/.test(html), "one of them, not both");
r = await J(await req("answer", { body: { hero: "photo", rev: D.rev } })); assert.equal(r.status, 200); assert.equal(D.content.hero_media, "photo"); assert.equal(r.state.hero, "photo");
assert.match(r.draft, /class="hero has-bg"|class="lx-photo has"/); assert.ok(!r.draft.includes('<figure class="reel">'));
r = await J(await req("answer", { body: { hero: "banner", rev: D.rev } })); assert.equal(r.status, 422);
r = await J(await req("answer", { body: { hero: "video", rev: D.rev } })); assert.equal(D.content.hero_media, "video"); assert.match(r.draft, /<figure class="reel">/);

/* ---------------- six work photos: the draft marks only the first three empty frames ---------------- */
r = await J(await req("photo", { raw: webp, query: "?slot=work5", headers: { "x-photo-rights": "yes" } })); assert.equal(r.status, 200);
assert.deepEqual([D.photos.work5.w, D.photos.work5.h], [257, 257], "the photo's size, read from its header");
html = B.renderDraft(D); assert.match(html, /builder\/drafts\/.*work1-/); assert.match(html, /eg-photo"><img src="\/shared\/photos\/plumber-drain\.webp"/, "an empty slot shows the trade's sample photo in the draft");
assert.ok(!html.includes("עבודה 4<br>מעלים"), "slots 4 to 6 only once filled"); assert.match(html, /work5-[0-9a-f]+\.webp" alt="[^"]*" width="257" height="257" loading="lazy"/);
assert.match(html, /<div class="details n4">/, "1, 2, 3 (empty frames) and 5");

/* ---------------- approve ---------------- */
r = await J(await req("approve", { body: { package: "ai", plan: "three", rev: D.rev } })); assert.equal(r.error, "bad_package", "the setup is one payment");
const keep = D.content.intro; D.content.intro = "";
r = await J(await req("approve", { body: { package: "ai", plan: "full", rev: D.rev } })); assert.equal(r.error, "missing"); assert.deepEqual(r.missing, ["פסקת פתיחה"]);
D.content.intro = keep;
process.env.PAY_URL_AI = "javascript:alert(1)";
r = await J(await req("approve", { body: { package: "ai", plan: "full", rev: D.rev } }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.status, "client_approved"); assert.equal(r.alert, "sent");
assert.deepEqual(r.state.pay, [], "only https payment links");
const alertLead = T.ls_leads.at(-1); assert.equal(alertLead.client_slug, "kfir"); assert.equal(alertLead.service, "אתר חדש מחכה לאישור"); assert.match(alertLead.message, /אורן מים · נציג AI · תשלום אחד/);
assert.ok(sentWa.some((m) => m.to === "972526359513" && m.template.name === "owner_new_lead"));
r = await J(await req("chat", { body: { message: "עוד שינוי", rev: D.rev } })); assert.equal(r.error, "locked");
r = await J(await req("photo", { raw: webp, query: "?slot=work2", headers: { "x-photo-rights": "yes" } })); assert.equal(r.error, "locked");
// back to editing and approve again
r = await J(await req("reopen", { body: { rev: D.rev } })); assert.equal(D.status, "draft");
r = await J(await req("approve", { body: { package: "ai", plan: "full", rev: D.rev } })); assert.equal(D.status, "client_approved");

/* ---------------- כפיר ---------------- */
r = await J(await adm("GET", null, "", "wrong-admin-key-0000")); assert.equal(r.status, 401);
r = await J(await adm("GET")); assert.equal(r.drafts.length, 1); assert.equal(r.drafts[0].business, "אורן מים"); assert.ok(!("key_hash" in r.drafts[0]));
r = await J(await adm("GET", null, "?id=" + D.id)); assert.match(r.preview, new RegExp(`^/draft/${D.id}\\?a=\\d{10}\\.`));
page = await draftPage(new Request(ORIGIN + r.preview), { params: { id: D.id } }); assert.equal(page.status, 200, "the admin preview link works");
r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.status, 409, "not paid yet");
r = await J(await adm("POST", { action: "return", id: D.id, note: "" })); assert.equal(r.error, "note_required");
r = await J(await adm("POST", { action: "return", id: D.id, note: "תחליפו את התמונה הראשית" })); assert.equal(D.status, "returned");
r = await J(await req("state", { method: "GET" })); assert.equal(r.state.returnNote, "תחליפו את התמונה הראשית");
r = await J(await req("approve", { body: { package: "presence", plan: "full", rev: D.rev } })); assert.equal(r.status, 422, "only נציג AI is on sale"); assert.equal(r.error, "bad_package");
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
assert.deepEqual(r.hosting, { state: "off" }, "without NETLIFY_TOKEN the site waits for a deploy by hand");
const tree = gh.trees.at(-1); assert.equal(tree.base_tree, "tree-c-other", "rebuilt on the new head");
const paths = tree.tree.map((e) => e.path).filter((x) => !/\/service-[a-z0-9]+\.html$/.test(x)).sort();
assert.equal(tree.tree.filter((e) => /\/service-[a-z0-9]+\.html$/.test(e.path)).length, D.content.services.length, "a page per service in the repo too");
assert.deepEqual(paths, ["CLIENT.md", "_headers", "accessibility.html", "assets/a11y.js", "assets/aibot.js", "assets/favicon.svg", "assets/leadbot.js", "assets/leadform.js", "assets/hero-poster.jpg", "assets/hero.mp4", "assets/photos/portrait.jpg", "assets/photos/work1.webp", "assets/photos/work5.webp",
  ...D.videos.flatMap((x) => [`assets/videos/${x.id}.mp4`, `assets/videos/${x.id}-poster.jpg`]), "contact.vcf", "guides.html", "index.html", "privacy.html"].map((p) => "clients/oren-mayim/" + p).sort());
const file = (p) => tree.tree.find((e) => e.path === "clients/oren-mayim/" + p);
assert.equal(file("assets/leadbot.js").sha, "sha-bot"); assert.equal(file("assets/aibot.js").sha, "sha-ai", "the AI chat's script is published too"); assert.ok(file("assets/photos/portrait.jpg").sha.startsWith("blob-"));
const index = file("index.html").content;
assert.ok(!/noindex|טיוטה|class="todo"/.test(index), "no draft marks on the real site"); assert.match(index, /"leads":"https:\/\/service-pro-web.netlify.app\/api\/lead\/oren-mayim"/);
// the AI chat: a section of questions from the owner's facts, opening the chat on the business's own /api/chat/<slug>
assert.match(index, /id="ask"/); assert.match(index, /src="assets\/aibot.js" defer/); assert.match(index, /corner: false/);
assert.match(index, /SITE\.leads\.replace\("\/api\/lead\/", "\/api\/chat\/"\)/);
assert.match(index, /data-ask="כמה עולה [^"]+\?"/, "a price question from the owner's own services");
assert.match(index, /src="assets\/photos\/portrait.jpg"/); assert.match(index, /src="assets\/leadbot.js"/); assert.match(index, /<source src="assets\/hero.mp4" type="video\/mp4">/); assert.match(index, /poster="assets\/hero-poster.jpg"/);
assert.ok(!paths.some((x) => /photos\/hero\./.test(x)), "the top shows the video: its photo isn't published");
assert.equal((index.match(/<figure class="vclip"/g) || []).length, 2); assert.match(index, new RegExp(`data-src="assets/videos/${D.videos[0].id}.mp4" width="720" height="1280"`));
assert.match(index, /src="assets\/photos\/work5.webp" alt="[^"]*" width="257" height="257"/); assert.match(index, /<div class="details n2">/, "a live site shows only the photos it has");
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
assert.equal(D.self_edit, true, "publishing opens self edit: it comes with the monthly");
r = await J(await adm("POST", { action: "self_edit", id: D.id, on: false })); assert.equal(r.status, 200); assert.equal(D.self_edit, false);
r = await J(await req("chat", { body: { message: "תשנו את הכותרת", rev: D.rev }, ip: "6.6.6.1" })); assert.equal(r.error, "locked", "not while כפיר has it off");
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
// and a short video while editing: a change too, gone with the discard; a live one stays in storage when removed
const liveClip = D.videos[0];
r = await J(await req("clip", { method: "DELETE", query: "?id=" + liveClip.id, ip: "6.6.6.1" })); assert.equal(r.status, 200);
assert.ok(storage.has(liveClip.path), "the live site's video stays in storage while editing");
r = await J(await creq()); assert.equal(r.status, 200, JSON.stringify(r)); const unusedClip = D.videos.at(-1);
assert.equal(r.state.edit.dirty, true);
r = await J(await req("discard", { body: { rev: D.rev }, ip: "6.6.6.1" }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.content.intro, "פתיחה חדשה מבעל העסק."); assert.ok(!D.photos.work2); assert.ok(!storage.has(unused)); assert.equal(r.state.edit.dirty, false);
assert.ok(!storage.has(unusedClip.path) && !storage.has(unusedClip.poster.path), "the unpublished video is deleted"); assert.equal(D.videos[0].id, liveClip.id, "the live videos are back");
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
  assert.equal(r.state.looks.length, 7); assert.deepEqual(r.state.style, { look: "luxe", palette: "violet" });
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
T.ls_payments.push({ ...DEF.ls_payments(), draft_id: old.id }); // a checkout opened and never paid holds the draft (on delete restrict)
const del = await B.deleteStaleDrafts(new Date("2026-10-10T03:00:00Z"));
assert.ok(!T.ls_payments.some((p) => p.draft_id === old.id), "its unpaid checkout goes first");
assert.equal(del.draftsDeleted, 1); assert.ok(!T.ls_drafts.includes(old)); assert.ok(T.ls_drafts.includes(D)); assert.ok(!storage.has("drafts/old/portrait-1.webp"));
// the message cap: a draft that already holds 80 messages gets no more AI turns
const E = T.ls_drafts[1], eKey = "e".repeat(32); E.key_hash = createHash("sha256").update(eKey).digest("hex");
E.messages = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" })); cred = E.id + ":" + eKey;
const calls = aiCalls.length;
r = await J(await req("chat", { body: { message: "עוד", rev: E.rev }, ip: "5.5.5.5" })); assert.equal(r.error, "limit"); assert.equal(aiCalls.length, calls);
cred = E.id + ":k"; assert.equal((await req("state", { method: "GET" })).status, 404, "a malformed key");
// self edit: the monthly allowance is the limit, not the history's length; the history keeps the latest turns
{
  const live = { status: "published", self_edit: true, published_slug: "x", messages: E.messages };
  assert.equal(B.historyFull(E), true); assert.equal(B.historyFull(live), false, "a live site's chat never locks on its length");
  const m = B.withTurn(live, "שאלה", "תשובה");
  assert.equal(m.length, 60); assert.equal(m[0].role, "user"); assert.deepEqual(m.at(-1), { role: "assistant", content: "תשובה" });
  assert.equal(B.withTurn(E, "a", "b").length, 82, "a draft's history is not cut (it stops at the cap)");
}

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
// --- the gallery: 1 to 6 work photos in tidy rows; the short videos load nothing until they play; the top's pick
{
  for (let n = 1; n <= 6; n++) {
    const photos = Object.fromEntries(P.WORKS.slice(0, n).map((w) => [w, `assets/photos/${w}.webp`]));
    const html = P.render(SAMPLE, { mode: "site", photos, sizes: { work1: [1200, 900] } })["index.html"];
    assert.match(html, new RegExp(`<div class="details n${n}">`)); assert.equal((html.match(/<div class="detail">/g) || []).length, n);
    assert.match(html, /src="assets\/photos\/work1.webp" alt="[^"]*" width="1200" height="900" loading="lazy"/);
  }
  assert.match(P.render({ ...SAMPLE, work6_title: "ניקוי מרזב" }, { mode: "site", photos: { work6: "assets/photos/work6.webp" } })["index.html"], /פרט א׳<\/span><h3>ניקוי מרזב<\/h3>/);
  assert.match(P.render(SAMPLE, { mode: "draft" })["index.html"], /<div class="details n3">/, "an empty draft: three frames, not six");
  const clips = [1, 2, 3, 4, 5, 6].map((i) => ({ src: `assets/videos/c${i}.mp4`, poster: `assets/videos/c${i}-poster.webp`, title: i === 1 ? "סתימה <b>" : "", w: 720, h: 1280 }));
  const site = P.render(SAMPLE, { mode: "site", clips })["index.html"];
  assert.equal((site.match(/<figure class="vclip"/g) || []).length, 5, "five at most"); assert.match(site, /<div class="vclips n5">/);
  assert.match(site, /data-t="סתימה &lt;b&gt;"/); assert.ok(!/<video[^>]* src=/.test(site.split("<section class=\"clips-sec\"")[1]), "no video file on load");
  assert.ok(!P.render(SAMPLE, { mode: "site" })["index.html"].includes("<section class=\"clips-sec\""), "no videos, no section");
  const both = { photos: { hero: "assets/photos/hero.webp" }, video: { src: "assets/hero.mp4", poster: "assets/hero-poster.webp" } };
  assert.match(P.render(SAMPLE, { mode: "site", ...both })["index.html"], /<figure class="reel">/, "no pick: the video");
  const pickPhoto = P.render({ ...SAMPLE, hero_media: "photo" }, { mode: "site", ...both })["index.html"];
  assert.ok(/class="hero has-bg"|class="lx-photo has"/.test(pickPhoto) && !pickPhoto.includes('<figure class="reel">') && !pickPhoto.includes("querySelector(\".reel video\")"), "the photo, not both");
  const pickVideo = P.render({ ...SAMPLE, hero_media: "video" }, { mode: "site", photos: both.photos })["index.html"];
  assert.ok(/class="drawing"|class="lx-stage"/.test(pickVideo) && !/lx-photo has|hero has-bg/.test(pickVideo), "a pick without its file: the look's own visual, not the photo");
  assert.equal(P.heroKind({}, { photo: true }), "photo"); assert.equal(P.heroKind({ hero_media: "photo" }, { video: true }), null);
}
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

// A background photo at the top: the template washes it behind the text; the image model gets the rules.
{
  const t = await import("../../demos/netlify/lib/templates/plumber.mjs");
  const lib = await import("../../demos/netlify/lib/builder.mjs");
  const c = { ...t.emptyContent(), business_name: "אורן מים", trade: "אינסטלציה", area: "חדרה" };
  const page = t.render(c, { mode: "draft", assets: "/shared/", photos: { hero: "assets/photos/hero.webp" } })["index.html"];
  assert.ok(/class="hero has-bg"|class="lx-photo has"/.test(page) && page.includes("url('assets/photos/hero.webp')"), "the hero shows the photo");
  const bare = t.render(c, { mode: "draft", assets: "/shared/" })["index.html"];
  assert.ok(bare.includes("url('/shared/photos/plumber-siphon.webp')") && /class="(sample-tag|lx-tag)"/.test(bare), "no photo of theirs: the trade's sample, labelled");
  assert.ok(t.PHOTOS.hero, "hero is a photo slot");
  delete process.env.GEMINI_API_KEY;
  assert.equal(lib.heroAI(), false, "no key, no button");
  process.env.GEMINI_API_KEY = "test";
  const img = await lib.heroImage(c, "מקלחת נקייה <script>");
  assert.equal(img.mime, "image/png");
  const said = imageCalls.at(-1).contents[0].parts[0].text;
  assert.ok(/No people/.test(said) && /No text/.test(said) && /No yellow/.test(said) && said.includes("אינסטלציה") && !said.includes("<script>"), "the prompt keeps the rules");
  delete process.env.GEMINI_API_KEY;
}

/* ---------------- hosting: the site on the air by itself (Netlify API, lib/hosting.mjs) ---------------- */
{
  const H = await import("../../demos/netlify/lib/hosting.mjs");
  const lib = await import("../../demos/netlify/lib/builder.mjs");
  assert.equal(H.cleanDomain("https://www.Oren-Mayim.co.il/about?x=1"), "oren-mayim.co.il");
  for (const bad of ["oren", "x.netlify.app", "a b.co.il", "-x.co.il", "javascript:alert(1)"]) assert.equal(H.cleanDomain(bad), null, bad);
  process.env.SITES_DOMAIN = "sites.example.co.il";
  assert.equal(H.cleanDomain("oren.sites.example.co.il"), null, "never our own domain");
  process.env.NETLIFY_TOKEN = "nf-test";
  const C = T.ls_clients.find((c) => c.slug === "oren-mayim");
  if (D.live) Object.assign(D, { content: D.live.content, photos: D.live.photos || {}, video: D.live.video || null }); // nothing unpublished
  Object.assign(D, { status: "published", self_edit: false, paid_at: D.paid_at || new Date().toISOString() }); // a live site, as after publishing
  nl.taken.add("oren-mayim"); // someone on Netlify has the name: the next one is taken
  // A first try that fails after the site was made: its id is saved at once, and the next try uses that site.
  nl.failDeploy = 1;
  r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" }));
  assert.equal(r.hosting.state, "failed", JSON.stringify(r.hosting));
  assert.equal(nl.sites.size, 1); assert.equal(D.site_id, [...nl.sites.values()][0].id, "the new site's id is saved before the deploy");
  D.site_id = null; D.site_netlify = null; // and a run cut off even before that: the site is found by its address
  r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" }));
  assert.equal(r.status, 200, JSON.stringify(r));
  assert.deepEqual(r.hosting, { state: "live", url: "https://oren-mayim.sites.example.co.il/" });
  const site = [...nl.sites.values()][0];
  assert.equal(nl.sites.size, 1); assert.equal(site.name, "oren-mayim-site"); assert.equal(site.custom_domain, "oren-mayim.sites.example.co.il");
  assert.deepEqual(nl.records.map((x) => [x.type, x.hostname, x.value]), [["CNAME", "oren-mayim.sites.example.co.il", "oren-mayim-site.netlify.app"]]);
  assert.equal(D.site_id, site.id); assert.equal(D.site_host, "oren-mayim.sites.example.co.il"); assert.equal(D.site_netlify, "oren-mayim-site.netlify.app");
  const sent = Object.keys([...nl.deploys.values()].at(-1).files).sort();
  for (const f of ["/index.html", "/_headers", "/assets/leadbot.js", "/assets/leadform.js", "/assets/a11y.js", "/guides.html", "/contact.vcf"]) assert.ok(sent.includes(f), "deployed " + f);
  assert.ok(sent.some((f) => f.startsWith("/assets/photos/portrait.")), "the photos too");
  assert.ok(!sent.includes("/CLIENT.md"), "the repo card is not served");
  assert.ok(sent.includes("/robots.txt") && sent.includes("/sitemap.xml"), "robots and a sitemap for Google");
  const idx = nl.bodies.get("/index.html");
  assert.ok(sent.some((f) => /^\/assets\/fonts\/[a-z]+\.css$/.test(f)) && /@font-face\{[^}]*url\(assets\/fonts\/[\w.-]+\.woff2\)/.test(idx) && /rel="preload"[^>]+\.woff2"/.test(idx) && !/fonts\.googleapis/.test(idx), "the fonts come from the site itself");
  assert.match(nl.bodies.get("/privacy.html"), /הגופנים נטענים מהאתר עצמו/);
  const svc = sent.filter((f) => /^\/service-[a-z0-9]+\.html$/.test(f));
  assert.equal(svc.length, D.content.services.length, "a page per service");
  for (const f of svc) assert.ok(nl.bodies.get("/sitemap.xml").includes("https://oren-mayim.sites.example.co.il" + f), "in the sitemap: " + f);
  const sp = nl.bodies.get(svc[0]);
  assert.match(sp, /<link rel="canonical" href="https:\/\/oren-mayim.sites.example.co.il\/service-/); assert.ok(!/noindex/.test(sp), "service pages are for Google");
  assert.match(sp, /"@type":"Service"/); assert.match(sp, /"@type":"BreadcrumbList"/); assert.match(sp, /href="\.\/\?q=/, "the chat opens with the service");
  assert.match(nl.bodies.get("/index.html"), /<a class="svc-link" href="service-[a-z0-9]+\.html">/, "the price list links to them");
  assert.match(nl.bodies.get("/index.html"), /<link rel="canonical" href="https:\/\/oren-mayim.sites.example.co.il\/">/);
  assert.match(nl.bodies.get("/sitemap.xml"), /<loc>https:\/\/oren-mayim.sites.example.co.il\/guides.html<\/loc>/);
  assert.match(nl.bodies.get("/index.html"), /<p class="credit">האתר נבנה ב-<a href="https:\/\/service-pro-web.netlify.app\/\?utm_source=client&amp;utm_campaign=oren-mayim"/);
  assert.match(nl.bodies.get("/privacy.html"), /noindex, follow/, "the legal pages stay out of the results");
  // Straight to the search engines: IndexNow gets every indexable page, with the key file served by the site.
  const ping = indexNow.at(-1);
  assert.equal(ping.host, "oren-mayim.sites.example.co.il"); assert.ok(sent.includes("/" + ping.key + ".txt"), "the key file is deployed");
  assert.equal(nl.bodies.get("/" + ping.key + ".txt"), ping.key);
  assert.ok(ping.urlList.includes("https://oren-mayim.sites.example.co.il/") && ping.urlList.some((u) => /service-/.test(u)) && !ping.urlList.some((u) => /privacy|accessibility/.test(u)), "the pages, not the legal ones");
  assert.equal(nl.uploads.length, new Set(Object.values([...nl.deploys.values()].at(-1).files)).size, "every new file uploaded once");
  assert.ok(C.allowed_origins.includes("https://oren-mayim-site.netlify.app"));
  assert.equal(C.allowed_origins[0], "https://oren-mayim.sites.example.co.il", "the lead system links to the main address");
  assert.equal(lib.publicState(D).site, "https://oren-mayim.sites.example.co.il/", "the owner sees the address");
  // again: the same site, and only what changed is uploaded
  const before = nl.uploads.length;
  r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.status, 200);
  assert.equal(nl.sites.size, 1, "no second site"); assert.equal(nl.uploads.length, before, "nothing changed, nothing uploaded");
  // a service or an area page the owner removed leaves the repo at the next publish
  gh.files.set("clients/oren-mayim/area-0ld1.html", "x"); gh.files.set("clients/oren-mayim/service-0ld1.html", "x");
  r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.status, 200);
  assert.ok(!gh.files.has("clients/oren-mayim/area-0ld1.html") && !gh.files.has("clients/oren-mayim/service-0ld1.html"), "old pages removed");
  assert.ok(gh.files.has("clients/oren-mayim/index.html"));
  assert.equal(nl.records.length, 1);

  // the client's own domain
  r = await J(await adm("POST", { action: "domain", id: D.id, domain: "x.netlify.app" })); assert.equal(r.error, "bad_domain");
  r = await J(await adm("POST", { action: "domain", id: D.id, domain: "https://www.Oren-Mayim.co.il/" })); assert.equal(r.status, 200, JSON.stringify(r));
  assert.equal(D.domain, "oren-mayim.co.il"); assert.equal(D.domain_state, "waiting");
  assert.ok(site.domain_aliases.includes("oren-mayim.co.il") && site.domain_aliases.includes("www.oren-mayim.co.il"), "added at once, as an alias");
  assert.equal(site.custom_domain, "oren-mayim.sites.example.co.il", "the main address stays until the DNS is right");
  assert.deepEqual(r.draft.dns, [{ type: "A", host: "@", value: "75.2.60.5", note: "oren-mayim.co.il" }, { type: "CNAME", host: "www", value: "oren-mayim-site.netlify.app", note: "www.oren-mayim.co.il" }]);
  // the hourly check: not yet, then yes
  let out = await lib.checkDomains(new Date(), async () => false); assert.deepEqual(out, { checked: 1, live: 0 }); assert.equal(D.domain_state, "waiting");
  T.ls_leads.forEach((l) => { l.created_at = "2026-01-01T00:00:00Z"; });
  out = await lib.checkDomains(new Date(), async (dom, host) => dom === "oren-mayim.co.il" && host === "oren-mayim-site.netlify.app");
  assert.deepEqual(out, { checked: 1, live: 1 });
  assert.equal(site.custom_domain, "oren-mayim.co.il", "the swap"); assert.ok(site.domain_aliases.includes("oren-mayim.sites.example.co.il") && !site.domain_aliases.includes("oren-mayim.co.il"), "the old address redirects to the new one");
  assert.equal(D.domain_state, "live"); assert.equal(D.site_host, "oren-mayim.co.il");
  assert.match(nl.bodies.get("/index.html"), /<link rel="canonical" href="https:\/\/oren-mayim.co.il\/">/, "deployed again with the new address");
  assert.match(nl.bodies.get("/robots.txt"), /Sitemap: https:\/\/oren-mayim.co.il\/sitemap.xml/);
  assert.equal(C.allowed_origins[0], "https://oren-mayim.co.il"); assert.ok(C.allowed_origins.includes("https://oren-mayim.sites.example.co.il"), "the old address still sends leads");
  assert.match(T.ls_leads.at(-1).service || "", /הדומיין oren-mayim.co.il מחובר/);
  r = await J(await adm("POST", { action: "publish", id: D.id, slug: "oren-mayim" })); assert.equal(r.hosting.url, "https://oren-mayim.co.il/", "a publish after the swap keeps the new address");
  assert.equal(site.custom_domain, "oren-mayim.co.il");
  // a price from the owner's WhatsApp ("מחיר <שירות> 350-550"): the live site, the repo and the deploy change at once
  {
    const C2 = { slug: "oren-mayim" }, notes = [], addNote = async (_c, t) => notes.push(t);
    const svc0 = D.content.services[0].name, trees = gh.trees.length;
    let msg = await lib.ownerPrice(C2, { service: svc0, value: "350 עד 550 ₪" }, { addNote });
    assert.match(msg, /^עודכן: /, msg);
    assert.equal(D.content.services[0].price, "350 עד 550 ₪"); assert.equal(D.live.content.services[0].price, "350 עד 550 ₪", "live too, so self edit starts from it");
    assert.equal(gh.trees.length, trees + 1, "one commit"); assert.ok(nl.bodies.get("/index.html").includes("350 עד 550 ₪"), "deployed");
    assert.equal(notes.length, 0, "a service on the site needs no note");
    msg = await lib.ownerPrice(C2, { service: "שירות שלא קיים", value: "100 ₪" }, { addNote });
    assert.match(msg, /^לא מצאנו את "שירות שלא קיים"/); assert.equal(gh.trees.length, trees + 1, "nothing published");
    assert.match(await lib.pricesText(C2), new RegExp(svc0 + ": 350 עד 550 ₪"));
    msg = await lib.ownerPrice({ slug: "no-site" }, { service: "שיעור", value: "200 ₪" }, { addNote });
    assert.match(msg, /^רשמנו: /); assert.deepEqual(notes, ["מחיר שיעור: 200 ₪"], "no builder site: a note the chats read");
    D.content = { ...D.content, services: [...D.content.services] }; D.content.services[1] = { ...D.content.services[1], price: "1 ₪" }; // an unpublished self edit
    D.self_edit = true; msg = await lib.ownerPrice(C2, { service: svc0, value: "400 ₪" }, { addNote });
    assert.match(msg, /שינויים מהבונה שעוד לא פורסמו/); assert.equal(D.content.services[0].price, "350 עד 550 ₪");
    D.content = D.live.content; D.self_edit = false;
  }
  // a work photo from the owner's WhatsApp: first in the work photos, the rest one down, the caption its title,
  // where it was taken stripped, one commit and the deploy
  {
    const C2 = { slug: "oren-mayim" }, trees = gh.trees.length;
    assert.match((await lib.ownerPhotoPlan({ slug: "no-site" })).reply, /^תמונות מהוואטסאפ נכנסות לאתר רק באתר שנבנה בבונה/);
    const seg = (m, data) => Buffer.concat([Buffer.from([0xff, m]), Buffer.from([(data.length + 2) >> 8, (data.length + 2) & 255]), data]);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from("JFIF\0\x01\x01\0\0\x01\0\x01\0\0", "latin1")),
      seg(0xe1, Buffer.from("Exif\0\0GPS-32.43,34.91", "latin1")), seg(0xc0, Buffer.from([8, 0, 100, 0, 200, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])),
      seg(0xda, Buffer.from([3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0])), Buffer.from([1, 2, 3, 4, 0xff, 0xd9])]);
    const before = { ...(D.photos || {}) }, t1 = D.content.work1_title || "";
    assert.equal((await lib.ownerPhotoPlan(C2)).full, false);
    const msg = await lib.ownerPhoto(C2, { buf: jpeg, title: "החלפת ברז במטבח בחדרה, עבודה של שעה וחצי" });
    assert.match(msg, /^התמונה \("החלפת ברז במטבח בחדרה, עבודה של"\) נוספה לאתר, ראשונה בעבודות האחרונות/, msg);
    // a WebP keeps its picture and loses its EXIF and XMP chunks
    const ch = (id, data) => { const len = Buffer.alloc(4); len.writeUInt32LE(data.length); return Buffer.concat([Buffer.from(id, "ascii"), len, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
    const vp8x = Buffer.alloc(10); vp8x[0] = 0x0c; vp8x.writeUIntLE(199, 4, 3); vp8x.writeUIntLE(99, 7, 3);
    const body = Buffer.concat([ch("VP8X", vp8x), ch("VP8 ", Buffer.from("frame")), ch("EXIF", Buffer.from("GPS-32.4")), ch("XMP ", Buffer.from("<x>gps</x>"))]);
    const riff = Buffer.alloc(12); riff.write("RIFF", 0, "ascii"); riff.writeUInt32LE(body.length + 4, 4); riff.write("WEBP", 8, "ascii");
    const w = B.stripJpegMeta(Buffer.concat([riff, body]));
    assert.equal(B.photoType(w), "webp"); assert.ok(!/GPS|gps/.test(w.toString("latin1")) && w.toString("latin1").includes("frame"));
    assert.equal(w.readUInt32LE(4), w.length - 8, "the RIFF size fits"); assert.equal(w[20] & 0x0c, 0, "the flags say so"); assert.deepEqual(B.imageSize(w), [200, 100]);
    assert.equal(D.content.work1_title, "החלפת ברז במטבח בחדרה, עבודה של", "cut at a word, 34 at most");
    assert.deepEqual([D.photos.work1.w, D.photos.work1.h], [200, 100]);
    if (before.work1) { assert.equal(D.photos.work2.path, before.work1.path, "the old first moves down"); assert.equal(D.content.work2_title, t1); }
    const up = storage.get(D.photos.work1.path); assert.ok(up && !up.toString("latin1").includes("GPS"), "no EXIF on the site"); assert.ok(up.toString("latin1").includes("JFIF"));
    assert.deepEqual(D.live.photos, D.photos, "live too"); assert.equal(gh.trees.length, trees + 1, "one commit");
    assert.ok(nl.bodies.get("/index.html").includes("החלפת ברז במטבח בחדרה, עבודה של"), "deployed");
    // all six full: the last one leaves the site, and its file goes
    for (const k of ["work1", "work2", "work3", "work4", "work5", "work6"]) if (!D.photos[k]) { const path = `drafts/${D.id}/${k}-aaaaaaaaaaaa.jpg`; storage.set(path, jpeg); D.photos[k] = { path, ext: "jpg" }; }
    { const path = `drafts/${D.id}/work6-bbbbbbbbbbbb.jpg`; storage.set(path, jpeg); D.photos.work6 = { path, ext: "jpg" }; } // one "back" doesn't use
    D.content = { ...D.content, work6_title: "גג אחרון" }; D.live = B.snapshot(D);
    const plan = await lib.ownerPhotoPlan(C2); assert.equal(plan.full, true); assert.equal(plan.leaving, "גג אחרון");
    const last = D.photos.work6.path, fifth = D.photos.work5.path;
    await lib.ownerPhoto(C2, { buf: jpeg, title: "" });
    assert.equal(D.photos.work6.path, fifth); assert.ok(!storage.has(last), "the photo that left is deleted (one the version before still uses would stay)"); assert.equal(D.content.work1_title, "");
    assert.match(await lib.ownerPhoto(C2, { buf: Buffer.from("not an image"), title: "" }), /לא בפורמט/);
    // unpublished self edits wait
    D.self_edit = true; D.content = { ...D.content, work2_title: "שינוי שלא פורסם" };
    assert.match((await lib.ownerPhotoPlan(C2)).reply, /שינויים מהבונה שעוד לא פורסמו/);
    D.content = D.live.content; D.self_edit = false;
  }
  // a domain that never points: given up after 30 days, the site stays where it is
  D.domain = "slow.co.il"; D.domain_state = "waiting"; D.domain_since = "2026-01-01T00:00:00Z";
  out = await lib.checkDomains(new Date("2026-03-01T00:00:00Z"), async () => false); assert.equal(D.domain_state, null);
  // A site published before we had a domain (on *.netlify.app) moves to <slug>.<SITES_DOMAIN> at its next publish
  delete process.env.SITES_DOMAIN;
  const early = await H.ensureSite("early-bird");
  assert.equal(early.host, "early-bird.netlify.app"); assert.equal(early.sub, null);
  process.env.SITES_DOMAIN = "sites.example.co.il";
  const later = await H.ensureSite("early-bird", { site_id: early.siteId, site_netlify: early.netlifyHost });
  assert.deepEqual([later.siteId, later.host, later.sub], [early.siteId, "early-bird.sites.example.co.il", "early-bird.sites.example.co.il"]);
  assert.equal(nl.sites.get(early.siteId).custom_domain, "early-bird.sites.example.co.il");
  assert.ok(nl.records.some((x) => x.hostname === "early-bird.sites.example.co.il"), "its DNS record is made");
  const again = await H.ensureSite("early-bird", { site_id: early.siteId, site_sub: later.sub });
  assert.equal(again.host, "early-bird.sites.example.co.il", "and it stays there");
  delete process.env.NETLIFY_TOKEN; delete process.env.SITES_DOMAIN;
}

// "תחום אחר": the address suggestions use the owner's own trade, never the demo's (plumber) as a backup
{
  ai.queue.push({ names: ["dana-vet"] });
  const out = await B.suggestSlugs({ id: "abcd1234-0000-0000-0000-000000000000", template: "plumber", content: { business_name: "דנה", trade: "וטרינרית", custom_trade: true, area: "חדרה" } });
  assert.equal(JSON.parse(aiCalls.at(-1).messages[0].content).trade, "וטרינרית");
  assert.deepEqual(out.map((x) => x.slug), ["dana-vet", "site-abcd"], "no plumber names");
}
// The pilot: an invite code from PILOT_CODES marks the draft, the payment step is off and כפיר can publish from client_approved.
{
  process.env.PILOT_CODES = "dana-pilot, ori"; process.env.BUILDER_DAILY_MAX = "999";
  cred = "";
  let p = await J(await req("start", { body: { name: "דנה", phone: "0521112233", consent: true, pilot: "DANA-PILOT" }, ip: "7.7.7.1" }));
  assert.equal(p.status, 201); assert.equal(p.state.content.pilot, "dana-pilot"); assert.equal(p.state.pilot, true);
  const P = { id: p.id, template: "plumber", content: p.state.content, status: "client_approved", package: "presence", photos: {}, messages: [] };
  assert.equal(B.publicState(P).pay.length, 0, "no payment links in the pilot");
  assert.equal(B.isPilot(P), true);
  p = await J(await req("start", { body: { name: "אבי", phone: "0521112234", consent: true, pilot: "guess" }, ip: "7.7.7.2" }));
  assert.equal(p.state.content.pilot, undefined, "an unknown code is no pilot"); assert.equal(p.state.pilot, false);
  delete process.env.PILOT_CODES; delete process.env.BUILDER_DAILY_MAX;
}
console.log("all site builder tests passed");
