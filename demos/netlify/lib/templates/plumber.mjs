// The plumber template for the site builder (docs/side-income/SITE_BUILDER.md).
// Built from clients/sample-plumber/. The chat fills FIELDS, SERVICES and TOWNS; it never writes HTML.
// render() escapes every value, so whatever the owner or the model typed can't break the page.
import { israeliPhone } from "../leads.mjs";
import { localBusiness } from "./schema.mjs";
import { socialList, SOCIAL_KEYS } from "../social.mjs";
import { LOOKS, LOOK_CSS, lookOf, cssVars, themeColor, catalog, defaultLook } from "./looks.mjs";
export { LOOKS, lookOf, catalog };
// The trades (trades/<id>.mjs): words, chat, questionnaire. The site is the same for all of them.
import { tradeOf } from "./trades/index.mjs";
// The trades' guides (shared with the demos): general know-how, no prices or promises of the owner.
import { GUIDE_FILES } from "./trades/guides.mjs";
import FONTS from "../../../shared/fonts/fonts.json" with { type: "json" };
import { guideFor, whenText } from "./plumber-guide.mjs";
export { guideFor };
// "ב" + an area: "בחדרה", but "בשרון", not "בהשרון". Only for region names that take the article; a town keeps its
// ה (הרצליה, הוד השרון). Every "ב" + area on a site goes through here.
const REGION_ARTICLE = /^ה(?=(שרון|שפלה|עמקים|עמק|גליל|נגב|כרמל|קריות|מרכז|גולן|ערבה|שומרון|בקעה|צפון|דרום)(?=$|[\s,.\u05be-]))/;
export const inArea = (x) => { const a = String(x ?? "").trim(); return a ? "ב" + a.replace(REGION_ARTICLE, "") : ""; };
export const GUIDE = guideFor(tradeOf("plumber"));
//
// Two modes:
//   draft  the private preview at /draft/<id>: noindex, a "טיוטה" ribbon, empty fields and photos marked.
//   site   the real site for clients/<slug>/: every required field must be filled.

export const id = "plumber";
export const label = "אינסטלטור";

// kind: "text" is copy the chat may write from what the owner said.
//       "fact" is a claim about the business. Only the owner's own words go there, never a guess.
//       "phone" is checked as an Israeli number.
export const FIELDS = {
  business_name: { label: "שם העסק", max: 30, required: true, kind: "fact", hint: "כמו שהלקוחות מכירים, למשל: אורן מים" },
  owner_name: { label: "שם בעל העסק", max: 30, required: true, kind: "fact", hint: "שם ושם משפחה. מופיע בכרטיס ובהצהרת הנגישות" },
  trade: { label: "תחום", max: 24, required: true, kind: "fact", default: "אינסטלציה" },
  area: { label: "אזור שירות, בקצרה", max: 50, required: true, kind: "fact", hint: "למשל: חדרה, עמק חפר והשרון" },
  hours: { label: "שעות פעילות", max: 30, kind: "fact", hint: "למשל: 24/7, או א׳–ה׳ 7:00–19:00" },
  response_time: { label: "תוך כמה זמן חוזרים ללקוח", max: 14, required: true, kind: "fact", hint: "רק מה שהעסק באמת עומד בו, למשל: 15 דק׳ או שעה" },
  years: { label: "שנים בתחום", max: 2, kind: "fact", digits: true },
  warranty: { label: "אחריות על העבודה", max: 20, kind: "fact", hint: "למשל: 12 חודשים" },
  headline_1: { label: "כותרת ראשית, שורה 1", max: 22, required: true, kind: "text", default: "נזילה? סתימה?" },
  headline_2: { label: "כותרת ראשית, שורה 2", max: 22, kind: "text", hint: "למשל: מגיעים היום. רק אם זה נכון לעסק" },
  intro: { label: "פסקת פתיחה", max: 180, required: true, kind: "text", hint: "משפט או שניים: מה עושים בצ׳אט ומה קורה אחר כך, בגוף ראשון של בעל העסק" },
  price_note: { label: "הערה למחירון", max: 60, kind: "text", default: "טווחי מחיר · המחיר הסופי נקבע אחרי אבחון" },
  radius_note: { label: "הערה לאזור", max: 40, kind: "fact", hint: "למשל: רדיוס 25 ק״מ מחדרה" },
  whatsapp: { label: "וואטסאפ של העסק", max: 16, required: true, kind: "phone", mobile: true },
  phone: { label: "טלפון לשיחות (אם שונה)", max: 16, kind: "phone" },
  work1_title: { label: "כותרת לתמונת עבודה 1", max: 34, kind: "text" },
  work2_title: { label: "כותרת לתמונת עבודה 2", max: 34, kind: "text" },
  work3_title: { label: "כותרת לתמונת עבודה 3", max: 34, kind: "text" },
  work4_title: { label: "כותרת לתמונת עבודה 4", max: 34, kind: "text" },
  work5_title: { label: "כותרת לתמונת עבודה 5", max: 34, kind: "text" },
  work6_title: { label: "כותרת לתמונת עבודה 6", max: 34, kind: "text" },
  ba_title: { label: "כותרת ללפני ואחרי", max: 40, kind: "text", hint: "מה רואים ואיפה, למשל: ניקוי סתימה בכיור, חדרה" },
  video_title: { label: "כותרת לסרטון", max: 34, kind: "text", hint: "מה רואים בסרטון, למשל: פתיחת סתימה במטבח" },
};

export const SERVICES = {
  min: 1, max: 6,
  item: { name: { max: 46, required: true }, detail: { max: 60 }, time: { max: 18 }, price: { max: 24 } },
  label: "שירותים ומחירים",
};
export const TOWNS = { min: 1, max: 12, itemMax: 22, label: "ישובים" };
// A page per area the business really works in (published sites only): only from the owner's own words about it.
// An area without a note of its own gets no page: a page per town with the name swapped is doorway spam to Google.
export const REGIONS = { max: 5, nameMax: 30, townsMax: 12, noteMin: 60, noteMax: 500, responseMax: 14, label: "דפי אזורים" };
// The owner's Instagram, Facebook, TikTok and YouTube (lib/social.mjs): plain links, no embeds, no pixels.
export const SOCIAL = { keys: SOCIAL_KEYS, label: "רשתות חברתיות" };
export const regionsReady = (c) => (c.regions || []).filter((r) => r && String(r.name || "").trim() && (r.towns || []).length && String(r.note || "").trim().length >= REGIONS.noteMin).slice(0, REGIONS.max);

export const PHOTOS = {
  hero: { label: "רקע לראש האתר", aspect: "16 / 9" },  // behind the top of the site, washed so the text stays readable
  portrait: { label: "תמונה של בעל העסק", aspect: "1 / 1" },
  work1: { label: "עבודה 1", title: "work1_title" },
  work2: { label: "עבודה 2", title: "work2_title" },
  work3: { label: "עבודה 3", title: "work3_title" },
  work4: { label: "עבודה 4", title: "work4_title" },
  work5: { label: "עבודה 5", title: "work5_title" },
  work6: { label: "עבודה 6", title: "work6_title" },
  before: { label: "לפני", title: "ba_title" },  // with "after": a before/after slider on the site
  after: { label: "אחרי", title: "ba_title" },
};

export const WORKS = ["work1", "work2", "work3", "work4", "work5", "work6"];
export const DRAFT_WORKS = 3; // a draft marks only the first three empty frames, so it isn't a wall of placeholders
// Short videos of the work, besides the one at the top: each 10 seconds, silent, made in the owner's browser.
export const VIDEOS = { max: 5, seconds: 10, titleMax: 34, label: "סרטונים מהעבודה" };
// The top of the site shows the owner's pick: a photo behind the text, or the short video in the drawing's place.
// Without a pick: the video if there is one, else the photo. A pick without its file shows the drawing.
export function heroKind(c, { photo = false, video = false } = {}) {
  const pick = c && (c.hero_media === "video" || c.hero_media === "photo") ? c.hero_media : video ? "video" : "photo";
  return pick === "video" ? (video ? "video" : null) : (photo ? "photo" : null);
}

// The fields with the trade's own defaults and examples (the trade, the first headline, the price note).
export function fieldsFor(tradeId) {
  const T = tradeOf(tradeId), f = T.fields || {};
  return {
    ...FIELDS,
    business_name: { ...FIELDS.business_name, hint: `כמו שהלקוחות מכירים, ${f.business_hint || "למשל: אורן מים"}` },
    trade: { ...FIELDS.trade, default: T.trade },
    headline_1: { ...FIELDS.headline_1, default: f.headline_1 || FIELDS.headline_1.default },
    price_note: { ...FIELDS.price_note, default: f.price_note || FIELDS.price_note.default },
    ba_title: { ...FIELDS.ba_title, hint: f.ba_hint || FIELDS.ba_title.hint },
    video_title: { ...FIELDS.video_title, hint: f.video_hint || FIELDS.video_title.hint },
  };
}

// The trade's guides: its files in order; a file with "when" only if one of the owner's services matches it
// (a guitar teacher gets the guitar guides). If none matches, the first file.
export function guidesOf(T, services = []) {
  const names = services.map((x) => String((x && x.name) || "")).join(" ");
  const picked = T.guides.filter((g) => typeof g === "string" || !g.when || new RegExp(g.when).test(names));
  const files = (picked.length ? picked : T.guides.slice(0, 1)).map((g) => GUIDE_FILES[typeof g === "string" ? g : g.file]).filter(Boolean);
  const seen = new Set();
  return { items: files.flatMap((f) => f.items).filter((it) => !seen.has(it.id) && seen.add(it.id)) };
}

// A business whose trade has no demo of its own ("תחום אחר" in the builder): the owner picks the closest demo for the
// design and the sample picture, and names their own trade (content.trade, content.custom_trade). The site then speaks
// plainly: its own steps, a neutral chat, no trade guides (they would be another trade's know-how), schema LocalBusiness.
const CUSTOM = {
  guides: [], schema: "LocalBusiness", urgent: false, guide: null, crisis: null, plural: true, callbackStep: true,
  greet: "היי, כאן {name} 👋\nכמה שאלות קצרות בצ׳אט, ונחזור אליכם.",
  steps: [
    ["שלב 1 · דקה", "כותבים מה צריך", "כמה שאלות קצרות בצ׳אט. אפשר לצרף תמונה."],
    ["שלב 2 · מיד", "הפרטים אצלנו", "הפנייה מגיעה אלינו לוואטסאפ, עם כל מה שכתבתם."],
    ["שלב 3", "חוזרים אליכם", "מסכמים מה צריך, מתי ובכמה."],
  ],
  chat: {
    issue: { label: "מה צריך", ask: "במה אפשר לעזור?" },
    photo: "יש תמונה שתעזור לנו להבין? אפשר גם לדלג.",
    extra: [{ key: "when", label: "מתי", ask: "מתי נוח לכם?", chips: ["היום", "השבוע", "גמיש"] }],
    urgency: null, noCity: false, urgentNote: "",
    priceNote: "המחיר הסופי נקבע אחרי שמבינים מה צריך.",
  },
  privacyWhat: "שם, טלפון, מה ביקשתם, מתי נוח לכם, ותמונה אם בחרתם לצרף",
};
const CUSTOM_WORDS = { jobs: "השירותים שלנו", col: "שירות", time: "משך", open: "לשלוח פנייה", how: "מה קורה כששולחים פנייה",
  subtitle: "נחזור אליכם בהקדם", waHello: "היי, הגעתי מהאתר. אפשר לחזור אליי?", lead: "פנייה",
  status: "מקבלים פניות", descEnd: "שולחים פנייה בצ׳אט.", field: "", areaNote: "" };
export function tradeFor(c) {
  const T = tradeOf(c && c.trade_id);
  if (!(c && c.custom_trade)) return T;
  const trade = String(c.trade || "").trim() || T.trade;
  return { ...T, ...CUSTOM, chat: { ...T.chat, ...CUSTOM.chat }, words: { ...T.words, ...CUSTOM_WORDS }, trade, label: trade, custom: true };
}

