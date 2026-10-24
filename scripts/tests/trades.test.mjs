// Checks every trade of the site builder (demos/netlify/lib/templates/trades/*.mjs): the shape, the lengths the
// template allows, tips that point at a real guide, and that a site renders for each with its own words.
// Run: node scripts/tests/trades.test.mjs [id ...]   (ids: also check trades/<id>.mjs files not listed in index.mjs yet)
import assert from "node:assert/strict";
import { TRADES, register } from "../../demos/netlify/lib/templates/trades/index.mjs";
for (const id of process.argv.slice(2)) register((await import(`../../demos/netlify/lib/templates/trades/${id}.mjs`)).default);
import { GUIDE_FILES } from "../../demos/netlify/lib/templates/trades/guides.mjs";
import * as P from "../../demos/netlify/lib/templates/plumber.mjs";
import { whenText } from "../../demos/netlify/lib/templates/plumber-guide.mjs";

const len = (s, max, what) => assert.ok(typeof s === "string" && s.trim() && s.length <= max, `${what}: "${s}" (${s && s.length}/${max})`);
const WORDS = ["jobs", "col", "time", "open", "how", "status", "subtitle", "waHello", "lead"];
const RESERVED = ["issue", "photo", "urgency", "city", "name", "phone", "callback"];
const ids = Object.keys(TRADES);
assert.ok(ids.length >= 1 && ids[0] === "plumber", "plumber first");

