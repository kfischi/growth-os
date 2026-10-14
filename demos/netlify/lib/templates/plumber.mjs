// The plumber template for the site builder (docs/side-income/SITE_BUILDER.md).
// Built from clients/sample-plumber/. The chat fills FIELDS, SERVICES and TOWNS; it never writes HTML.
// render() escapes every value, so whatever the owner or the model typed can't break the page.
import { israeliPhone } from "../leads.mjs";
import { localBusiness } from "./schema.mjs";
import { LOOKS, LOOK_CSS, lookOf, cssVars, themeColor, catalog } from "./looks.mjs";
export { LOOKS, lookOf, catalog };
// The trade's guides (shared with the plumber demo): general know-how, no prices or promises of the owner.
import GUIDES from "../../../shared/guides/plumber.json" with { type: "json" };
export { GUIDE } from "./plumber-guide.mjs";
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
  ba_title: { label: "כותרת ללפני ואחרי", max: 40, kind: "text", hint: "מה רואים ואיפה, למשל: ניקוי סתימה בכיור, חדרה" },
  video_title: { label: "כותרת לסרטון", max: 34, kind: "text", hint: "מה רואים בסרטון, למשל: פתיחת סתימה במטבח" },
};

export const SERVICES = {
  min: 1, max: 6,
  item: { name: { max: 46, required: true }, detail: { max: 60 }, time: { max: 18 }, price: { max: 24 } },
  label: "שירותים ומחירים",
};
export const TOWNS = { min: 1, max: 12, itemMax: 22, label: "ישובים" };

export const PHOTOS = {
  hero: { label: "רקע לראש האתר", aspect: "16 / 9" },  // behind the top of the site, washed so the text stays readable
  portrait: { label: "תמונה של בעל העסק", aspect: "1 / 1" },
  work1: { label: "עבודה 1", title: "work1_title" },
  work2: { label: "עבודה 2", title: "work2_title" },
  work3: { label: "עבודה 3", title: "work3_title" },
  before: { label: "לפני", title: "ba_title" },  // with "after": a before/after slider on the site
  after: { label: "אחרי", title: "ba_title" },
};