export function emptyContent(tradeId = "plumber") {
  const c = {};
  for (const [k, f] of Object.entries(fieldsFor(tradeId))) c[k] = f.default || "";
  c.trade_id = tradeOf(tradeId).id;
  c.services = [];
  c.towns = [];
  c.regions = [];
  c.social = {};
  c.look = defaultLook(c.trade_id); c.palette = Object.keys(LOOKS[c.look].palettes)[0];  // the design, picked in the builder (looks.mjs); each trade starts in its own
  return c;
}

/* ---------------- render ---------------- */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const h = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ESC[ch]);
// For a value inside a <script> block: JSON, with "<" escaped so no "</script>" can close the block.
const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const prettyPhone = (local) => local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3)}` : local.length === 9 ? `${local.slice(0, 2)}-${local.slice(2)}` : local;
// "12 שנה" but "3 שנים" and "שנה אחת".
const yearsHe = (y) => { const n = Number(y); return n === 1 ? "שנה אחת" : n >= 2 && n <= 10 ? `${n} שנים` : `${n} שנה`; };
const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";

export function missing(c) {
  const out = [];
  for (const [k, f] of Object.entries(FIELDS)) if (f.required && !String(c[k] || "").trim()) out.push(f.label);
  if ((c.services || []).length < SERVICES.min) out.push(SERVICES.label);
  if ((c.towns || []).length < TOWNS.min) out.push(TOWNS.label);
  return out;
}

// Single-colour icons (currentColor), so they take the look's own colours.
const SOCIAL_ICONS = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor"/>',
  facebook: '<path d="M13.6 21v-7.6h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.1H8v3h2.6V21z" fill="currentColor"/>',
  tiktok: '<path d="M16.4 3c.3 2.2 1.7 3.7 4 3.9V10c-1.5 0-2.8-.4-4-1.2v6.4a5.6 5.6 0 1 1-5.6-5.6l.9.1v3.2a2.5 2.5 0 1 0 1.6 2.3V3z" fill="currentColor"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9v6l5-3z" fill="currentColor"/>',
};
// The owner's profiles as plain links: no embed, no pixel, nothing loads from the networks.
const socialLinks = (list) => list.map((x) => `<a href="${h(x.url)}" target="_blank" rel="noopener" aria-label="${h(x.label)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SOCIAL_ICONS[x.net]}</svg></a>`).join("");

const FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><rect width="30" height="30" rx="7" fill="#0c2a68"/><path d="M15 5c3.3 5 6.5 8.2 6.5 12.3a6.5 6.5 0 0 1-13 0C8.5 13.2 11.7 10 15 5z" fill="#fff"/></svg>';
// "Save to contacts": a vCard (3.0, UTF-8) with what a customer needs to find the business again.
const vEsc = (v) => String(v || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
export function vcard(c) {
  const name = String(c.business_name || "").trim(), owner = String(c.owner_name || "").trim();
  const wa = israeliPhone(c.whatsapp), call = israeliPhone(c.phone);
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${vEsc(name)};;;`, `FN:${vEsc(name)}`, `ORG:${vEsc(name)}`];
  if (c.trade) lines.push(`TITLE:${vEsc(String(c.trade).trim())}`);
  if (call) lines.push(`TEL;TYPE=WORK,VOICE:+${call.intl}`);
  if (wa) lines.push(`TEL;TYPE=CELL${call ? "" : ",VOICE"}:+${wa.intl}`);
  const note = [String(c.trade || "").trim() + (c.area ? " " + inArea(c.area) : ""), owner, wa ? "וואטסאפ: " + wa.local : ""].filter(Boolean).join(". ");
  if (note) lines.push(`NOTE:${vEsc(note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

export const STATIC_FILES = { "assets/favicon.svg": FAVICON }; // the other assets are copied from clients/sample-plumber/assets/

/**
 * @param c        content (FIELDS keys, services, towns)
 * @param opts.mode      "draft" | "site"
 * @param opts.assets    prefix for leadbot.js and leadform.js ("assets/" on a site, "/shared/" for a draft)
 * @param opts.photos    { slot: url } for the slots that have a photo
 * @param opts.leads     the lead system endpoint, or null (נוכחות package, or a draft)
 * @param opts.video     { src, poster } for the short silent video at the top, or null (then the drawing shows)
 * @param opts.clips     [{ src, poster, title, w, h }] up to VIDEOS.max short videos for "סרטונים מהעבודה"
 * @param opts.sizes     { slot: [width, height] } of the photos, so the browser keeps their place before they load
 * @param opts.url       the site's address ("https://<host>/"), known at deploy: canonical links, og:url, sitemap.xml
 *                       and robots.txt. Without it (a draft, the repo copy) they are left out.
 * @param opts.credit    { name, url } the line at the bottom: "האתר נבנה ב-<name> · אתרים שבונים עסקים", or null
 * @param opts.now       Date, for the "updated" line
 * @returns {{ "index.html": string, "privacy.html": string, "accessibility.html": string }}
 */
// A service's page name: stable for the same name (so its address doesn't move when the list is reordered), ASCII only.
export function areaPage(name) { return servicePage(name).replace(/^service-/, "area-"); }
export function servicePage(name) {
  let x = 2166136261;
  for (const ch of String(name || "").trim()) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; }
  return `service-${x.toString(36)}.html`;
}
// The trade's guides that speak about this service: the service's longer words found in the question or the answer.
function guidesFor(name, items, max = 4) {
  const words = String(name || "").split(/[\s,/·-]+/).map((w) => w.replace(/^[והבלמש](?=[\u05d0-\u05ea]{3,})/, "")).filter((w) => w.length >= 3);
  if (!words.length) return [];
  const text = (it) => [it.q, it.a, ...(it.steps || [])].join(" ");
  return items.filter((it) => words.some((w) => text(it).includes(w))).slice(0, max);
}

// One guide item as plain HTML (<details> opens without JS). Every text is escaped.
const GUIDE_KIND = { now: "דחוף", tip: "טיפ", faq: "שאלה נפוצה" };
function guideItem(it) {
  const body = [
    ...(it.a ? String(it.a).split("\n").map((l) => `<p>${h(l)}</p>`) : []),
    it.steps ? `<ol>${it.steps.map((x) => `<li>${h(x)}</li>`).join("")}</ol>` : "",
    it.warn ? `<p class="gd-warn">${h(it.warn)}</p>` : "",
  ].join("");
  return `<details id="g-${h(it.id)}"><summary><span class="gd-kind${it.kind === "now" ? " now" : ""}">${GUIDE_KIND[it.kind] || ""}</span><span>${h(it.q)}</span></summary><div class="gd-body">${body}</div></details>`;
}
// Questions and answers for Google: the tips and the common questions, as text.
export function faqSchema(items) {
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.filter((it) => it.kind !== "now").map((it) => ({
      "@type": "Question", name: it.q,
      acceptedAnswer: { "@type": "Answer", text: [it.a, ...(it.steps || []), it.warn].filter(Boolean).join(" ") },
    })),
  };
}
// Opens the item a link points to (#g-<id>), also in browsers that don't do it on their own.
const GUIDE_JS = `(function(){function o(){var m=/^#g-([\\w-]+)$/.exec(location.hash);if(!m)return;var d=document.getElementById("g-"+m[1]);if(d&&d.tagName==="DETAILS"){d.open=true;d.scrollIntoView({block:"start"});}}addEventListener("hashchange",o);o();})();`;

// What a draft shows before the owner writes their own: the trade's first headline and intro from the questionnaire,
// and its first four services with their sample ranges. Shown only in a draft, marked "לדוגמה"; never published.
function sampleContent(T) {
  const g = T.guide || {}, r = (g.response || [])[1] || (g.response || [])[0] || "";
  const when = whenText(r);
  const fill = (x) => String(x || "").replace(/\{when\}/g, when).trim();
  const hl = (g.headlines || [])[0] || {}, it = (g.intros || [])[0] || {};
  return { headline_1: fill(hl.headline_1), headline_2: fill(hl.headline_2), intro: fill(it.intro), response_time: r, services: (g.services || []).slice(0, 4) };
}

// The sample at the top of a draft per trade, from the demos' own pictures (shared/photos: photos for the first sixteen
// trades, flat illustrations for the newer fourteen until real photos are made).
const SAMPLE_HEROES = Object.fromEntries(Object.entries({
  plumber: "plumber-siphon", ac: "ac-work", appliance: "appliance-work", barber: "barber-work", cleaning: "cleaning-portrait",
  cosmetics: "cosmetics-work", "dog-trainer": "dog-trainer-work", driving: "driving-work", electrician: "electrician-panel", garden: "garden-work",
  handyman: "handyman-work", locksmith: "locksmith-work", massage: "massage-work", movers: "movers-truck", music: "music-work",
  nails: "nails-work", pergolas: "pergolas-work", pest: "pest-work", photographer: "photographer-work", psychologist: "psychologist-work",
  renovation: "renovation-drywall", roofing: "roofing-work", security: "security-work", shutters: "shutters-work", "social-worker": "social-worker-work", towing: "towing-work",
  trainer: "trainer-squat", tutor: "tutor-lesson", upholstery: "upholstery-work", yoga: "yoga-work",
}).map(([k, f]) => [k, `/shared/photos/${f}.webp`]));
export const sampleHeroOf = (tradeId) => SAMPLE_HEROES[tradeId] || "";
// Sample work photos and a portrait for a draft's empty frames, where the demos have real photos of that trade.
const P_ = (t, ...f) => [t, f.map((x) => `/shared/photos/${t}-${x}.webp`)];
const SAMPLE_WORKS = Object.fromEntries([
  P_("plumber", "leak", "drain", "siphon"), P_("ac", "room", "work"), P_("appliance", "room", "work"), P_("cleaning", "office", "window", "marble"),
  P_("garden", "pruning", "drip", "pomegranate"), P_("handyman", "room", "work"), P_("locksmith", "cylinder", "work"), P_("movers", "loading", "piano", "team"),
  P_("music", "studio", "lesson"), P_("pest", "room", "work"), P_("psychologist", "room"), P_("social-worker", "room"), P_("trainer", "deadlift", "park", "squat"),
  P_("tutor", "desk", "notebook", "lesson"),
]);
const SAMPLE_PORTRAITS = Object.fromEntries(["plumber", "ac", "appliance", "cleaning", "electrician", "garden", "handyman", "locksmith", "music", "pest", "psychologist", "social-worker", "tutor"]
  .map((t) => [t, `/shared/photos/${t}-portrait.webp`]));

export function render(c, { mode = "draft", assets = "assets/", photos = {}, leads = null, video = null, clips = [], sizes = {}, url = "", credit = null, now = new Date() } = {}) {
  const draft = mode === "draft";
  // The top: the owner's pick of a photo or the video (heroKind); the other one isn't shown or published.
  const hero = heroKind(c, { photo: Boolean(photos.hero), video: Boolean(video) });
  const heroVideo = hero === "video" ? video : null;
  // A draft with no photo or video of the owner's own at the top shows the trade's sample picture, labelled as such,
  // so the owner sees what a photo there does. Never published: a real site shows only the owner's own photos.
  const sampleHero = draft && !photos.hero && !heroVideo ? SAMPLE_HEROES[tradeOf(c.trade_id).id] || "" : "";
  const heroImg = hero === "photo" ? photos.hero : sampleHero;
  clips = (Array.isArray(clips) ? clips : []).filter((x) => x && x.src && x.poster).slice(0, VIDEOS.max);
  const L = lookOf(c);
  const inVis = Boolean(L.look.photoInVisual && heroImg); // a look that frames the top photo itself (luxe) instead of a background
  // That frame is never left empty on a real site: without a top photo it shows the first work photo, or the owner's.
  const frameImg = heroImg || (L.look.photoInVisual ? WORKS.map((x) => photos[x]).find(Boolean) || photos.portrait || "" : "");
  const T = tradeFor(c), W = T.words;
  if (!draft) {
    const m = missing(c);
    if (m.length) throw new Error("missing: " + m.join(", "));
  }
  // An empty field: in a draft, the trade's own suggestion (the questionnaire's first headline and intro, marked as a
  // sample) or a soft box with what goes there; on a site, nothing. Publishing still needs the owner's own words.
  const EG = draft && !T.custom ? sampleContent(T) : {};
  const v = (k) => {
    const val = String(c[k] || "").trim();
    if (val) return h(val);
    if (draft && EG[k]) return `<span class="eg">${h(EG[k])}</span>`;
    return draft ? `<span class="todo">${h(FIELDS[k].label)}</span>` : "";
  };
  const has = (k) => Boolean(String(c[k] || "").trim());
  const services = (c.services || []).slice(0, SERVICES.max);
  const towns = (c.towns || []).slice(0, TOWNS.max);
  const areas = regionsReady(c);
  const social = socialList(c);
  const wa = israeliPhone(c.whatsapp), call = israeliPhone(c.phone) || wa;
  const waIntl = wa ? wa.intl : "";
  const callLocal = call ? call.local : "";
  const year = now.getFullYear();
  const updated = `${MONTHS[now.getMonth()]} ${year}`;
  const name = String(c.business_name || "").trim() || "העסק";
  const trade = String(c.trade || "").trim();
  const owner = String(c.owner_name || "").trim();
  const ownerFirst = firstName(owner) || "אנחנו";
  const egServices = draft && !services.length ? EG.services || [] : [];
  const listed = services.length ? services : egServices;
  const showTime = listed.some((s) => s.time), showPrice = listed.some((s) => s.price);
  // Only a real range goes into the chat's price line ("X עולה בדרך כלל 300–450 ₪"), never "לפי הצעת מחיר".
  const ranges = Object.fromEntries(services.filter((s) => /\d/.test(String(s.price || ""))).map((s) => [s.name, String(s.price).trim()]));
  const robots = draft ? '<meta name="robots" content="noindex, nofollow">\n' : "";
  const dims = (slot) => { const z = sizes[slot]; return Array.isArray(z) && z[0] > 0 && z[1] > 0 ? ` width="${Math.round(z[0])}" height="${Math.round(z[1])}"` : ""; };
  // An empty frame in a draft: the trade's sample photo where the demos have one (labelled), else a soft box.
  const sampleOf = (slot) => !draft ? "" : slot === "portrait" ? SAMPLE_PORTRAITS[T.id] || "" : (SAMPLE_WORKS[T.id] || [])[WORKS.indexOf(slot)] || "";
  const photo = (slot, alt, extra = "") => photos[slot]
    ? `<figure class="ps has-img"><img src="${h(photos[slot])}" alt="${h(alt)}"${dims(slot)} loading="lazy" decoding="async"${extra}></figure>`
    : sampleOf(slot) ? `<figure class="ps has-img eg-photo"><img src="${h(sampleOf(slot))}" alt="" loading="lazy" decoding="async"><span>לדוגמה</span></figure>`
    : draft ? `<figure class="ps ph"><span>${h(PHOTOS[slot].label)}<br>מעלים ב״תמונות״</span></figure>` : "";
  const area = String(c.area || "").trim();
  const GUIDES = guidesOf(T, services);
  const urgentGuides = GUIDES.items.filter((it) => it.kind === "now"); // what to do right now; trades without them show tips
  // The absolute address, only on the deployed site: what Google indexes as the one true page.
  const site = !draft && /^https:\/\/[a-z0-9.-]+\/$/.test(url || "") ? url : "";
  const ogPhoto = heroImg || WORKS.map((s) => photos[s]).find(Boolean) || photos.portrait;
  // The fonts come from the site itself (scripts/fetch-fonts.mjs): faster, and nothing goes to Google. A draft takes
  // them from /shared/fonts; only the repo copy (no address yet) still links Google Fonts.
  const font = FONTS[L.id];
  const localFonts = Boolean(font) && (draft || Boolean(site));
  const fontDir = draft ? assets + "fonts/" : "assets/fonts/";
  // The @font-face rules go into the page (no stylesheet to wait for), with the body font preloaded.
  const fontHead = localFonts
    ? `${font.preload ? `<link rel="preload" href="${h(fontDir + font.preload)}" as="font" type="font/woff2" crossorigin>\n` : ""}<style>${String(font.faces || "").replace(/url\(([\w.-]+\.woff2)\)/g, (m, f) => `url(${fontDir}${f})`).replace(/<\//g, "")}</style>`
    : `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?${L.look.fonts}&display=swap" rel="stylesheet">`;
  const ogImage = site && ogPhoto && !/^https?:/.test(ogPhoto) ? site + ogPhoto : "";
  const desc = `${trade} ${inArea(area)}: ${services.map((s) => s.name).slice(0, 3).join(", ")}. ${W.descEnd || "פותחים קריאה בצ׳אט."}`;

  const facts = [
    has("response_time") || draft ? `<div><b>${v("response_time")}</b><span>זמן חזרה</span></div>` : "",
    has("years") ? `<div><b>${h(yearsHe(c.years))}</b><span>בתחום</span></div>` : "",
    has("warranty") ? `<div><b>${h(c.warranty)}</b><span>אחריות</span></div>` : "",
  ].filter(Boolean).join("\n        ");

  const top = [
    `<div>זמן חזרה<b>${v("response_time")}</b></div>`,
    has("hours") ? `<div>שעות פעילות<b>${h(c.hours)}</b></div>` : "",
    has("warranty") ? `<div>אחריות<b>${h(c.warranty)}</b></div>` : "",
  ].filter(Boolean);

  const rows = services.length
    ? services.map((s) => `<tr><td><b>${draft ? h(s.name) : `<a class="svc-link" href="${servicePage(s.name)}">${h(s.name)}</a>`}</b>${s.detail ? `<small>${h(s.detail)}</small>` : ""}</td>${showTime ? `<td class="hide-sm">${h(s.time || "")}</td>` : ""}${showPrice ? `<td class="price">${h(s.price || "לפי הצעת מחיר")}</td>` : ""}<td><button type="button" data-open-bot>${h(W.open)}</button></td></tr>`).join("\n          ")
    : egServices.length ? egServices.map((s) => `<tr class="eg-row"><td><b>${h(s.name)}</b>${s.detail ? `<small>${h(s.detail)}</small>` : ""}</td>${showTime ? `<td class="hide-sm">${h(s.time || "")}</td>` : ""}${showPrice ? `<td class="price">${h(s.price || "")}</td>` : ""}<td></td></tr>`).join("\n          ")
    : `<tr><td colspan="4"><span class="todo">${h(SERVICES.label)}</span></td></tr>`;

  // Up to six work photos. A draft shows the first three frames even when empty, the others only once filled.
  // Without a sample photo of the trade, one empty frame says where the photos go, not three.
  const draftWorks = (SAMPLE_WORKS[T.id] || []).length ? DRAFT_WORKS : 1;
  const works = WORKS.filter((s, i) => photos[s] || (draft && i < draftWorks));
  const letters = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"];
  const details = works.map((s, i) => {
    const title = String(c[PHOTOS[s].title] || "").trim();
    return `<div class="detail"><div class="ring">${photo(s, title || `עבודה של ${name}`)}</div><span class="mono">פרט ${letters[i]}</span>${title ? `<h3>${h(title)}</h3>` : draft && !photos[s] && sampleOf(s) ? "" : draft ? `<h3><span class="todo">כותרת לתמונה</span></h3>` : ""}</div>`;
  }).join("\n          ");
  // Before and after: a slider once both photos are in. The draft shows the frame as soon as one is.
  const hasBA = Boolean(photos.before && photos.after);
  const baTitle = String(c.ba_title || "").trim();
  const ba = hasBA || (draft && (photos.before || photos.after)) ? `
<section class="ba-sec">
  <div class="wrap">
    <div class="head"><h2>לפני ואחרי</h2>${hasBA ? '<span class="mono">גוררים את הפס כדי להשוות</span>' : ""}</div>
    <div class="ba${hasBA ? "" : " half"}" style="--pos:50%">
      ${photo("after", "אחרי" + (baTitle ? ": " + baTitle : ""))}
      <div class="ba-before">${photo("before", "לפני" + (baTitle ? ": " + baTitle : ""))}</div>
      ${hasBA ? `<input class="ba-range" type="range" min="0" max="100" value="50" aria-label="להזיז כדי להשוות לפני ואחרי">
      <span class="ba-line" aria-hidden="true"></span>` : ""}
      <span class="ba-tag b">לפני</span><span class="ba-tag a">אחרי</span>
    </div>
    ${baTitle ? `<p class="ba-cap">${h(baTitle)}</p>` : draft ? `<p class="ba-cap"><span class="todo">כותרת ללפני ואחרי</span></p>` : ""}
  </div>
</section>
` : "";
  const portrait = photos.portrait ? photo("portrait", owner || name, ' style="object-position:50% 35%"')
    : draft ? photo("portrait", "") : `<div class="ps mono-letter" aria-hidden="true">${h(ownerFirst.slice(0, 1))}</div>`;

  // The response time goes on step 3 only where step 3 is the call back (T.callbackStep), never on a first session or a visit.
  const resp3 = String(c.response_time || "").trim() || (draft && EG.response_time) || "";
  const steps = T.steps.map(([t, h3, p], i) => [i === 2 && T.callbackStep !== false ? `${t} · ${resp3 ? whenText(resp3) : "…"}` : t, h3, p]).map(([t, h3, p]) => `<div class="step"><span class="mono">${h(t)}</span><h3>${h(h3)}</h3><p>${h(p)}</p></div>`).join("\n      ");

  // The line at the bottom of every page: who built the site, with a link home (the brand's name as the link, nothing more).
  const creditLine = credit && credit.name ? `<p class="credit">האתר נבנה ב-<a href="${draft || !credit.url ? "#" : h(credit.url)}" rel="noopener">${h(credit.name)}</a> · אתרים שבונים עסקים</p>` : "";
  const chips = services.map((s) => s.name).concat("משהו אחר");
  const bot = {
    whatsapp: waIntl || "972500000000",
    name: `${ownerFirst} · ${trade}`, subtitle: W.subtitle, initial: ownerFirst.slice(0, 1), launcher: W.open,
    greet: T.greet ? T.greet.replace("{name}", ownerFirst) + (T.crisis ? "\n" + T.crisis : "") : `היי, כאן ${ownerFirst} 👋\nאני כנראה באמצע עבודה, אבל בצ׳אט הזה עונים מיד. כמה שאלות קצרות ואני חוזר אליכם.`,
    to: T.plural ? "אלינו" : "אליי", at: T.plural ? "אצלנו" : "אצלי",
  };

  const index = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${h(trade)}${area ? " " + h(inArea(area)) : ""} · ${h(name)}${draft ? " · טיוטה" : ""}</title>
<meta name="description" content="${h(desc)}">
${robots}${site ? `<link rel="canonical" href="${h(site)}">
<meta property="og:url" content="${h(site)}">
` : ""}${ogImage ? `<meta property="og:image" content="${h(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
` : ""}<meta property="og:type" content="website">
<meta property="og:title" content="${h(name)} · ${h(trade)}${area ? " " + h(inArea(area)) : ""}">
<meta property="og:description" content="${h(desc)}">
<meta property="og:locale" content="he_IL">${draft ? "" : `
<script type="application/ld+json">${js(localBusiness({ ...c, services, towns }, { phone: call ? "+" + call.intl : "", description: desc, url: site, image: ogImage, type: T.schema }))}</script>`}
<meta name="theme-color" content="${h(themeColor(L.look, L.p))}">
<link rel="icon" href="${draft ? "data:image/svg+xml," + encodeURIComponent(FAVICON) : "assets/favicon.svg"}" type="image/svg+xml">
${fontHead}
<script src="${h(assets)}a11y.js" data-statement="${draft ? "" : "accessibility.html"}"></script>
<style>${CSS}${LOOK_CSS[L.id]}:root { ${cssVars(L.look, L.p)} }${GUIDE_CSS}${draft ? DRAFT_CSS : ""}</style>
</head>
<body class="look-${L.id}">
${draft ? '<div class="ribbon" role="note">טיוטה לאישור · האתר עוד לא באוויר</div>\n' : ""}
<header class="hero${heroImg && !inVis ? " has-bg" : ""}"${heroImg && !inVis ? ` style="--hero-img: url('${h(heroImg)}')"` : ""}>${sampleHero && !inVis ? `
  <span class="sample-tag">תמונה לדוגמה · מעלים תמונה או סרטון משלכם</span>` : ""}
  <div class="wrap bar">
    <div class="logo"><svg viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" fill="currentColor"/></svg><span>${v("business_name")}</span></div>
    ${callLocal ? `<a class="live mono" href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>` : ""}
  </div>
  <div class="wrap hero-grid">
    <div>
      <div class="tag mono">${v("trade")} · ${v("area")}${has("hours") ? " · " + h(c.hours) : ""}</div>
      <h1><span>${v("headline_1")}</span>${has("headline_2") || EG.headline_2 ? `<br><span>${v("headline_2")}</span>` : ""}</h1>
      <p>${v("intro")}</p>
      <div class="ctas">
        <button class="btn btn-signal" type="button" data-open-bot>${h(W.open)} בצ׳אט</button>
        <a class="btn btn-ghost" href="#" data-wa="${h(`היי ${ownerFirst}, ${W.waHello}`)}">וואטסאפ ישיר</a>
      </div>
      <div class="facts mono">
        ${facts}
      </div>${leads ? `
      <p class="avail-line"><span class="live mono" data-avail hidden><i></i></span></p>` : ""}
    </div>
    ${heroVideo ? reel(heroVideo, String(c.video_title || "").trim()) : heroImg && !inVis ? "<div></div>" : L.look.visual({ h, v, has, c, callLocal, prettyPhone, draft, yearsHe, words: W, tradeId: T.id, heroImg: frameImg, sample: Boolean(sampleHero), svc: listed })}
  </div>
</header>
${T.crisis ? `<p class="crisis" role="note"><b>במצוקה עכשיו?</b> ${h(T.crisis)}</p>\n` : ""}
<main>

<section>
  <div class="wrap">
    <div class="head"><h2>${h(W.jobs)}</h2>${egServices.length ? `<span class="mono eg-note">לדוגמה · משנים בשאלון או בצ׳אט</span>` : has("price_note") && showPrice ? `<span class="mono">${h(c.price_note)}</span>` : ""}</div>
    <div class="order">
      <div class="order-top mono" style="grid-template-columns: repeat(${top.length}, minmax(0, 1fr))">
        ${top.join("\n        ")}
      </div>
      <table>
        <thead><tr><th>${h(W.col)}</th>${showTime ? `<th class="hide-sm">${h(W.time)}</th>` : ""}${showPrice ? "<th>טווח מחיר</th>" : ""}<th><span class="sr">פעולה</span></th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="field">
  <div class="wrap">
    <div class="head"><h2>${h(W.field || (T.urgent ? "מהשטח" : T.plural ? "קצת עלינו" : "קצת עליי"))}</h2>${works.length ? '<span class="mono">עבודות אחרונות</span>' : ""}</div>
    <div class="field-grid${works.length ? "" : " solo"}">
      <div class="lanyard">
        <span class="clip"></span>
        <div class="badge">
          <div class="badge-top"><b>${v("business_name")}</b><span>${v("trade")}</span></div>
          ${portrait}
          <h3>${v("owner_name")}</h3>
          <p>${v("trade")}${has("years") ? ` · ${h(yearsHe(c.years))} בתחום` : ""}</p>
          <div class="code" aria-hidden="true"></div>
        </div>
      </div>
      ${works.length ? `<div>
        <div class="details n${works.length}">
          ${details}
        </div>
      </div>` : ""}
    </div>
  </div>
</section>
${ba}${clips.length ? clipsSection(clips) : ""}
<section>
  <div class="wrap">
    <div class="head"><h2>${h(W.how)}</h2></div>
    <div class="steps">
      ${steps}
    </div>
  </div>
</section>

${leads ? `<section class="tst-sec" id="testimonials" data-testimonials hidden>
  <div class="wrap">
    <div class="head"><h2>מה אומרים לקוחות</h2><span class="mono">כתבו אחרי העבודה</span></div>
    <div class="tst-grid" data-tst-list></div>
  </div>
</section>
` : ""}
${GUIDES.items.length ? `<section class="guides-sec" id="guides">
  <div class="wrap">
    <div class="head"><h2>${urgentGuides.length ? "מה עושים עד שמגיעים" : "טיפים ושאלות נפוצות"}</h2>${urgentGuides.length ? '<span class="mono">ועוד טיפים ושאלות שחוזרות</span>' : ""}</div>
    <div class="gd">
      ${(urgentGuides.length ? urgentGuides : GUIDES.items.slice(0, 4)).map(guideItem).join("\n      ")}
    </div>
    <p class="gd-more"><a href="${draft ? "#" : "guides.html"}">לכל הטיפים והשאלות (${GUIDES.items.length})</a></p>
  </div>
</section>` : ""}

<section class="area">
  <div class="wrap row">
    <div>
      <div class="head"><h2>אזורי שירות</h2>${has("radius_note") ? `<span class="mono">${h(c.radius_note)}</span>` : ""}</div>
      <div class="towns">${towns.length ? towns.map((t) => `<span>${h(t)}</span>`).join("") : `<span class="todo">${h(TOWNS.label)}</span>`}</div>
      ${areas.length ? `<p class="area-links">${areas.map((r) => `<a href="${draft ? "#" : areaPage(r.name)}">${h(trade)} ${h(inArea(r.name))}</a>`).join("")}</p>` : ""}
    </div>
    <div>
      <p>${h(W.areaNote || (T.plural ? (T.urgent ? "לא בטוחים אם אנחנו מגיעים אליכם? כתבו את הישוב בצ׳אט, ונחזור אליכם עם תשובה." : "לא בטוחים אם זה באזור שלכם? כתבו בצ׳אט, ונחזור אליכם עם תשובה.")
        : T.urgent ? "לא בטוחים אם אני מגיע אליכם? כתבו את הישוב בצ׳אט, ואחזור אליכם עם תשובה." : "לא בטוחים אם זה באזור שלכם? כתבו בצ׳אט, ואחזור אליכם עם תשובה."))}</p>
      <button class="btn btn-signal" type="button" data-open-bot>לכתוב בצ׳אט</button>
      <a class="save-contact" href="${draft ? "#" : "contact.vcf"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 4v6M16 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>לשמור את ${h(name)} באנשי הקשר</a>
      ${social.length ? `<div class="social"><p>עקבו אחרינו</p><div class="social-links">${socialLinks(social)}</div></div>` : ""}
    </div>
  </div>
</section>

</main>

<footer class="wrap"><div class="row"><span>${h(name)} · ${h(trade)} · ${year}</span><span>הפרטים שמשאירים בצ׳אט משמשים רק כדי לחזור אליכם. <a href="${draft ? "#" : "privacy.html"}">פרטיות</a> · <a href="${draft ? "#" : "accessibility.html"}">הצהרת נגישות</a></span></div>${creditLine}</footer>

${heroVideo ? `<script>${REEL_JS}</script>
` : ""}${clips.length ? `<script>${CLIPS_JS}</script>
` : ""}<script src="${h(assets)}leadform.js" defer></script>
<script src="${h(assets)}leadbot.js" defer></script>
<script>
// The chat's scripts load without holding up the page (defer); this runs once they are in.
document.addEventListener("DOMContentLoaded", () => {
  const RANGES = ${js(ranges)};
  const SITE = ${js({ whatsapp: bot.whatsapp, leads })};
  const BOT = ${js(bot)};
  // The trade's chat (trades/<id>.mjs): its questions, the urgent answer (URG) and its tip.
  const CHAT = ${js({ lead: W.lead, priceNote: T.chat.priceNote || "", urgentNote: T.chat.urgentNote || "" })};
  const URG = ${js(T.chat.urgency ? T.chat.urgency.chips[0] : "")};
  const STEPS = [
    { key: "issue", label: ${js(T.chat.issue.label)}, ask: ${js(T.chat.issue.ask)}, chips: ${js(chips)} },${T.chat.photo ? `
    { key: "photo", label: "תמונה", ask: ${js(T.chat.photo)}, photo: true },` : ""}${(T.chat.extra || []).map((x) => `
    { key: ${js(x.key)}, label: ${js(x.label)}, ask: ${js(x.ask)}, chips: ${js(x.chips)}${x.only ? `, show: (d) => ${js(x.only.is)}.includes(d[${js(x.only.key)}])` : ""} },`).join("")}${T.chat.urgency ? `
    { key: "urgency", label: ${js(T.chat.urgency.label)}, ask: ${js(T.chat.urgency.ask)}, chips: ${js(T.chat.urgency.chips)}${T.chat.urgency.tip && GUIDES.items.some((it) => it.id === T.chat.urgency.tip.id) ? `,
      tip: { when: (v) => v === URG, id: ${js(T.chat.urgency.tip.id)}, text: ${js(T.chat.urgency.tip.text)} }` : ""} },` : ""}${T.chat.noCity ? "" : `
    { key: "city", label: "ישוב", ask: "באיזה ישוב?", input: "text", placeholder: ${js(towns[0] ? "למשל: " + towns[0] : "ישוב")} },`}
    { key: "name", label: "שם", ask: "איך קוראים לכם?", input: "text", placeholder: "שם" },
    { key: "phone", label: "טלפון", ask: "לאיזה מספר לחזור?", input: "tel", placeholder: "050-1234567" },
    { key: "callback", label: "מתי לחזור", ask: "ומתי נוח שנחזור אליכם?", chips: ["עכשיו", "בעוד שעה", "היום אחרי 16:00", "היום אחרי 18:00", "מחר בבוקר"], show: (d) => !URG || d.urgency !== URG },
  ];
  const bot = LeadBot.init({
    whatsapp: SITE.whatsapp, name: BOT.name, subtitle: BOT.subtitle, initial: BOT.initial, launcher: BOT.launcher, greet: BOT.greet,
    // נציג AI: a first look at the customer's photo, matched to this business's own price list (/api/estimate).
    estimate: SITE.leads ? { endpoint: SITE.leads.split("/api/lead/")[0] + "/api/estimate", slug: SITE.leads.split("/").pop() } : undefined,
    steps: STEPS,
    closing: (d) => ["תודה " + d.name.split(" ")[0] + "!", RANGES[d.issue] ? d.issue + " עולה בדרך כלל " + RANGES[d.issue] + ". " + CHAT.priceNote : "", URG && d.urgency === URG && CHAT.urgentNote ? CHAT.urgentNote : "", "לחצו למטה, והפרטים יגיעו " + BOT.to + " בוואטסאפ."].filter(Boolean).join("\\n"),
    summary: (d) => CHAT.lead + " חדשה מהאתר\\n" + STEPS.filter((x) => !["photo", "name", "phone", "callback"].includes(x.key) && d[x.key]).map((x) => x.label + ": " + d[x.key]).join("\\n") + "\\nשם: " + d.name + "\\nטלפון: " + d.phone + (d.callback ? "\\nמתי לחזור: " + d.callback : ""),
    capture: SITE.leads ? {
      endpoint: SITE.leads,
      lead: (d) => ({ name: d.name, phone: d.phone, service: d.issue, callback: d.callback, message: STEPS.filter((x) => !["issue", "photo", "name", "phone", "callback"].includes(x.key) && d[x.key]).map((x) => x.label + ": " + d[x.key] + ".").join(" ") }),
      saved: (d) => ["תודה " + d.name.split(" ")[0] + "! ה" + CHAT.lead + " " + BOT.at + ", ואישור בדרך אליכם בוואטסאפ.", RANGES[d.issue] ? d.issue + " עולה בדרך כלל " + RANGES[d.issue] + ". " + CHAT.priceNote : "", URG && d.urgency === URG && CHAT.urgentNote ? CHAT.urgentNote : ""].filter(Boolean).join("\\n"),
    } : undefined,
  });
  document.querySelectorAll(".ba").forEach((b) => { const r = b.querySelector(".ba-range"); if (r) r.addEventListener("input", () => b.style.setProperty("--pos", r.value + "%")); });
  document.querySelectorAll(".order tbody tr").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("button, a")) bot.open(); }));
  // From a service's own page (?q=<service>): the chat opens with that service already picked.
  const ASKED = new URLSearchParams(location.search).get("q");
  if (ASKED && ${js(services.map((x) => x.name))}.includes(ASKED)) bot.open({ issue: ASKED });
  if (SITE.leads) LeadForm.visit(SITE.leads.replace("/api/lead/", "/api/visit/")); // a number for the monthly report, no cookie
  if (SITE.leads) LeadForm.status(SITE.leads.replace("/api/lead/", "/api/status/")); // "available now": what the owner wrote in WhatsApp
  if (SITE.leads && LeadForm.testimonials) LeadForm.testimonials(SITE.leads.replace("/api/lead/", "/api/testimonials/")); // what customers wrote, shown at once
});
</script>
</body>
</html>
`;

  const contact = callLocal ? `<a href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>` : "";
  const legal = (title, body, extraHead = "", file = "", index = false) => `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${h(title)} · ${h(name)}</title>