for (const [id, T] of Object.entries(TRADES)) {
  const at = (w) => `${id}: ${w}`;
  assert.equal(T.id, id);
  len(T.label, 20, at("label")); len(T.trade, 24, at("trade"));
  assert.ok(Array.isArray(T.guides) && T.guides.length, at("guides"));
  for (const g of T.guides) assert.ok(GUIDE_FILES[typeof g === "string" ? g : g.file], at("guide file " + JSON.stringify(g)));
  const items = T.guides.flatMap((g) => GUIDE_FILES[typeof g === "string" ? g : g.file].items);
  assert.ok(typeof T.schema === "string" && /^[A-Z]\w+$/.test(T.schema), at("schema"));
  assert.equal(typeof T.urgent, "boolean", at("urgent"));
  for (const w of WORDS) len(T.words[w], w === "subtitle" || w === "waHello" ? 60 : 40, at("words." + w));
  if (T.words.descEnd) len(T.words.descEnd, 40, at("words.descEnd"));
  assert.ok(/[הא]$/.test(T.words.lead.trim()), at(`words.lead is feminine ("${T.words.lead}"): "ה${T.words.lead} אצלי", "${T.words.lead} חדשה"`));
  assert.equal(T.steps.length, 3, at("steps"));
  for (const st of T.steps) { assert.equal(st.length, 3, at("step")); len(st[0], 24, at("step title")); len(st[1], 24, at("step h3")); len(st[2], 90, at("step text")); }
  const ch = T.chat;
  len(ch.issue.label, 16, at("chat.issue.label")); len(ch.issue.ask, 60, at("chat.issue.ask"));
  if (ch.photo !== null) len(ch.photo, 100, at("chat.photo"));
  for (const x of ch.extra || []) {
    assert.ok(/^[a-z]+$/.test(x.key) && !RESERVED.includes(x.key), at("extra key " + x.key));
    len(x.label, 16, at("extra label")); len(x.ask, 60, at("extra ask"));
    assert.ok(x.chips.length >= 2 && x.chips.length <= 6, at("extra chips")); x.chips.forEach((c) => len(c, 30, at("extra chip")));
    if (x.only) { // asked only after an earlier extra's answer is one of x.only.is
      const before = ch.extra.slice(0, ch.extra.indexOf(x)).find((y) => y.key === x.only.key);
      assert.ok(before && x.only.is.length && x.only.is.every((v) => before.chips.includes(v)), at("extra only " + x.key));
    }
  }
  if (ch.urgency) {
    len(ch.urgency.label, 16, at("urgency label")); len(ch.urgency.ask, 60, at("urgency ask"));
    assert.ok(ch.urgency.chips.length >= 2 && ch.urgency.chips.length <= 5, at("urgency chips")); ch.urgency.chips.forEach((c) => len(c, 30, at("urgency chip")));
    if (ch.urgency.tip) { assert.ok(items.some((it) => it.id === ch.urgency.tip.id), at("tip id " + ch.urgency.tip.id + " is in the guides")); len(ch.urgency.tip.text, 160, at("tip text")); }
  } else assert.equal(ch.urgency, null, at("urgency is null or set"));
  if (ch.urgentNote) len(ch.urgentNote, 90, at("urgentNote"));
  len(ch.priceNote, 60, at("priceNote"));
  len(T.privacyWhat, 140, at("privacyWhat"));
  if (T.crisis) len(T.crisis, 120, at("crisis"));
  if (T.greet) { len(T.greet, 160, at("greet")); assert.ok(T.greet.includes("{name}"), at("greet has {name}")); }
  len(T.fields.headline_1, 22, at("fields.headline_1")); len(T.fields.price_note, 60, at("fields.price_note"));
  len(T.fields.business_hint, 40, at("fields.business_hint")); len(T.fields.ba_hint, 60, at("fields.ba_hint")); len(T.fields.video_hint, 60, at("fields.video_hint"));
  const g = T.guide;
  assert.ok(g.services.length >= 6 && g.services.length <= 12, at("guide.services count"));
  const names = new Set();
  for (const s of g.services) {
    len(s.name, 46, at("service name")); assert.ok(!names.has(s.name), at("service twice: " + s.name)); names.add(s.name);
    if (s.detail) len(s.detail, 60, at("service detail")); if (s.time) len(s.time, 18, at("service time"));
    len(s.price, 24, at("service price")); assert.ok(/₪/.test(s.price) || s.price === "לפי הצעת מחיר", at("price is a range in ₪ or לפי הצעת מחיר: " + s.price));
  }
  assert.ok(g.response.length >= 3 && g.response.length <= 6, at("response")); g.response.forEach((r) => len(r, 14, at("response option")));
  assert.ok(g.hours.length >= 2 && g.hours.length <= 5, at("hours")); g.hours.forEach((r) => len(r, 30, at("hours option")));
  if (g.warranty !== null) { assert.ok(Array.isArray(g.warranty) && g.warranty.length >= 2, at("warranty")); g.warranty.forEach((r) => len(r, 20, at("warranty option"))); }
  assert.ok(g.headlines.length >= 3, at("headlines")); assert.ok(g.intros.length >= 2, at("intros"));
  for (const r of g.response) {
    const fill = (s) => s.replace("{when}", whenText(r));
    for (const x of g.headlines) { len(fill(x.headline_1), 22, at("headline_1")); if (x.headline_2) len(fill(x.headline_2), 22, at("headline_2 with " + r)); }
    for (const x of g.intros) len(fill(x.intro), 180, at("intro with " + r));
  }
  for (const k of ["townsAsk", "servicesAsk", "photosAsk"]) if (g[k]) len(g[k], k === "photosAsk" ? 300 : 90, at("guide." + k));

  // A whole site for this trade renders with its own words, its chat and its guides.
  const c = { ...P.emptyContent(id), business_name: "עסק לבדיקה", owner_name: "דנה כהן", area: "חדרה והסביבה", response_time: g.response[1],
    whatsapp: "0526359513", headline_1: g.headlines[0].headline_1, intro: g.intros[0].intro.replace("{when}", whenText(g.response[1])),
    services: g.services.slice(0, 4), towns: ["חדרה", "נתניה"] };
  assert.equal(c.trade, T.trade); assert.equal(c.trade_id, id);
  const site = P.render(c, { mode: "site", url: "https://test.example.co.il/", leads: "https://service-pro-web.netlify.app/api/lead/x" });
  const html = site["index.html"];
  for (const page of [html, P.render(c, { mode: "draft", assets: "/shared/" })["index.html"]])
    for (const [, code] of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) { try { new Function(code); } catch (e) { assert.fail(at("a page script doesn't parse: " + e.message)); } }
  assert.ok(html.includes(`>${T.words.jobs}<`) && html.includes(T.words.how), at("the site uses the trade's words"));
  assert.ok(!/סתימה|נזילה|הברז הראשי(?! של ההשקיה)/.test(["plumber", "roofing", "tiling", "water-heater"].includes(id) ? "" : html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")), at("no plumbing words on another trade's site"));
  assert.ok(html.includes(JSON.stringify(T.chat.issue.ask)), at("its chat"));
  for (const x of (ch.extra || []).filter((y) => y.only)) assert.ok(html.includes(`show: (d) => ${JSON.stringify(x.only.is)}.includes(d[${JSON.stringify(x.only.key)}])`), at("the chat asks " + x.key + " only when it applies"));
  assert.ok(Object.keys(site).filter((f) => f.startsWith("service-")).length === 4, at("a page per service"));
  if (T.crisis) assert.ok(html.includes(T.crisis), at("the crisis line shows"));
  // The AI chat: on every live site with the lead system, said on its privacy page; never on the crisis trades
  if (T.crisis) assert.ok(!html.includes('id="ask"') && !html.includes("aibot.js"), at("no AI chat on a crisis trade"));
  else assert.ok(html.includes('id="ask"') && html.includes('src="assets/aibot.js" defer') && /Anthropic[^<]*נציג|נציג ה-AI[^<]*Anthropic/.test(site["privacy.html"]), at("the AI chat and its privacy line"));
  // The review's fixes: "תוך" built once, "ב" + a region without its ה, only real ranges in the chat's price line,
  // and the response time on step 3 only where step 3 is the call back.
  {
    const c2 = { ...c, area: "השרון", response_time: "באותו יום", services: [...g.services.slice(0, 2), { name: "בלי מחיר", price: "לפי הצעת מחיר" }],
      regions: [{ name: "השפלה", towns: ["רחובות"], note: "עובדים בשפלה כבר כמה שנים, ומכירים את הבניינים ואת הגישה בכל שכונה.", response: "באותו יום" }] };
    const s2 = P.render(c2, { mode: "site", url: "https://test.example.co.il/", leads: "https://service-pro-web.netlify.app/api/lead/x" });
    for (const [f, page] of Object.entries(s2)) {
      assert.ok(!/תוך באותו/.test(page), at(f + ': no "תוך באותו יום"'));
      assert.ok(!/בהשרון|בהשפלה/.test(page), at(f + ': "בשרון", not "בהשרון"'));
    }
    assert.ok(!JSON.parse(s2["index.html"].match(/const RANGES = (.*);/)[1])["בלי מחיר"], at("no price, no price line in the chat"));
    const step3 = s2["index.html"].match(/<div class="step"><span class="mono">(שלב 3[^<]*)</)[1];
    assert.equal(step3.includes("באותו יום"), T.callbackStep !== false, at("response time on step 3 only when it is the call back: " + step3));
  }
  const guide = P.guideFor(T);
  assert.ok(guide.steps.some((s) => s.id === "headline") && guide.services === g.services, at("the questionnaire"));
}
console.log(`all ${ids.length} trades passed`);