export function emptyContent() {
  const c = {};
  for (const [k, f] of Object.entries(FIELDS)) c[k] = f.default || "";
  c.services = [];
  c.towns = [];
  c.look = "blueprint"; c.palette = "blue";  // the design, picked in the builder (looks.mjs)
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
  const note = [String(c.trade || "").trim() + (c.area ? " ב" + String(c.area).trim() : ""), owner, wa ? "וואטסאפ: " + wa.local : ""].filter(Boolean).join(". ");
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
 * @param opts.url       the site's address ("https://<host>/"), known at deploy: canonical links, og:url, sitemap.xml
 *                       and robots.txt. Without it (a draft, the repo copy) they are left out.
 * @param opts.credit    { name, url } the line at the bottom: "האתר נבנה ב-<name> · אתרים שבונים עסקים", or null
 * @param opts.now       Date, for the "updated" line
 * @returns {{ "index.html": string, "privacy.html": string, "accessibility.html": string }}
 */
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

export function render(c, { mode = "draft", assets = "assets/", photos = {}, leads = null, video = null, url = "", credit = null, now = new Date() } = {}) {
  const draft = mode === "draft";
  const L = lookOf(c);
  if (!draft) {
    const m = missing(c);
    if (m.length) throw new Error("missing: " + m.join(", "));
  }
  // An empty field: in a draft, a dashed box with what goes there; on a site, nothing.
  const v = (k) => {
    const val = String(c[k] || "").trim();
    if (val) return h(val);
    return draft ? `<span class="todo">${h(FIELDS[k].label)}</span>` : "";
  };
  const has = (k) => Boolean(String(c[k] || "").trim());
  const services = (c.services || []).slice(0, SERVICES.max);
  const towns = (c.towns || []).slice(0, TOWNS.max);
  const wa = israeliPhone(c.whatsapp), call = israeliPhone(c.phone) || wa;
  const waIntl = wa ? wa.intl : "";
  const callLocal = call ? call.local : "";
  const year = now.getFullYear();
  const updated = `${MONTHS[now.getMonth()]} ${year}`;
  const name = String(c.business_name || "").trim() || "העסק";
  const trade = String(c.trade || "").trim();
  const owner = String(c.owner_name || "").trim();
  const ownerFirst = firstName(owner) || "אנחנו";
  const showTime = services.some((s) => s.time), showPrice = services.some((s) => s.price);
  const ranges = Object.fromEntries(services.filter((s) => s.price).map((s) => [s.name, s.price]));
  const robots = draft ? '<meta name="robots" content="noindex, nofollow">\n' : "";
  const photo = (slot, alt, extra = "") => photos[slot]
    ? `<figure class="ps has-img"><img src="${h(photos[slot])}" alt="${h(alt)}" loading="lazy" decoding="async"${extra}></figure>`
    : draft ? `<figure class="ps ph"><span>${h(PHOTOS[slot].label)}<br>מעלים ב״תמונות״</span></figure>` : "";
  const area = String(c.area || "").trim();
  // The absolute address, only on the deployed site: what Google indexes as the one true page.
  const site = !draft && /^https:\/\/[a-z0-9.-]+\/$/.test(url || "") ? url : "";
  const ogPhoto = photos.hero || photos.work1 || photos.portrait;
  const ogImage = site && ogPhoto && !/^https?:/.test(ogPhoto) ? site + ogPhoto : "";
  const desc = `${trade} ב${area}: ${services.map((s) => s.name).slice(0, 3).join(", ")}. פותחים קריאה בצ׳אט.`;

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
    ? services.map((s) => `<tr><td><b>${h(s.name)}</b>${s.detail ? `<small>${h(s.detail)}</small>` : ""}</td>${showTime ? `<td class="hide-sm">${h(s.time || "")}</td>` : ""}${showPrice ? `<td class="price">${h(s.price || "לפי הצעת מחיר")}</td>` : ""}<td><button type="button" data-open-bot>לפתוח קריאה</button></td></tr>`).join("\n          ")
    : `<tr><td colspan="4"><span class="todo">${h(SERVICES.label)}</span></td></tr>`;

  const works = ["work1", "work2", "work3"].filter((s) => photos[s] || draft);
  const letters = ["א׳", "ב׳", "ג׳"];
  const details = works.map((s, i) => {
    const title = String(c[PHOTOS[s].title] || "").trim();
    return `<div class="detail"><div class="ring">${photo(s, title || `עבודה של ${name}`)}</div><span class="mono">פרט ${letters[i]}</span>${title ? `<h3>${h(title)}</h3>` : draft ? `<h3><span class="todo">כותרת לתמונה</span></h3>` : ""}</div>`;
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

  const steps = [
    ["שלב 1 · 30 שניות", "מתארים בצ׳אט", "מה התקלה, כמה דחוף ואיפה. בלי לחכות על הקו."],
    ["שלב 2 · מיד", "הפרטים אצלי", showPrice ? "מקבלים טווח מחיר, והפרטים מגיעים אליי בוואטסאפ." : "הפרטים מגיעים אליי בוואטסאפ, מסודרים."],
    [`שלב 3 · תוך ${String(c.response_time || "").trim() || "…"}`, "אני חוזר וקובע", "קובעים שעה, ומסכמים את המחיר לפני העבודה."],
  ].map(([t, h3, p]) => `<div class="step"><span class="mono">${h(t)}</span><h3>${h(h3)}</h3><p>${h(p)}</p></div>`).join("\n      ");

  // The line at the bottom of every page: who built the site, with a link home (the brand's name as the link, nothing more).
  const creditLine = credit && credit.name ? `<p class="credit">האתר נבנה ב-<a href="${draft || !credit.url ? "#" : h(credit.url)}" rel="noopener">${h(credit.name)}</a> · אתרים שבונים עסקים</p>` : "";
  const chips = services.map((s) => s.name).concat("משהו אחר");
  const bot = {
    whatsapp: waIntl || "972500000000",
    name: `${ownerFirst} · ${trade}`, subtitle: "עונה מיד, גם כשאני בשטח", initial: ownerFirst.slice(0, 1), launcher: "לפתוח קריאה",
    greet: `היי, כאן ${ownerFirst} 👋\nאני כנראה באמצע עבודה, אבל בצ׳אט הזה עונים מיד. כמה שאלות קצרות ואני חוזר אליכם.`,
  };

  const index = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${h(trade)}${area ? " ב" + h(area) : ""} · ${h(name)}${draft ? " · טיוטה" : ""}</title>
<meta name="description" content="${h(desc)}">
${robots}${site ? `<link rel="canonical" href="${h(site)}">
<meta property="og:url" content="${h(site)}">
` : ""}${ogImage ? `<meta property="og:image" content="${h(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
` : ""}<meta property="og:type" content="website">
<meta property="og:title" content="${h(name)} · ${h(trade)} ב${h(c.area || "")}">
<meta property="og:description" content="${h(desc)}">
<meta property="og:locale" content="he_IL">${draft ? "" : `
<script type="application/ld+json">${js(localBusiness({ ...c, services, towns }, { phone: call ? "+" + call.intl : "", description: desc, url: site, image: ogImage }))}</script>`}
<meta name="theme-color" content="${h(themeColor(L.look, L.p))}">
<link rel="icon" href="${draft ? "data:image/svg+xml," + encodeURIComponent(FAVICON) : "assets/favicon.svg"}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${L.look.fonts}&display=swap" rel="stylesheet">
<script src="${h(assets)}a11y.js" data-statement="${draft ? "" : "accessibility.html"}"></script>
<style>${CSS}${LOOK_CSS[L.id]}:root { ${cssVars(L.look, L.p)} }${GUIDE_CSS}${draft ? DRAFT_CSS : ""}</style>
</head>
<body class="look-${L.id}">
${draft ? '<div class="ribbon" role="note">טיוטה לאישור · האתר עוד לא באוויר</div>\n' : ""}
<header class="hero${photos.hero ? " has-bg" : ""}"${photos.hero ? ` style="--hero-img: url('${h(photos.hero)}')"` : ""}>
  <div class="wrap bar">
    <div class="logo"><svg viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" fill="currentColor"/></svg><span>${v("business_name")}</span></div>
    ${callLocal ? `<a class="live mono" href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>` : ""}
  </div>
  <div class="wrap hero-grid">
    <div>
      <div class="tag mono">${v("trade")} · ${v("area")}${has("hours") ? " · " + h(c.hours) : ""}</div>
      <h1><span>${v("headline_1")}</span>${has("headline_2") ? `<br><span>${h(c.headline_2)}</span>` : ""}</h1>
      <p>${v("intro")}</p>
      <div class="ctas">
        <button class="btn btn-signal" type="button" data-open-bot>לפתוח קריאה בצ׳אט</button>
        <a class="btn btn-ghost" href="#" data-wa="${h(`היי ${ownerFirst}, יש לי תקלה ואשמח שתחזור אליי.`)}">וואטסאפ ישיר</a>
      </div>
      <div class="facts mono">
        ${facts}
      </div>${leads ? `
      <p class="avail-line"><span class="live mono" data-avail hidden><i></i></span></p>` : ""}
    </div>
    ${video ? reel(video, String(c.video_title || "").trim()) : photos.hero ? "<div></div>" : L.look.visual({ h, v, has, c, callLocal, prettyPhone, draft, yearsHe })}
  </div>
</header>

<main>

<section>
  <div class="wrap">
    <div class="head"><h2>הקריאות הנפוצות</h2>${has("price_note") && showPrice ? `<span class="mono">${h(c.price_note)}</span>` : ""}</div>
    <div class="order">
      <div class="order-top mono" style="grid-template-columns: repeat(${top.length}, minmax(0, 1fr))">
        ${top.join("\n        ")}
      </div>
      <table>
        <thead><tr><th>תקלה</th>${showTime ? '<th class="hide-sm">זמן טיפול</th>' : ""}${showPrice ? "<th>טווח מחיר</th>" : ""}<th><span class="sr">פעולה</span></th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="field">
  <div class="wrap">
    <div class="head"><h2>מהשטח</h2>${works.length ? '<span class="mono">עבודות אחרונות</span>' : ""}</div>
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
        <div class="details">
          ${details}
        </div>
      </div>` : ""}
    </div>
  </div>
</section>
${ba}
<section>
  <div class="wrap">
    <div class="head"><h2>מה קורה כשפותחים קריאה</h2></div>
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
<section class="guides-sec" id="guides">
  <div class="wrap">
    <div class="head"><h2>מה עושים עד שמגיעים</h2><span class="mono">ועוד טיפים ושאלות שחוזרות</span></div>
    <div class="gd">
      ${GUIDES.items.filter((it) => it.kind === "now").map(guideItem).join("\n      ")}
    </div>
    <p class="gd-more"><a href="${draft ? "#" : "guides.html"}">לכל הטיפים והשאלות (${GUIDES.items.length})</a></p>
  </div>
</section>

<section class="area">
  <div class="wrap row">
    <div>
      <div class="head"><h2>אזורי שירות</h2>${has("radius_note") ? `<span class="mono">${h(c.radius_note)}</span>` : ""}</div>
      <div class="towns">${towns.length ? towns.map((t) => `<span>${h(t)}</span>`).join("") : `<span class="todo">${h(TOWNS.label)}</span>`}</div>
    </div>
    <div>
      <p>לא בטוחים אם אני מגיע אליכם? כתבו את הישוב בצ׳אט, ואחזור אליכם עם תשובה.</p>
      <button class="btn btn-signal" type="button" data-open-bot>לכתוב בצ׳אט</button>
      <a class="save-contact" href="${draft ? "#" : "contact.vcf"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 4v6M16 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>לשמור את ${h(name)} באנשי הקשר</a>
    </div>
  </div>
</section>

</main>

<footer class="wrap"><div class="row"><span>${h(name)} · ${h(trade)} · ${year}</span><span>הפרטים שמשאירים בצ׳אט משמשים רק כדי לחזור אליכם. <a href="${draft ? "#" : "privacy.html"}">פרטיות</a> · <a href="${draft ? "#" : "accessibility.html"}">הצהרת נגישות</a></span></div>${creditLine}</footer>

${video ? `<script>${REEL_JS}</script>
` : ""}<script src="${h(assets)}leadform.js"></script>
<script src="${h(assets)}leadbot.js"></script>
<script>
  const RANGES = ${js(ranges)};
  const SITE = ${js({ whatsapp: bot.whatsapp, leads })};
  const BOT = ${js(bot)};
  const bot = LeadBot.init({
    whatsapp: SITE.whatsapp, name: BOT.name, subtitle: BOT.subtitle, initial: BOT.initial, launcher: BOT.launcher, greet: BOT.greet,
    // נציג AI: a first look at the customer's photo, matched to this business's own price list (/api/estimate).
    estimate: SITE.leads ? { endpoint: SITE.leads.split("/api/lead/")[0] + "/api/estimate", slug: SITE.leads.split("/").pop() } : undefined,
    steps: [
      { key: "issue", label: "תקלה", ask: "מה צריך?", chips: ${js(chips)} },
      { key: "photo", label: "תמונה", ask: "יש תמונה של התקלה? זה עוזר לתת מחיר מדויק יותר.", photo: true },
      { key: "urgency", label: "דחיפות", ask: "כמה זה דחוף?", chips: ["עכשיו, יש מים על הרצפה", "היום", "השבוע"],
        tip: { when: (v) => v.startsWith("עכשיו"), id: "leak", text: "עד שנגיע: סגרו את הברז הראשי. אם המים קרובים לחשמל, הורידו קודם את המפסק בלוח." } },
      { key: "city", label: "ישוב", ask: "באיזה ישוב?", input: "text", placeholder: ${js(towns[0] ? "למשל: " + towns[0] : "ישוב")} },
      { key: "name", label: "שם", ask: "איך קוראים לכם?", input: "text", placeholder: "שם" },
      { key: "phone", label: "טלפון", ask: "לאיזה מספר לחזור?", input: "tel", placeholder: "050-1234567" },
      { key: "callback", label: "מתי לחזור", ask: "ומתי נוח שנחזור אליכם?", chips: ["עכשיו", "בעוד שעה", "היום אחרי 16:00", "היום אחרי 18:00", "מחר בבוקר"], show: (d) => !d.urgency.startsWith("עכשיו") },
    ],
    closing: (d) => ["תודה " + d.name.split(" ")[0] + "!", RANGES[d.issue] ? d.issue + " עולה בדרך כלל " + RANGES[d.issue] + ". המחיר הסופי אחרי אבחון." : "", d.urgency.startsWith("עכשיו") ? "עד שאגיע: סגרו את הברז הראשי." : "", "לחצו למטה, והפרטים יגיעו אליי בוואטסאפ."].filter(Boolean).join("\\n"),
    summary: (d) => "קריאה חדשה מהאתר\\nתקלה: " + d.issue + "\\nדחיפות: " + d.urgency + "\\nישוב: " + d.city + "\\nשם: " + d.name + "\\nטלפון: " + d.phone + (d.callback ? "\\nמתי לחזור: " + d.callback : ""),
    capture: SITE.leads ? {
      endpoint: SITE.leads,
      lead: (d) => ({ name: d.name, phone: d.phone, service: d.issue, callback: d.callback, message: "דחיפות: " + d.urgency + ". ישוב: " + d.city + "." }),
      saved: (d) => ["תודה " + d.name.split(" ")[0] + "! הקריאה אצלי, ואישור בדרך אליכם בוואטסאפ.", RANGES[d.issue] ? d.issue + " עולה בדרך כלל " + RANGES[d.issue] + ", והמחיר הסופי אחרי אבחון." : "", d.urgency.startsWith("עכשיו") ? "עד שאגיע: סגרו את הברז הראשי." : ""].filter(Boolean).join("\\n"),
    } : undefined,
  });
  document.querySelectorAll(".ba").forEach((b) => { const r = b.querySelector(".ba-range"); if (r) r.addEventListener("input", () => b.style.setProperty("--pos", r.value + "%")); });
  document.querySelectorAll(".order tbody tr").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("button")) bot.open(); }));
  if (SITE.leads) LeadForm.visit(SITE.leads.replace("/api/lead/", "/api/visit/")); // a number for the monthly report, no cookie
  if (SITE.leads) LeadForm.status(SITE.leads.replace("/api/lead/", "/api/status/")); // "available now": what the owner wrote in WhatsApp
  if (SITE.leads && LeadForm.testimonials) LeadForm.testimonials(SITE.leads.replace("/api/lead/", "/api/testimonials/")); // what customers wrote, shown at once
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
<p>כשפותחים קריאה בצ׳אט: שם, טלפון, סוג השירות, הדחיפות והישוב, ותמונה אם בחרתם לצרף. בנוסף נשמרים מאיזה עמוד הגעתם (למשל מגוגל או מפייסבוק) ומתי.</p>${leads ? "\n<p>תמונה שצירפתם עוברת גם לבדיקה ראשונה אוטומטית (שירות הבינה המלאכותית של Anthropic), כדי לתת לכם הערכה מהמחירון של העסק. היא לא נשמרת שם.</p>" : ""}${leads ? "\n<p>אנחנו סופרים כמה פעמים נכנסו לאתר, מאיפה, מאיזה סוג מכשיר ובאיזו שעה, וכמה לחצו על וואטסאפ, חיוג או הצ׳אט. כמספרים בלבד: בלי עוגיות, בלי כתובת IP ובלי שום פרט שמזהה אתכם.</p>" : ""}

<h2>למה</h2>
<p>רק כדי לחזור אליכם בעניין הקריאה${leads ? ", לשלוח לכם אישור בוואטסאפ" : ""} ולתאם את העבודה. לא שולחים לכם פרסומות, ולא מוכרים או מעבירים את הפרטים לאף אחד לצורך שיווק.</p>

<h2>אתם לא חייבים</h2>
<p>אין חובה למסור את הפרטים. בלי מספר טלפון לא נוכל לחזור אליכם, ואפשר תמיד להתקשר או לכתוב לנו בוואטסאפ ישירות.</p>

<h2>איפה הפרטים נשמרים</h2>
<p>${leads
    ? "במערכת מאובטחת שרק העסק ומי שמתחזק את האתר עבורו יכולים לגשת אליה. הודעות הוואטסאפ עוברות דרך השירות הרשמי של WhatsApp (Meta). הפרטים נשמרים עד שנתיים מיום הפנייה, ואז נמחקים."
    : "הפרטים מגיעים ישירות לוואטסאפ של העסק, דרך השירות של WhatsApp (Meta). האתר עצמו לא שומר אותם."}</p>

${leads ? `<h2>המלצות</h2>
<p>אחרי עבודה אנחנו יכולים לבקש מכם המלצה, פעם אחת. אם תכתבו, היא מופיעה באתר עם השם שבחרתם והדירוג, בלי טלפון. אפשר לבקש להסיר אותה בכל זמן.</p>

` : ""}<h2>עוגיות</h2>
<p>האתר לא משתמש בעוגיות (cookies): לא לפרסום, לא למעקב ולא לסטטיסטיקה. בדפדפן שלכם נשמרות רק ההגדרות שבחרתם בתפריט הנגישות${leads ? ", וסימון שהביקור והלחיצות כבר נספרו, עד שסוגרים את הלשונית" : ""}. הגופן של האתר נטען מ-Google Fonts, ולכן גוגל רואה את כתובת ה-IP שלכם.</p>

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
<p>אם משהו באתר לא נגיש לכם, נשמח לשמוע ולתקן. אפשר גם לפתוח קריאה בטלפון במקום בצ׳אט.</p>
<p>אחראי נגישות: ${h(owner)}${contact ? " · " + contact : ""}</p>`);

  const guidesPage = legal("טיפים ושאלות נפוצות", `
<p>מה עושים כשקורה משהו, איך מונעים את הפעם הבאה, ומה שואלים אותנו הכי הרבה. זה ידע כללי מהתחום. בכל מקרה של ספק, כתבו לנו.</p>
<div class="gd">
${GUIDES.items.map(guideItem).join("\n")}
</div>
<p><a class="gd-cta" href="./">לפתוח קריאה בצ׳אט</a></p>
<script>${GUIDE_JS}</script>`, `
<style>${GUIDE_CSS}</style>
<script type="application/ld+json">${js(faqSchema(GUIDES.items))}</script>`, "guides.html", true);

  // For Google: every page worth finding, and where the list is. Only with the real address.
  const today = now.toISOString().slice(0, 10);
  const seo = site ? {
    "robots.txt": `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`,
    "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["", "guides.html"].map((f) => `  <url><loc>${h(site + f)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`,
  } : {};
  return { "index.html": index, "privacy.html": privacy, "accessibility.html": accessibility, ...(draft ? {} : { "guides.html": guidesPage, "contact.vcf": vcard(c), ...seo }) };
}

export const HEADERS = `# Netlify headers for this site. Applied however the site is deployed (Git or CLI).
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=604800

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
    "שירותים:",
    ...(c.services || []).map((s) => `- ${s.name}${s.detail ? ` (${s.detail})` : ""}${s.price ? `: ${s.price}` : ""}${s.time ? `, ${s.time}` : ""}`),
    c.price_note && `${c.price_note}.`,
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

const REEL_JS = `(function () {
  var v = document.querySelector(".reel video"), b = document.querySelector(".reel-toggle");
  if (!v || !b) return;
  var c = navigator.connection || {};
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-still") || c.saveData || /2g/.test(c.effectiveType || "");
  var wanted = !calm;
  function show() { var on = !v.paused; b.dataset.state = on ? "pause" : "play"; b.setAttribute("aria-label", on ? "לעצור את הסרטון" : "להפעיל את הסרטון"); }
  function play() { v.preload = "auto"; var p = v.play(); if (p && p.catch) p.catch(function () { show(); }); }
  v.addEventListener("play", show); v.addEventListener("pause", show);
  b.addEventListener("click", function () { wanted = v.paused; if (wanted) play(); else v.pause(); });
  document.addEventListener("a11y-still", function () { wanted = false; v.pause(); }); // the accessibility menu (a11y.js)
  // Plays only while on screen, to save the visitor's battery and data.
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { if (e[0].isIntersecting) { if (wanted) play(); } else v.pause(); }).observe(v);
  else if (wanted) play();
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
  .area .row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 40px; align-items: center; }
  .area p { color: var(--on-deep-text); margin: 0 0 20px; }
  footer { padding-block: 34px 90px; color: var(--ink-soft); font-size: 14px; }
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
  .details { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .detail { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
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
  @media (max-width: 620px) { .details { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .detail:last-child:nth-child(odd) { grid-column: 1 / -1; max-width: 60%; margin-inline: auto; } }
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
  .ribbon { position: sticky; top: 0; z-index: 50; background: #1d1b2e; color: #fff; text-align: center; font: 600 14px var(--body); padding: 8px 16px; }
  .todo { display: inline-block; border: 1.5px dashed currentColor; border-radius: 4px; padding: 0 .3em; opacity: .75; font-style: normal; }
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