${robots || (index ? "" : '<meta name="robots" content="noindex, follow">\n')}${site && file ? `<link rel="canonical" href="${h(site + file)}">\n` : ""}<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<script src="assets/a11y.js" data-statement="accessibility.html"></script>
<style>${LEGAL_CSS}</style>${extraHead}
</head>
<body>
<main>
<a class="back" href="./">חזרה לאתר</a>
<h1>${h(title)}</h1>
<p class="meta">${h(name)}, ${h(trade)} · עודכן: ${h(updated)}</p>
${body}
</main>${creditLine ? `\n<footer class="legal-credit">${creditLine}</footer>` : ""}
</body>
</html>
`;

  const privacy = legal("פרטיות", `
<h2>מה אנחנו אוספים</h2>
<p>כשפונים בצ׳אט: ${h(T.privacyWhat)}. בנוסף נשמרים מאיזה עמוד הגעתם (למשל מגוגל או מפייסבוק) ומתי.</p>${leads ? "\n<p>תמונה שצירפתם עוברת גם לבדיקה ראשונה אוטומטית (שירות הבינה המלאכותית של Anthropic), כדי לתת לכם הערכה מהמחירון של העסק. היא לא נשמרת שם.</p>" : ""}${leads ? "\n<p>אנחנו סופרים כמה פעמים נכנסו לאתר, מאיפה, מאיזה סוג מכשיר ובאיזו שעה, וכמה לחצו על וואטסאפ, חיוג או הצ׳אט. כמספרים בלבד: בלי עוגיות, בלי כתובת IP ובלי שום פרט שמזהה אתכם.</p>" : ""}

<h2>למה</h2>
<p>רק כדי לחזור אליכם בעניין ה${h(W.lead)}${leads ? ", לשלוח לכם אישור בוואטסאפ" : ""} ולתאם את העבודה. לא שולחים לכם פרסומות, ולא מוכרים או מעבירים את הפרטים לאף אחד לצורך שיווק.</p>

<h2>אתם לא חייבים</h2>
<p>אין חובה למסור את הפרטים. בלי מספר טלפון לא נוכל לחזור אליכם, ואפשר תמיד להתקשר או לכתוב לנו בוואטסאפ ישירות.</p>

<h2>איפה הפרטים נשמרים</h2>
<p>${leads
    ? "במערכת מאובטחת שרק העסק ומי שמתחזק את האתר עבורו יכולים לגשת אליה. הודעות הוואטסאפ עוברות דרך השירות הרשמי של WhatsApp (Meta). הפרטים נשמרים עד שנתיים מיום הפנייה, ואז נמחקים."
    : "הפרטים מגיעים ישירות לוואטסאפ של העסק, דרך השירות של WhatsApp (Meta). האתר עצמו לא שומר אותם."}</p>

${leads ? `<h2>המלצות</h2>
<p>אחרי עבודה אנחנו יכולים לבקש מכם המלצה, פעם אחת. אם תכתבו, היא מופיעה באתר עם השם שבחרתם והדירוג, בלי טלפון. אפשר לבקש להסיר אותה בכל זמן.</p>

` : ""}<h2>עוגיות</h2>
<p>האתר לא משתמש בעוגיות (cookies): לא לפרסום, לא למעקב ולא לסטטיסטיקה. בדפדפן שלכם נשמרות רק ההגדרות שבחרתם בתפריט הנגישות${leads ? ", וסימון שהביקור והלחיצות כבר נספרו, עד שסוגרים את הלשונית" : ""}. ${localFonts ? "הגופנים נטענים מהאתר עצמו, בלי שירות חיצוני." : "הגופן של האתר נטען מ-Google Fonts, ולכן גוגל רואה את כתובת ה-IP שלכם."}</p>

<h2>לראות, לתקן או למחוק</h2>
<p>אפשר לבקש לראות את הפרטים ששמרנו עליכם, לתקן אותם או למחוק אותם. כתבו לנו בוואטסאפ או התקשרו${contact ? ": " + contact : ""}.</p>`);

  const accessibility = legal("הצהרת נגישות", `
<p>חשוב לנו שכל אחד יוכל להשתמש באתר, כולל אנשים עם מוגבלות. האתר נבנה לפי ההנחיות של התקן הישראלי 5568 (WCAG 2.0, רמה AA).</p>

<h2>מה עשינו</h2>
<ul>
  <li>האתר עובד בטלפון ובמחשב, ומתאים את עצמו לגודל המסך.</li>
  <li>אפשר לנווט בכל האתר ובצ׳אט עם המקלדת בלבד, ומסומן בבירור איפה נמצאים.</li>
  <li>לכל התמונות יש תיאור לקוראי מסך, וכפתורים ושדות מתוארים במילים.</li>
  <li>יחס הניגודיות בין טקסט לרקע עומד בדרישות התקן.</li>
  <li>אפשר להגדיל את הטקסט בדפדפן עד 200% בלי לאבד תוכן.</li>
  <li>האתר נבדק בכלי בדיקת נגישות אוטומטי, ונבדק ידנית במקלדת ובטלפון.</li>
</ul>

<h2>תפריט הנגישות</h2>
<p>בכפתור הנגישות העגול בפינה התחתונה אפשר להגדיל את הטקסט, לעבור לניגודיות גבוהה, להדגיש קישורים, לבחור גופן פשוט ולעצור כל תנועה בעמוד. הבחירה נשמרת במכשיר שלכם.</p>

<h2>מצאתם בעיה?</h2>
<p>אם משהו באתר לא נגיש לכם, נשמח לשמוע ולתקן. אפשר גם לפנות בטלפון במקום בצ׳אט.</p>
<p>אחראי נגישות: ${h(owner)}${contact ? " · " + contact : ""}</p>`);

  const guidesPage = legal("טיפים ושאלות נפוצות", `
<p>מה עושים כשקורה משהו, איך מונעים את הפעם הבאה, ומה שואלים אותנו הכי הרבה. זה ידע כללי מהתחום. בכל מקרה של ספק, כתבו לנו.</p>
<div class="gd">
${GUIDES.items.map(guideItem).join("\n")}
</div>
<p><a class="gd-cta" href="./">${h(W.open)} בצ׳אט</a></p>
<script>${GUIDE_JS}</script>`, `
<style>${GUIDE_CSS}</style>
<script type="application/ld+json">${js(faqSchema(GUIDES.items))}</script>`, "guides.html", true);

  const socialBlock = social.length ? `\n<h2>עקבו אחרינו</h2>\n<p class="social-links">${socialLinks(social)}</p>` : "";
  // One page per service: the owner's own facts about it, the towns, the guides that speak about it, and a way in.
  // Real content for a real search ("פתיחת סתימה בחדרה"), never a page per town with the name swapped.
  const svcPages = draft ? {} : Object.fromEntries(services.filter((x) => String(x.name || "").trim()).map((x) => {
    const file = servicePage(x.name), sname = String(x.name).trim();
    const related = guidesFor(sname, GUIDES.items);
    const others = services.filter((o) => o !== x && String(o.name || "").trim());
    const wa = waIntl ? `https://wa.me/${waIntl}?text=${encodeURIComponent(`היי ${ownerFirst}, אשמח לפרטים על ${sname}.`)}` : "";
    const sdesc = `${sname}${area ? " " + inArea(area) : ""}${x.price ? ": " + String(x.price).trim() : ""}. ${x.detail ? String(x.detail).trim() + ". " : ""}${name}, ${trade}. פותחים קריאה בצ׳אט או בוואטסאפ.`;
    const rows = [
      x.price ? `<tr><th>טווח מחיר</th><td>${h(x.price)}</td></tr>` : "",
      x.time ? `<tr><th>זמן טיפול</th><td>${h(x.time)}</td></tr>` : "",
      has("response_time") ? `<tr><th>זמן חזרה</th><td>${h(c.response_time)}</td></tr>` : "",
      has("hours") ? `<tr><th>שעות פעילות</th><td>${h(c.hours)}</td></tr>` : "",
      has("warranty") ? `<tr><th>אחריות</th><td>${h(c.warranty)}</td></tr>` : "",
    ].filter(Boolean).join("");
    const schema = {
      "@context": "https://schema.org", "@graph": [
        { "@type": "Service", name: sname, serviceType: trade || sname, ...(x.detail ? { description: String(x.detail).trim() } : {}),
          provider: { "@type": "LocalBusiness", name, ...(call ? { telephone: "+" + call.intl } : {}), ...(site ? { url: site } : {}) },
          ...(towns.length || area ? { areaServed: towns.length ? towns : area } : {}),
          ...(site ? { url: site + file } : {}) },
        ...(site ? [{ "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name, item: site },
          { "@type": "ListItem", position: 2, name: sname, item: site + file },
        ] }] : []),
      ],
    };
    const body = `
<p class="lead-in">${h(x.detail || `${sname}, ${trade}${area ? " " + inArea(area) : ""}.`)}</p>
${rows ? `<table class="svc-facts">${rows}</table>` : ""}
<p class="svc-ctas"><a class="gd-cta" href="./?q=${encodeURIComponent(sname)}">${h(W.open)} בצ׳אט</a>${wa ? ` <a class="svc-alt" href="${h(wa)}">וואטסאפ</a>` : ""}${callLocal ? ` <a class="svc-alt" href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>` : ""}</p>
${x.price ? `<p class="svc-note">המחיר הוא טווח לפי מה שבדרך כלל קורה. המחיר הסופי נקבע אחרי שרואים את העבודה, ומסכמים אותו לפני שמתחילים.</p>` : ""}
<h2>איך זה עובד</h2>
<ol class="svc-steps"><li>מתארים בצ׳אט מה צריך ואיפה, ואפשר לצרף תמונה.</li><li>הפרטים מגיעים ל${h(ownerFirst === "אנחנו" ? name : ownerFirst)} בוואטסאפ${has("response_time") ? `, וחוזרים אליכם ${h(whenText(c.response_time))}` : ""}.</li><li>קובעים שעה ומסכמים את המחיר לפני העבודה.</li></ol>
${towns.length ? `<h2>איפה עובדים</h2>\n<p>${towns.map(h).join(" · ")}</p>` : ""}
${related.length ? `<h2>טיפים ושאלות</h2>\n<div class="gd">\n${related.map(guideItem).join("\n")}\n</div>\n<p><a href="guides.html">לכל הטיפים</a></p>` : ""}
${others.length ? `<h2>עוד שירותים</h2>\n<ul class="svc-more">${others.map((o) => `<li><a href="${servicePage(o.name)}">${h(o.name)}</a>${o.price ? ` <span>${h(o.price)}</span>` : ""}</li>`).join("")}</ul>` : ""}${socialBlock}`;
    const page = legal(`${sname}${area ? " " + inArea(area) : ""}`, body, `
<meta name="description" content="${h(sdesc)}">${site ? `\n<meta property="og:url" content="${h(site + file)}">` : ""}
<meta property="og:title" content="${h(sname)} · ${h(name)}">
<meta property="og:description" content="${h(sdesc)}">
<style>${GUIDE_CSS}${SERVICE_CSS}:root { --link: ${h(themeColor(L.look, L.p))}; }</style>
<script type="application/ld+json">${js(schema)}</script>
<script>${GUIDE_JS}</script>`, file, true);
    return [file, page];
  }));

  // One page per area the owner wrote about: their words about working there, its towns and how fast they come.
  const areaPages = draft ? {} : Object.fromEntries(areas.map((r) => {
    const file = areaPage(r.name), rname = String(r.name).trim(), rtowns = r.towns.slice(0, REGIONS.townsMax);
    const resp = String(r.response || "").trim() || (has("response_time") ? String(c.response_time).trim() : "");
    const title = `${trade} ${inArea(rname)}`;
    const adesc = `${title}: ${rtowns.slice(0, 4).join(", ")}${rtowns.length > 4 ? " ועוד" : ""}. ${name}${resp ? `, חוזרים ${whenText(resp)}` : ""}. פותחים קריאה בצ׳אט או בוואטסאפ.`;
    const wa = waIntl ? `https://wa.me/${waIntl}?text=${encodeURIComponent(`היי ${ownerFirst}, אני מ${rtowns[0] || rname}, אשמח לפרטים.`)}` : "";
    const rows = [
      `<tr><th>ישובים</th><td>${rtowns.map(h).join(" · ")}</td></tr>`,
      resp ? `<tr><th>זמן חזרה</th><td>${h(resp)}</td></tr>` : "",
      has("hours") ? `<tr><th>שעות פעילות</th><td>${h(c.hours)}</td></tr>` : "",
      has("warranty") ? `<tr><th>אחריות</th><td>${h(c.warranty)}</td></tr>` : "",
    ].filter(Boolean).join("");
    const others = areas.filter((o) => o !== r);
    const schema = {
      "@context": "https://schema.org", "@graph": [
        { "@type": T.schema || "LocalBusiness", name, ...(call ? { telephone: "+" + call.intl } : {}), ...(site ? { url: site } : {}),
          areaServed: rtowns.map((t) => ({ "@type": "City", name: t })) },
        ...(site ? [{ "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name, item: site },
          { "@type": "ListItem", position: 2, name: title, item: site + file },
        ] }] : []),
      ],
    };
    const body = `
${String(r.note).trim().split(/\n+/).map((l) => `<p class="lead-in">${h(l)}</p>`).join("\n")}
<table class="svc-facts">${rows}</table>
<p class="svc-ctas"><a class="gd-cta" href="./">${h(W.open)} בצ׳אט</a>${wa ? ` <a class="svc-alt" href="${h(wa)}">וואטסאפ</a>` : ""}${callLocal ? ` <a class="svc-alt" href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>` : ""}</p>
${services.length ? `<h2>מה עושים ${h(inArea(rname))}</h2>\n<ul class="svc-more">${services.map((o) => `<li><a href="${servicePage(o.name)}">${h(o.name)}</a>${o.price ? ` <span>${h(o.price)}</span>` : ""}</li>`).join("")}</ul>` : ""}
${others.length ? `<h2>אזורים נוספים</h2>\n<ul class="svc-more">${others.map((o) => `<li><a href="${areaPage(o.name)}">${h(trade)} ${h(inArea(o.name))}</a></li>`).join("")}</ul>` : ""}${socialBlock}`;
    const page = legal(title, body, `
<meta name="description" content="${h(adesc)}">${site ? `\n<meta property="og:url" content="${h(site + file)}">` : ""}
<meta property="og:title" content="${h(title)} · ${h(name)}">
<meta property="og:description" content="${h(adesc)}">
<style>${GUIDE_CSS}${SERVICE_CSS}:root { --link: ${h(themeColor(L.look, L.p))}; }</style>
<script type="application/ld+json">${js(schema)}</script>`, file, true);
    return [file, page];
  }));

  // For Google: every page worth finding, and where the list is. Only with the real address.
  const today = now.toISOString().slice(0, 10);
  const seo = site ? {
    "robots.txt": `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`,
    "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["", ...Object.keys(svcPages), ...Object.keys(areaPages), ...(GUIDES.items.length ? ["guides.html"] : [])].map((f) => `  <url><loc>${h(site + f)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`,
  } : {};
  return { "index.html": index, "privacy.html": privacy, "accessibility.html": accessibility, ...(draft ? {} : { ...(GUIDES.items.length ? { "guides.html": guidesPage } : {}), "contact.vcf": vcard(c), ...svcPages, ...areaPages, ...seo }) };
}

export const HEADERS = `# Netlify headers for this site. Applied however the site is deployed (Git or CLI).
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Photos, videos and scripts keep fixed names, and a self edit replaces them in place: a short cache that asks again,
# so a visitor sees the new photo minutes after a publish. Only the fonts never change under their names.
# (No two rules match the same file, so Netlify never joins two Cache-Control values.)
/assets/photos/*
  Cache-Control: public, max-age=300, must-revalidate

/assets/videos/*
  Cache-Control: public, max-age=300, must-revalidate

/assets/hero.mp4
  Cache-Control: public, max-age=300, must-revalidate

/assets/hero-poster.webp
  Cache-Control: public, max-age=300, must-revalidate

/assets/hero-poster.jpg
  Cache-Control: public, max-age=300, must-revalidate

/assets/leadbot.js
  Cache-Control: public, max-age=300, must-revalidate

/assets/leadform.js
  Cache-Control: public, max-age=300, must-revalidate

/assets/a11y.js
  Cache-Control: public, max-age=300, must-revalidate

/assets/favicon.svg
  Cache-Control: public, max-age=300, must-revalidate

/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/contact.vcf
  Content-Type: text/vcard; charset=utf-8
`;

// What the AI chat on the site knows (ls_clients.chat_facts), from the approved content only.
export function chatFacts(c) {
  const lines = [
    `${c.business_name}: ${c.trade}, ${c.area}. בעל העסק: ${c.owner_name}.`,
    c.hours && `שעות פעילות: ${c.hours}.`,
    `זמן חזרה ללקוח: ${c.response_time}.`,
    c.years && `${yearsHe(c.years)} בתחום.`,
    c.warranty && `אחריות: ${c.warranty}.`,
    `ישובים: ${(c.towns || []).join(", ")}.${c.radius_note ? " " + c.radius_note + "." : ""}`,
    ...regionsReady(c).map((r) => `אזור ${r.name}: ${r.towns.join(", ")}${r.response ? `, חוזרים ${whenText(r.response)}` : ""}. ${String(r.note).replace(/\s+/g, " ").trim()}`),
    "שירותים:",
    ...(c.services || []).map((s) => `- ${s.name}${s.detail ? ` (${s.detail})` : ""}${s.price ? `: ${s.price}` : ""}${s.time ? `, ${s.time}` : ""}`),
    c.price_note && `${c.price_note}.`,
    socialList(c).length && `ברשתות: ${socialList(c).map((x) => `${x.label} ${x.url}`).join(", ")}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

/* ---------------- styles (from clients/sample-plumber/index.html) ---------------- */

// The owner's own short video, in a blueprint detail frame. Silent, looping, never more than 10 seconds.
// It starts only when the visitor hasn't asked for less motion or less data, and a button stops it (WCAG 2.2.2).
const reel = (v, title) => `<figure class="reel">
      <div class="reel-frame"><video muted loop playsinline preload="none" poster="${h(v.poster)}" aria-label="${h(title || "צילום מהעבודה")}"><source src="${h(v.src)}" type="video/mp4"></video>
        <button class="reel-toggle" type="button" aria-label="להפעיל את הסרטון" data-state="play"></button></div>
      <figcaption class="mono">צילום מהשטח${title ? " · " + h(title) : ""}</figcaption>
    </figure>`;

// "סרטונים מהעבודה": up to five short videos. Nothing of them loads with the page: the posters (first frames) come
// when the section is a screen away, and a video's file only when it starts. One plays at a time, only while on screen, and never by itself for reduced motion,
// save-data, a slow network or the accessibility menu's "עצירת תנועה". Each has its own pause button.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="; // a clear pixel until the poster comes
const dimsOf = (x) => (x.w > 0 && x.h > 0 ? ` width="${Math.round(x.w)}" height="${Math.round(x.h)}"` : "");
const clipsSection = (clips) => `
<section class="clips-sec" id="videos">
  <div class="wrap">
    <div class="head"><h2>סרטונים מהעבודה</h2><span class="mono">בלי קול · עד ${VIDEOS.seconds} שניות</span></div>
    <div class="vclips n${clips.length}">
      ${clips.map((x) => { const t = String(x.title || "").trim(); return `<figure class="vclip"${t ? ` data-t="${h(t)}"` : ""}>
        <div class="vclip-frame"><img src="${BLANK}" data-src="${h(x.poster)}" alt=""${dimsOf(x)} decoding="async"><noscript><img src="${h(x.poster)}" alt=""${dimsOf(x)} loading="lazy"></noscript>
          <video muted loop playsinline preload="none" data-src="${h(x.src)}"${dimsOf(x)} aria-label="${h(t || "סרטון מהעבודה")}"></video>
          <button class="reel-toggle" type="button" aria-label="להפעיל את הסרטון${t ? ": " + h(t) : ""}" data-state="play"></button></div>
        ${t ? `<figcaption>${h(t)}</figcaption>` : ""}
      </figure>`; }).join("\n      ")}
    </div>
  </div>
</section>
`;

const CLIPS_JS = `(function () {
  var list = [].slice.call(document.querySelectorAll(".vclip")).map(function (el) {
    return { el: el, v: el.querySelector("video"), b: el.querySelector(".reel-toggle"), t: el.dataset.t ? ": " + el.dataset.t : "", ratio: 0, stopped: false };
  });
  if (!list.length) return;
  var c = navigator.connection || {};
  var auto = !(matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-still") || c.saveData || /2g/.test(c.effectiveType || ""));
  function show(f) { var on = !f.v.paused; f.b.dataset.state = on ? "pause" : "play"; f.b.setAttribute("aria-label", (on ? "לעצור את הסרטון" : "להפעיל את הסרטון") + f.t); }
  function play(f) {
    list.forEach(function (o) { if (o !== f && !o.v.paused) o.v.pause(); }); // one at a time
    if (!f.v.getAttribute("src")) f.v.src = f.v.dataset.src; // the file is fetched only now
    var p = f.v.play(); if (p && p.catch) p.catch(function () { show(f); });
  }
  function pick() { // the most visible one plays; one that left the screen stops
    var best = null;
    list.forEach(function (f) { if (f.ratio < .6 && !f.v.paused) f.v.pause(); if (auto && !f.stopped && f.ratio >= .6 && (!best || f.ratio > best.ratio)) best = f; });
    if (best && best.v.paused && !list.some(function (o) { return o !== best && !o.v.paused; })) play(best);
  }
  list.forEach(function (f) {
    f.v.addEventListener("play", function () { show(f); }); f.v.addEventListener("pause", function () { show(f); });
    f.v.addEventListener("playing", function () { f.el.classList.add("on"); });
    f.b.addEventListener("click", function () { if (f.v.paused) { f.stopped = false; play(f); } else { f.stopped = true; f.v.pause(); } });
  });
  document.addEventListener("a11y-still", function () { auto = false; list.forEach(function (f) { f.v.pause(); }); });
  function posters() { list.forEach(function (f) { var i = f.el.querySelector("img[data-src]"); if (i) { i.src = i.dataset.src; i.removeAttribute("data-src"); } }); }
  if (!("IntersectionObserver" in window)) { posters(); return; }
  var near = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { near.disconnect(); posters(); } }, { rootMargin: "100% 0px" });
  near.observe(document.querySelector(".clips-sec") || list[0].el);
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { list.forEach(function (f) { if (f.el === e.target) f.ratio = e.isIntersecting ? e.intersectionRatio : 0; }); }); pick(); }, { threshold: [0, .6, .9] });
  list.forEach(function (f) { io.observe(f.el); });
})();`;

const REEL_JS = `(function () {
  var v = document.querySelector(".reel video"), b = document.querySelector(".reel .reel-toggle");
  if (!v || !b) return;
  var c = navigator.connection || {};
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-still") || c.saveData || /2g/.test(c.effectiveType || "");
  var wanted = !calm;
  function show() { var on = !v.paused; b.dataset.state = on ? "pause" : "play"; b.setAttribute("aria-label", on ? "לעצור את הסרטון" : "להפעיל את הסרטון"); }
  function play() { v.preload = "auto"; var p = v.play(); if (p && p.catch) p.catch(function () { show(); }); }
  v.addEventListener("play", show); v.addEventListener("pause", show);
  b.addEventListener("click", function () { wanted = v.paused; if (wanted) play(); else v.pause(); });
  document.addEventListener("a11y-still", function () { wanted = false; v.pause(); }); // the accessibility menu (a11y.js)
  // Plays only while on screen, to save the visitor's battery and data, and only after the page itself has loaded.
  function start() {
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { if (e[0].isIntersecting) { if (wanted) play(); } else v.pause(); }).observe(v);
    else if (wanted) play();
  }
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();`;

const CSS = `
  /* Colours come from the look's palette (looks.mjs, cssVars); fonts and a few rules from LOOK_CSS. */
  :root {
    --grid: rgba(255, 255, 255, .09);
    --bot-bg: #ffffff; --bot-fg: var(--ink); --bot-line: var(--rule); --bot-muted: var(--ink-soft);
    --bot-accent: var(--accent); --bot-accent-fg: #fff; --bot-them: var(--tint); --bot-me: var(--accent); --bot-me-fg: #fff;
    --bot-font: var(--body); --bot-radius: 6px; --bot-radius-msg: 6px; --bot-radius-pill: 4px; --bot-radius-input: 4px;
    --ps-ui: var(--accent); --ps-edit: var(--signal);
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--body); font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  a { color: inherit; }
  :focus-visible { outline: 3px solid var(--signal); outline-offset: 2px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .wrap { width: min(1160px, 100% - 32px); margin-inline: auto; }
  .mono { font-family: var(--mono); font-size: 12.5px; letter-spacing: .02em; }
  h1, h2, h3 { font-family: var(--display); font-weight: 400; line-height: 1.05; margin: 0; text-wrap: balance; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 22px; border-radius: 4px; font-weight: 700; text-decoration: none; border: 0; cursor: pointer; font-family: var(--body); font-size: 16px; }
  .btn-signal { background: var(--signal); color: #fff; }
  .btn-signal:hover { filter: brightness(.92); }
  .btn-ghost { border: 1.5px solid var(--hero-line-strong); color: var(--hero-fg); background: transparent; }
  .btn-ghost:hover { border-color: var(--hero-fg); }
  .hero { background-color: var(--hero); color: var(--hero-fg); position: relative; overflow: hidden;
    background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
    background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px; }
  /* A photo behind the top: the text side is washed with the hero colour, so the text keeps its contrast. */
  .hero.has-bg { background-image: linear-gradient(90deg, color-mix(in srgb, var(--hero) 15%, transparent) 0%, color-mix(in srgb, var(--hero) 55%, transparent) 30%, color-mix(in srgb, var(--hero) 93%, transparent) 47%, var(--hero) 58%), var(--hero-img);
    background-size: cover, cover; background-position: center, center; }
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-block: 18px; }
  .logo { font-family: var(--display); font-size: 26px; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .logo svg { width: 30px; height: 30px; flex: none; }
  .avail-line { margin: 22px 0 0; }
  .live[hidden], .avail-line .live[hidden] { display: none; }
  .avail-line .live { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--hero-line); padding: 6px 10px; border-radius: 4px; font-size: 13px; }
  .avail-line .live i { width: 8px; height: 8px; border-radius: 50%; background: #39d98a; }
  .avail-line .live[data-state="busy"] i { background: #ff8a7a; }
  .avail-line .live[data-state="urgent"] { border-color: #ff8a7a; font-weight: 700; } .avail-line .live[data-state="urgent"] i { background: #ff5a4a; box-shadow: 0 0 0 3px rgba(255, 90, 74, .35); }
  .avail-line .live[data-state="closed"] i { background: #a9bce6; }
  .live { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--hero-line); padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 14px; white-space: nowrap; }
  .live:hover { border-color: var(--hero-fg); }
  .hero-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: center; padding-block: 40px 72px; }
  .hero .tag { color: var(--hero-soft); }
  .hero h1 { font-size: clamp(44px, 7vw, 92px); margin: 14px 0 18px; overflow-wrap: anywhere; }
  .hero h1 span { color: #fff; background: var(--signal); padding: 0 .12em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .hero p { font-size: 19px; color: var(--hero-text); max-width: 34ch; margin: 0 0 28px; }
  .ctas { display: flex; gap: 10px; flex-wrap: wrap; }
  .facts { display: flex; gap: 28px; margin-top: 34px; padding-top: 18px; border-top: 1px dashed var(--hero-line); flex-wrap: wrap; }
  .facts b { display: block; font-family: var(--display); font-size: 30px; font-weight: 400; line-height: 1; }
  .facts span { color: var(--hero-soft); }
  .reel { margin: 0; justify-self: center; width: min(100%, 340px); }
  .reel-frame { position: relative; aspect-ratio: 4 / 5; border: 1.5px solid var(--hero-line-strong); padding: 8px; background: rgba(255,255,255,.04); }
  .reel-frame::before, .reel-frame::after { content: ""; position: absolute; width: 18px; height: 18px; border: 3px solid var(--signal); }
  .reel-frame::before { top: -6px; inset-inline-start: -6px; border-inline-end: 0; border-bottom: 0; }
  .reel-frame::after { bottom: -6px; inset-inline-end: -6px; border-inline-start: 0; border-top: 0; }
  .reel video { width: 100%; height: 100%; object-fit: cover; display: block; background: var(--deep); }
  .reel-toggle { position: absolute; bottom: 16px; inset-inline-start: 16px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: color-mix(in srgb, var(--deep) 85%, transparent); cursor: pointer; display: grid; place-items: center; }
  .reel-toggle::before { content: ""; width: 0; height: 0; border-block: 8px solid transparent; border-inline-start: 13px solid #fff; transform: scaleX(-1); }
  .reel-toggle[data-state=pause]::before { width: 12px; height: 16px; border: 0; transform: none; background: linear-gradient(90deg, #fff 0 4px, transparent 4px 8px, #fff 8px 12px); }
  .reel figcaption { color: var(--hero-soft); margin-top: 10px; text-align: center; }
  section { padding-block: 84px; }
  .head { display: flex; justify-content: space-between; align-items: end; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; }
  .head h2 { font-size: clamp(34px, 4.6vw, 56px); }
  .head .mono { color: var(--ink-soft); }
  .order { background: var(--surface); border: 1.5px solid var(--ink); }
  .order-top { display: grid; border-bottom: 1.5px solid var(--ink); }
  .order-top div { padding: 10px 14px; border-inline-start: 1px solid var(--rule); }
  .order-top div:first-child { border: 0; }
  .order-top b { display: block; font-family: var(--display); font-weight: 400; font-size: 18px; }
  .order table { width: 100%; border-collapse: collapse; font-size: 16px; }
  .order th { text-align: start; font-family: var(--mono); font-size: 12px; font-weight: 500; color: var(--ink-soft); padding: 12px 14px; border-bottom: 1px solid var(--rule); }
  .order td { padding: 14px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  .order tr:last-child td { border-bottom: 0; }
  .order td b { font-weight: 600; }
  .order td b a.svc-link { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .order td small { display: block; color: var(--ink-soft); font-size: 14px; }
  .order .price { font-size: 15px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .order button { border: 1.5px solid var(--accent); background: none; color: var(--accent); font: 600 14px var(--body); padding: 6px 12px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
  .order button:hover { background: var(--accent); color: #fff; }
  .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border-top: 1.5px solid var(--ink); }
  .step { padding: 22px 22px 0; border-inline-start: 1px solid var(--rule); }
  .step:first-child { border: 0; padding-inline-start: 0; }
  .step .mono { color: var(--signal); font-weight: 500; }
  .step h3 { font-size: 26px; margin: 8px 0 6px; }
  .step p { margin: 0; color: var(--ink-soft); }
  .area { background: var(--deep); color: #fff; }
  .area .head h2 { color: #fff; } .area .head .mono { color: var(--on-deep-soft); }
  .towns { display: flex; flex-wrap: wrap; gap: 8px; }
  .towns span { border: 1px solid var(--on-deep-line); padding: 8px 14px; border-radius: 4px; }
  .area-links { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 16px 0 0; }
  .area-links a { color: #fff; font-weight: 600; text-underline-offset: 4px; }
  .area .row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 40px; align-items: center; }
  .area p { color: var(--on-deep-text); margin: 0 0 20px; }
  footer { padding-block: 34px 90px; color: var(--ink-soft); font-size: 14px; }
  .crisis { margin: 0; padding: 12px 16px; text-align: center; background: var(--paper, #fff); color: var(--ink, #111); border-bottom: 1px solid var(--rule, #ddd); font-size: 15px; }
  footer .credit { margin: 14px 0 0; font-size: 12.5px; text-align: center; }
  footer .credit a { color: inherit; }
  footer .row { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-top: 1px solid var(--rule); padding-top: 20px; }
  .field { background-color: var(--deep); color: #fff; overflow: hidden;
    background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px); background-size: 24px 24px; }
  .field .head .mono { color: var(--on-deep-soft); }
  .field-grid { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 64px; align-items: start; }
  .field-grid.solo { grid-template-columns: minmax(0, 300px); justify-content: center; }
  .lanyard { display: flex; flex-direction: column; align-items: center; }
  .lanyard::before { content: ""; width: 34px; height: 90px; background: repeating-linear-gradient(180deg, var(--signal) 0 14px, color-mix(in srgb, var(--signal) 80%, #000) 14px 16px); clip-path: polygon(0 0, 100% 0, 70% 100%, 30% 100%); }
  .clip { width: 46px; height: 18px; border-radius: 4px; background: linear-gradient(180deg, #d8dde6, #9aa3b3); margin-top: -4px; position: relative; z-index: 1; }
  .badge { width: 100%; background: var(--surface); color: var(--ink); border-radius: 14px; padding: 16px; margin-top: -6px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.7); transform: rotate(-3deg); }
  .badge-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; color: var(--ink-soft); margin-bottom: 12px; }
  .badge-top b { color: var(--accent); font-family: var(--display); font-size: 16px; font-weight: 400; }
  .badge .ps { aspect-ratio: 1; border-radius: 10px; }
  .badge h3 { font-size: 30px; margin-top: 14px; }
  .badge p { margin: 2px 0 12px; color: var(--ink-soft); font-size: 15px; }
  .badge .code { height: 30px; background: repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 4px, var(--ink) 4px 7px, transparent 7px 9px); }
  .mono-letter { display: grid; place-items: center; color: #fff; font-family: var(--display); font-size: 120px; line-height: 1; background: linear-gradient(135deg, var(--ps-a), var(--ps-b)); }
  /* One to six work photos: rows of up to three (two and four in pairs), a short last row centred, never a hole. */
  .details { --cols: 3; --gap: 28px; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--gap); }
  .details.n1 { --cols: 1; } .details.n2, .details.n4 { --cols: 2; }
  .detail { flex: 0 0 calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols)); min-width: 0; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
  .detail .ring { width: 100%; max-width: 230px; aspect-ratio: 1; border-radius: 50%; padding: 8px; border: 2px dashed var(--on-deep-line-strong); position: relative; }
  .detail .ring::after { content: ""; position: absolute; width: 46px; height: 2px; background: var(--on-deep-line-strong); bottom: 10%; left: -30px; transform: rotate(-35deg); }
  .detail .ps { width: 100%; height: 100%; border-radius: 50%; }
  .detail .mono { color: var(--on-deep-soft); margin-top: 14px; }
  .detail h3 { font-size: 22px; margin-top: 2px; }
  .ps { position: relative; overflow: hidden; margin: 0; background: var(--ps-b); }
  .ps img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  @media (max-width: 880px) {
    /* on a phone the photo is a band at the top, in full, and the text starts below it */
    .hero.has-bg { background-image: linear-gradient(color-mix(in srgb, var(--hero) 60%, transparent) 0, transparent 20vw, transparent 40vw, var(--hero) 56.25vw), var(--hero-img);
      background-size: 100% 100%, 100% auto; background-position: top, top; background-repeat: no-repeat; }
    .hero.has-bg .hero-grid { padding-top: 36vw; }
    .hero.has-bg .hero-grid > div:empty { display: none; }
    .field-grid { grid-template-columns: minmax(0, 1fr); gap: 40px; } .lanyard { max-width: 300px; margin-inline: auto; }
    .hero-grid, .area .row { grid-template-columns: minmax(0, 1fr); }
    .reel { width: min(100%, 300px); }
    .steps { grid-template-columns: minmax(0, 1fr); }
    .step { border-inline-start: 0; border-top: 1px solid var(--rule); padding: 18px 0 0; }
    .step:first-child { border-top: 0; }
    .order .hide-sm { display: none; }
  }
  @media (max-width: 620px) { .details:not(.n1) { --cols: 2; --gap: 20px; } }
  .clips-sec { background: var(--paper); }
  .vclips { --cols: 3; --gap: 20px; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--gap); }
  .vclips.n1 { --cols: 1; } .vclips.n2 { --cols: 2; } .vclips.n4 { --cols: 4; }
  .vclip { margin: 0; flex: 0 0 calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols)); max-width: 340px; min-width: 0; }
  .vclip-frame { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 6px; background: var(--deep); }
  .vclip-frame img[data-src] { visibility: hidden; }
  .vclip-frame img, .vclip-frame video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .vclip-frame video { opacity: 0; } .vclip.on .vclip-frame video { opacity: 1; }
  .vclip figcaption { margin-top: 10px; text-align: center; color: var(--ink-soft); font-size: 15px; }
  @media (max-width: 620px) { .vclips:not(.n1) { --cols: 2; --gap: 12px; } .vclip .reel-toggle { bottom: 10px; inset-inline-start: 10px; } }
  .guides-sec { background: var(--surface); }
  .tst-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
  .tst-card { margin: 0; background: var(--surface); border: 1.5px solid var(--rule); border-radius: 6px; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
  .tst-stars { color: var(--signal); letter-spacing: 3px; font-size: 18px; }
  .tst-text { margin: 0; font-size: 17px; line-height: 1.6; overflow-wrap: anywhere; }
  .tst-by { margin-top: auto; display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; color: var(--ink-soft); font-size: 14px; }
  .tst-by b { color: var(--ink); font-weight: 600; }
  .gd-more { margin: 16px 0 0; } .gd-more a { font-weight: 700; color: var(--accent); text-underline-offset: 4px; }
  .save-contact { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; color: inherit; font-weight: 600; text-underline-offset: 4px; }
  .save-contact svg { width: 22px; height: 22px; flex: none; }
  .social { margin-top: 18px; }
  .social p { margin: 0 0 8px; font-weight: 600; }
  .social-links { display: flex; flex-wrap: wrap; gap: 10px; }
  .social-links a { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid currentColor; color: inherit; }
  .social-links a:hover { background: color-mix(in srgb, currentColor 16%, transparent); }
  .social-links svg { width: 22px; height: 22px; }
  .ba-sec { background: var(--surface); }
  .ba { position: relative; overflow: hidden; aspect-ratio: 4 / 3; max-width: 880px; margin-inline: auto; border: 1px solid var(--rule); border-radius: 6px; direction: ltr; user-select: none; touch-action: pan-y; background: var(--tint); }
  .ba > .ps, .ba-before > .ps { position: absolute; inset: 0; width: 100%; height: 100%; }
  .ba-before { position: absolute; inset: 0; clip-path: inset(0 calc(100% - var(--pos, 50%)) 0 0); z-index: 1; }
  .ba-range { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; margin: 0; cursor: ew-resize; z-index: 3; }
  .ba-line { position: absolute; top: 0; bottom: 0; left: var(--pos, 50%); width: 3px; margin-left: -1.5px; background: #fff; pointer-events: none; z-index: 4; }
  .ba-line::after { content: "⇆"; position: absolute; top: 50%; left: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: #fff; color: var(--ink); display: grid; place-items: center; font: 700 17px/1 var(--body); box-shadow: 0 6px 18px rgba(15,29,58,.25); }
  .ba-range:focus-visible + .ba-line::after { outline: 3px solid var(--signal); outline-offset: 3px; }
  .ba-tag { position: absolute; top: 12px; z-index: 4; padding: 5px 12px; border-radius: 4px; font: 700 13px/1.2 var(--body); direction: rtl; pointer-events: none; }
  .ba-tag.b { left: 12px; background: color-mix(in srgb, var(--ink) 72%, transparent); color: #fff; }
  .ba-tag.a { right: 12px; background: #fff; color: var(--ink); }
  .ba-cap { text-align: center; color: var(--ink-soft); margin: 14px 0 0; }
  @media (max-width: 520px) {
    .order-top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
    .order-top div:nth-child(3) { display: none; }
    .order td, .order th { padding-inline: 10px; }
    .order th:last-child, .order td:last-child { display: none; }
    .order td[colspan] { display: table-cell; }
    .order tbody tr { cursor: pointer; }
    .logo { font-size: 22px; }
  }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
`;

const DRAFT_CSS = `
  .sample-tag { position: absolute; z-index: 3; bottom: 12px; inset-inline-end: 12px; padding: 5px 12px; border-radius: 999px; background: rgba(17,17,24,.72); color: #fff; font: 600 12.5px/1.3 var(--body); }
  .ribbon { position: sticky; top: 0; z-index: 50; background: #1d1b2e; color: #fff; text-align: center; font: 600 14px var(--body); padding: 8px 16px; }
  .todo { display: inline-block; border: 0; border-radius: 8px; padding: 0 .35em; background: color-mix(in srgb, currentColor 10%, transparent); opacity: .72; font-style: normal; }
  .eg { text-decoration: underline dotted color-mix(in srgb, currentColor 45%, transparent); text-decoration-thickness: 2px; text-underline-offset: .2em; }
  .eg-row td { opacity: .82; }
  .eg-photo { position: relative; } .eg-photo > span { position: absolute; bottom: 8px; inset-inline-end: 8px; padding: 2px 9px; border-radius: 999px; background: rgba(17,17,24,.7); color: #fff; font: 600 11.5px/1.4 var(--body); }
  .eg-note { background: var(--tint); color: var(--ink-soft); padding: 3px 10px; border-radius: 999px; }
  .ps.ph { display: grid; place-items: center; text-align: center; color: var(--line-w); font: 600 14px/1.4 var(--body); border: 2px dashed var(--on-deep-line-strong); background: rgba(255,255,255,.06); }
  .badge .ps.ph { color: var(--ink-soft); border-color: var(--rule); background: var(--tint); }
  .ba .ps.ph { color: var(--ink-soft); border-color: var(--rule); background: var(--tint); border-radius: 0; }
  .ba.half > .ps.ph { padding-left: 50%; }
  .ba.half .ba-before > .ps.ph { padding-right: 50%; }
`;

// The guide items, on the main page and on guides.html. Fallbacks for the plainer legal pages.
const GUIDE_CSS = `
  .gd { display: grid; gap: 10px; }
  .gd details { background: #fff; border: 1.5px solid var(--rule, #c9d4e6); border-radius: 6px; scroll-margin-top: 20px; }
  .gd details[open] { border-color: var(--accent, #123a8c); }
  .gd summary { list-style: none; display: flex; gap: 10px; align-items: baseline; padding: 14px 16px; cursor: pointer; font-weight: 700; font-size: 17px; line-height: 1.35; color: var(--ink, #0f1d3a); }
  .gd summary::-webkit-details-marker { display: none; }
  .gd summary::after { content: "+"; margin-inline-start: auto; font-weight: 400; font-size: 22px; line-height: 1; color: var(--ink-soft, #4b5873); }
  .gd details[open] summary::after { content: "−"; }
  .gd summary:focus-visible { outline: 3px solid var(--signal, #cc2e26); outline-offset: 2px; }
  .gd-kind { flex: none; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: var(--tint, #eef2f9); color: var(--ink, #0f1d3a); }
  .gd-kind.now { background: var(--signal, #cc2e26); color: #fff; }
  .gd-body { padding: 0 16px 16px; font-size: 16px; line-height: 1.65; color: var(--ink, #0f1d3a); }
  .gd-body p { margin: 0 0 10px; }
  .gd-body ol { margin: 0 0 12px; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 8px; }
  .gd-body li { counter-increment: s; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; align-items: start; }
  .gd-body li::before { content: counter(s); width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 14px; background: var(--accent, #123a8c); color: #fff; }
  .gd-warn { border-inline-start: 4px solid var(--signal, #cc2e26); padding: 8px 12px; background: var(--paper, #f3f6fb); }
  .gd-cta { display: inline-block; margin-top: 18px; padding: 12px 18px; border-radius: 4px; background: var(--signal, #cc2e26); color: #fff; font-weight: 700; text-decoration: none; }
`;

const SERVICE_CSS = `
  .lead-in { font-size: 19px; }
  .svc-facts { border-collapse: collapse; width: 100%; margin: 18px 0; background: #fff; border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; }
  .svc-facts th, .svc-facts td { text-align: start; padding: 10px 14px; border-top: 1px solid var(--rule); }
  .svc-facts tr:first-child th, .svc-facts tr:first-child td { border-top: 0; }
  .svc-facts th { width: 38%; color: var(--soft); font-weight: 500; }
  .svc-facts td { font-weight: 700; }
  .svc-ctas { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .svc-alt { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1.5px solid var(--rule); border-radius: 10px; text-decoration: none; color: var(--ink); font-weight: 600; background: #fff; }
  .svc-note { color: var(--soft); font-size: 15px; }
  .social-links { display: flex; flex-wrap: wrap; gap: 10px; }
  .social-links a { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--rule); background: #fff; color: var(--link); }
  .social-links a:hover { border-color: var(--link); }
  .social-links svg { width: 22px; height: 22px; }
  .svc-steps { padding-inline-start: 22px; } .svc-steps li { margin: 6px 0; }
  .svc-more { list-style: none; padding: 0; display: grid; gap: 8px; }
  .svc-more li { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--rule); padding-bottom: 8px; }
  .svc-more span { color: var(--soft); white-space: nowrap; }
`;
const LEGAL_CSS = `
  .legal-credit { max-width: 760px; margin: 0 auto; padding: 0 20px 40px; color: var(--soft); font-size: 13px; text-align: center; }
  .legal-credit p { margin: 0; } .legal-credit a { color: inherit; }
  :root { --ink: #0c1f44; --soft: #4a5a78; --rule: #d9e1ee; --bg: #f3f6fb; --link: #1d4fb8; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 400 17px/1.7 "IBM Plex Sans Hebrew", system-ui, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 1.7rem; line-height: 1.25; margin: 8px 0 4px; }
  h2 { font-size: 1.15rem; margin: 28px 0 6px; }
  .meta { color: var(--soft); font-size: .9rem; margin: 0 0 20px; }
  a { color: var(--link); }
  a:focus-visible { outline: 3px solid var(--link); outline-offset: 2px; }
  .back { display: inline-block; margin-bottom: 8px; }
`;
