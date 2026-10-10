// The plumber template for the site builder (docs/side-income/SITE_BUILDER.md).
// Built from clients/sample-plumber/. The chat fills FIELDS, SERVICES and TOWNS; it never writes HTML.
// render() escapes every value, so whatever the owner or the model typed can't break the page.
import { israeliPhone } from "../leads.mjs";
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
  video_title: { label: "כותרת לסרטון", max: 34, kind: "text", hint: "מה רואים בסרטון, למשל: פתיחת סתימה במטבח" },
};

export const SERVICES = {
  min: 1, max: 6,
  item: { name: { max: 46, required: true }, detail: { max: 60 }, time: { max: 18 }, price: { max: 24 } },
  label: "שירותים ומחירים",
};
export const TOWNS = { min: 1, max: 12, itemMax: 22, label: "ישובים" };

export const PHOTOS = {
  portrait: { label: "תמונה של בעל העסק", aspect: "1 / 1" },
  work1: { label: "עבודה 1", title: "work1_title" },
  work2: { label: "עבודה 2", title: "work2_title" },
  work3: { label: "עבודה 3", title: "work3_title" },
};

export function emptyContent() {
  const c = {};
  for (const [k, f] of Object.entries(FIELDS)) c[k] = f.default || "";
  c.services = [];
  c.towns = [];
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
export const STATIC_FILES = { "assets/favicon.svg": FAVICON }; // the other assets are copied from clients/sample-plumber/assets/

/**
 * @param c        content (FIELDS keys, services, towns)
 * @param opts.mode      "draft" | "site"
 * @param opts.assets    prefix for leadbot.js and leadform.js ("assets/" on a site, "/shared/" for a draft)
 * @param opts.photos    { slot: url } for the slots that have a photo
 * @param opts.leads     the lead system endpoint, or null (נוכחות package, or a draft)
 * @param opts.video     { src, poster } for the short silent video at the top, or null (then the drawing shows)
 * @param opts.now       Date, for the "updated" line
 * @returns {{ "index.html": string, "privacy.html": string, "accessibility.html": string }}
 */
export function render(c, { mode = "draft", assets = "assets/", photos = {}, leads = null, video = null, now = new Date() } = {}) {
  const draft = mode === "draft";
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
  const desc = `${trade} ב${String(c.area || "").trim()}: ${services.map((s) => s.name).slice(0, 3).join(", ")}. פותחים קריאה בצ׳אט.`;

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
  const portrait = photos.portrait ? photo("portrait", owner || name, ' style="object-position:50% 35%"')
    : draft ? photo("portrait", "") : `<div class="ps mono-letter" aria-hidden="true">${h(ownerFirst.slice(0, 1))}</div>`;

  const steps = [
    ["שלב 1 · 30 שניות", "מתארים בצ׳אט", "מה התקלה, כמה דחוף ואיפה. בלי לחכות על הקו."],
    ["שלב 2 · מיד", "הפרטים אצלי", showPrice ? "מקבלים טווח מחיר, והפרטים מגיעים אליי בוואטסאפ." : "הפרטים מגיעים אליי בוואטסאפ, מסודרים."],
    [`שלב 3 · תוך ${String(c.response_time || "").trim() || "…"}`, "אני חוזר וקובע", "קובעים שעה, ומסכמים את המחיר לפני העבודה."],
  ].map(([t, h3, p]) => `<div class="step"><span class="mono">${h(t)}</span><h3>${h(h3)}</h3><p>${h(p)}</p></div>`).join("\n      ");

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
<title>${h(name)} · ${h(trade)}${draft ? " · טיוטה" : ""}</title>
<meta name="description" content="${h(desc)}">
${robots}<meta property="og:type" content="website">
<meta property="og:title" content="${h(name)} · ${h(trade)} ב${h(c.area || "")}">
<meta property="og:description" content="${h(desc)}">
<meta property="og:locale" content="he_IL">
<meta name="theme-color" content="#0c2a68">
<link rel="icon" href="${draft ? "data:image/svg+xml," + encodeURIComponent(FAVICON) : "assets/favicon.svg"}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Secular+One&family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}${draft ? DRAFT_CSS : ""}</style>
</head>
<body>
${draft ? '<div class="ribbon" role="note">טיוטה לאישור · האתר עוד לא באוויר</div>\n' : ""}
<header class="hero">
  <div class="wrap bar">
    <div class="logo"><svg viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" fill="#fff"/></svg><span>${v("business_name")}</span></div>
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
      </div>
    </div>
    ${video ? reel(video, String(c.video_title || "").trim()) : DRAWING}
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

<section>
  <div class="wrap">
    <div class="head"><h2>מה קורה כשפותחים קריאה</h2></div>
    <div class="steps">
      ${steps}
    </div>
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
    </div>
  </div>
</section>

</main>

<footer class="wrap"><div class="row"><span>${h(name)} · ${h(trade)} · ${year}</span><span>הפרטים שמשאירים בצ׳אט משמשים רק כדי לחזור אליכם. <a href="${draft ? "#" : "privacy.html"}">פרטיות</a> · <a href="${draft ? "#" : "accessibility.html"}">הצהרת נגישות</a></span></div></footer>

${video ? `<script>${REEL_JS}</script>
` : ""}<script src="${h(assets)}leadform.js"></script>
<script src="${h(assets)}leadbot.js"></script>
<script>
  const RANGES = ${js(ranges)};
  const SITE = ${js({ whatsapp: bot.whatsapp, leads })};
  const BOT = ${js(bot)};
  const bot = LeadBot.init({
    whatsapp: SITE.whatsapp, name: BOT.name, subtitle: BOT.subtitle, initial: BOT.initial, launcher: BOT.launcher, greet: BOT.greet,
    steps: [
      { key: "issue", label: "תקלה", ask: "מה צריך?", chips: ${js(chips)} },
      { key: "urgency", label: "דחיפות", ask: "כמה זה דחוף?", chips: ["עכשיו, יש מים על הרצפה", "היום", "השבוע"] },
      { key: "city", label: "ישוב", ask: "באיזה ישוב?", input: "text", placeholder: ${js(towns[0] ? "למשל: " + towns[0] : "ישוב")} },
      { key: "name", label: "שם", ask: "איך קוראים לכם?", input: "text", placeholder: "שם" },
      { key: "phone", label: "טלפון", ask: "לאיזה מספר לחזור?", input: "tel", placeholder: "050-1234567" },
    ],
    closing: (d) => ["תודה " + d.name.split(" ")[0] + "!", RANGES[d.issue] ? d.issue + " עולה בדרך כלל " + RANGES[d.issue] + ". המחיר הסופי אחרי אבחון." : "", d.urgency.startsWith("עכשיו") ? "עד שאגיע: סגרו את הברז הראשי." : "", "לחצו למטה, והפרטים יגיעו אליי בוואטסאפ."].filter(Boolean).join("\\n"),
    summary: (d) => "קריאה חדשה מהאתר\\nתקלה: " + d.issue + "\\nדחיפות: " + d.urgency + "\\nישוב: " + d.city + "\\nשם: " + d.name + "\\nטלפון: " + d.phone,
    capture: SITE.leads ? {
      endpoint: SITE.leads,
      lead: (d) => ({ name: d.name, phone: d.phone, service: d.issue, message: "דחיפות: " + d.urgency + ". ישוב: " + d.city + "." }),
      saved: (d) => ["תודה " + d.name.split(" ")[0] + "! הקריאה אצלי, ואישור בדרך אליכם בוואטסאפ.", RANGES[d.issue] ? d.issue + " עולה בדרך כלל " + RANGES[d.issue] + ", והמחיר הסופי אחרי אבחון." : "", d.urgency.startsWith("עכשיו") ? "עד שאגיע: סגרו את הברז הראשי." : ""].filter(Boolean).join("\\n"),
    } : undefined,
  });
  document.querySelectorAll(".order tbody tr").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("button")) bot.open(); }));
  if (SITE.leads) LeadForm.visit(SITE.leads.replace("/api/lead/", "/api/visit/")); // a number for the monthly report, no cookie
</script>
</body>
</html>
`;

  const contact = callLocal ? `<a href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>` : "";
  const legal = (title, body) => `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${h(title)} · ${h(name)}</title>
${robots}<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<style>${LEGAL_CSS}</style>
</head>
<body>
<main>
<a class="back" href="./">חזרה לאתר</a>
<h1>${h(title)}</h1>
<p class="meta">${h(name)}, ${h(trade)} · עודכן: ${h(updated)}</p>
${body}
</main>
</body>
</html>
`;

  const privacy = legal("פרטיות", `
<h2>מה אנחנו אוספים</h2>
<p>כשפותחים קריאה בצ׳אט: שם, טלפון, סוג השירות, הדחיפות והישוב. בנוסף נשמרים מאיזה עמוד הגעתם (למשל מגוגל או מפייסבוק) ומתי.</p>${leads ? "\n<p>אנחנו סופרים כמה פעמים נכנסו לאתר ומאיפה, כמספר בלבד: בלי עוגיות, בלי כתובת IP ובלי שום פרט שמזהה אתכם.</p>" : ""}

<h2>למה</h2>
<p>רק כדי לחזור אליכם בעניין הקריאה${leads ? ", לשלוח לכם אישור בוואטסאפ" : ""} ולתאם את העבודה. לא שולחים לכם פרסומות, ולא מוכרים או מעבירים את הפרטים לאף אחד לצורך שיווק.</p>

<h2>אתם לא חייבים</h2>
<p>אין חובה למסור את הפרטים. בלי מספר טלפון לא נוכל לחזור אליכם, ואפשר תמיד להתקשר או לכתוב לנו בוואטסאפ ישירות.</p>

<h2>איפה הפרטים נשמרים</h2>
<p>${leads
    ? "במערכת מאובטחת שרק העסק ומי שמתחזק את האתר עבורו יכולים לגשת אליה. הודעות הוואטסאפ עוברות דרך השירות הרשמי של WhatsApp (Meta). הפרטים נשמרים עד שנתיים מיום הפנייה, ואז נמחקים."
    : "הפרטים מגיעים ישירות לוואטסאפ של העסק, דרך השירות של WhatsApp (Meta). האתר עצמו לא שומר אותם."}</p>

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

<h2>מצאתם בעיה?</h2>
<p>אם משהו באתר לא נגיש לכם, נשמח לשמוע ולתקן. אפשר גם לפתוח קריאה בטלפון במקום בצ׳אט.</p>
<p>אחראי נגישות: ${h(owner)}${contact ? " · " + contact : ""}</p>`);

  return { "index.html": index, "privacy.html": privacy, "accessibility.html": accessibility };
}

export const HEADERS = `# Netlify headers for this site. Applied however the site is deployed (Git or CLI).
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=604800
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

const DRAWING = `<svg class="drawing" viewBox="0 0 520 420" aria-hidden="true">
      <path class="p" d="M40 300 L170 225 L170 140 L300 65 L430 140"/>
      <path class="p" d="M170 225 L300 300 L300 360"/>
      <path class="p" d="M430 140 L430 230 L360 270"/>
      <g fill="#123a8c" stroke="#e8efff" stroke-width="3">
        <circle cx="170" cy="225" r="9"/><circle cx="170" cy="140" r="9"/><circle cx="300" cy="65" r="9"/>
        <circle cx="430" cy="140" r="9"/><circle cx="300" cy="300" r="9"/><circle cx="430" cy="230" r="9"/>
      </g>
      <g transform="translate(235 102)"><path d="M-14 -8 L14 8 M-14 8 L14 -8" stroke="#e8efff" stroke-width="3"/><path d="M0 0 L0 -22 M-10 -22 L10 -22" stroke="#e8efff" stroke-width="3" stroke-linecap="round"/></g>
      <circle cx="360" cy="270" r="6" fill="none" stroke="#e0362c" stroke-width="3"/>
      <path class="drop" d="M360 282 c-5 8 -7 12 -7 16 a7 7 0 0 0 14 0 c0 -4 -2 -8 -7 -16z"/>
      <path class="d" d="M40 330 L170 255"/><text x="70" y="318">Ø 3/4״</text>
      <path class="d" d="M200 140 L200 225"/><text x="208" y="190">85 ס״מ</text>
      <text x="318" y="52">לחץ 3.5 בר</text>
      <text x="372" y="300" fill="#ff8a80">נקודת נזילה</text>
      <text x="40" y="404">שרטוט: מטבח, דירה 3 חד׳ · גיליון 1/1</text>
    </svg>`;

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
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches || c.saveData || /2g/.test(c.effectiveType || "");
  var wanted = !calm;
  function show() { var on = !v.paused; b.dataset.state = on ? "pause" : "play"; b.setAttribute("aria-label", on ? "לעצור את הסרטון" : "להפעיל את הסרטון"); }
  function play() { v.preload = "auto"; var p = v.play(); if (p && p.catch) p.catch(function () { show(); }); }
  v.addEventListener("play", show); v.addEventListener("pause", show);
  b.addEventListener("click", function () { wanted = v.paused; if (wanted) play(); else v.pause(); });
  // Plays only while on screen, to save the visitor's battery and data.
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { if (e[0].isIntersecting) { if (wanted) play(); } else v.pause(); }).observe(v);
  else if (wanted) play();
})();`;

const CSS = `
  :root {
    --blueprint: #123a8c; --blueprint-deep: #0c2a68; --grid: rgba(255, 255, 255, .09); --line-w: #e8efff;
    --paper: #f3f6fb; --ink: #0f1d3a; --ink-soft: #4b5873; --rule: #c9d4e6; --signal: #cc2e26;
    --display: "Secular One", "IBM Plex Sans Hebrew", sans-serif; --body: "IBM Plex Sans Hebrew", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
    --bot-bg: #ffffff; --bot-fg: var(--ink); --bot-line: var(--rule); --bot-muted: var(--ink-soft);
    --bot-accent: var(--blueprint); --bot-accent-fg: #fff; --bot-them: #eef2f9; --bot-me: var(--blueprint); --bot-me-fg: #fff;
    --bot-font: var(--body); --bot-radius: 6px; --bot-radius-msg: 6px; --bot-radius-pill: 4px; --bot-radius-input: 4px;
    --ps-a: #2a56b8; --ps-b: #0c2a68; --ps-ui: var(--blueprint); --ps-edit: var(--signal);
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
  .btn-signal:hover { background: #c42a21; }
  .btn-ghost { border: 1.5px solid rgba(232, 239, 255, .5); color: #fff; background: transparent; }
  .btn-ghost:hover { border-color: #fff; }
  .hero { background: var(--blueprint); color: #fff; position: relative; overflow: hidden;
    background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
    background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px; }
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-block: 18px; }
  .logo { font-family: var(--display); font-size: 26px; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .logo svg { width: 30px; height: 30px; flex: none; }
  .live { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(232, 239, 255, .35); padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 14px; white-space: nowrap; }
  .live:hover { border-color: #fff; }
  .hero-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: center; padding-block: 40px 72px; }
  .hero .tag { color: #a9bce6; }
  .hero h1 { font-size: clamp(44px, 7vw, 92px); margin: 14px 0 18px; overflow-wrap: anywhere; }
  .hero h1 span { color: #fff; background: var(--signal); padding: 0 .12em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .hero p { font-size: 19px; color: #d5def3; max-width: 34ch; margin: 0 0 28px; }
  .ctas { display: flex; gap: 10px; flex-wrap: wrap; }
  .facts { display: flex; gap: 28px; margin-top: 34px; padding-top: 18px; border-top: 1px dashed rgba(232, 239, 255, .3); flex-wrap: wrap; }
  .facts b { display: block; font-family: var(--display); font-size: 30px; font-weight: 400; line-height: 1; }
  .facts span { color: #a9bce6; }
  .drawing { width: 100%; height: auto; max-width: 560px; justify-self: center; }
  .reel { margin: 0; justify-self: center; width: min(100%, 340px); }
  .reel-frame { position: relative; aspect-ratio: 4 / 5; border: 1.5px solid var(--line-w); padding: 8px; background: rgba(255,255,255,.04); }
  .reel-frame::before, .reel-frame::after { content: ""; position: absolute; width: 18px; height: 18px; border: 3px solid var(--signal); }
  .reel-frame::before { top: -6px; inset-inline-start: -6px; border-inline-end: 0; border-bottom: 0; }
  .reel-frame::after { bottom: -6px; inset-inline-end: -6px; border-inline-start: 0; border-top: 0; }
  .reel video { width: 100%; height: 100%; object-fit: cover; display: block; background: var(--blueprint-deep); }
  .reel-toggle { position: absolute; bottom: 16px; inset-inline-start: 16px; width: 44px; height: 44px; border-radius: 50%; border: 0; background: rgba(12,42,104,.85); cursor: pointer; display: grid; place-items: center; }
  .reel-toggle::before { content: ""; width: 0; height: 0; border-block: 8px solid transparent; border-inline-start: 13px solid #fff; transform: scaleX(-1); }
  .reel-toggle[data-state=pause]::before { width: 12px; height: 16px; border: 0; transform: none; background: linear-gradient(90deg, #fff 0 4px, transparent 4px 8px, #fff 8px 12px); }
  .reel figcaption { color: #a9bce6; margin-top: 10px; text-align: center; }
  .drawing .p { fill: none; stroke: var(--line-w); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .drawing .d { fill: none; stroke: #a9bce6; stroke-width: 1; stroke-dasharray: 4 4; }
  .drawing text { font-family: var(--mono); font-size: 13px; fill: #a9bce6; }
  .drawing .drop { fill: #7fb2ff; animation: drip 2.4s ease-in infinite; }
  @keyframes drip { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 80% { transform: translateY(46px); opacity: 1; } 100% { transform: translateY(52px); opacity: 0; } }
  section { padding-block: 84px; }
  .head { display: flex; justify-content: space-between; align-items: end; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; }
  .head h2 { font-size: clamp(34px, 4.6vw, 56px); }
  .head .mono { color: var(--ink-soft); }
  .order { background: #fff; border: 1.5px solid var(--ink); }
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
  .order button { border: 1.5px solid var(--blueprint); background: none; color: var(--blueprint); font: 600 14px var(--body); padding: 6px 12px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
  .order button:hover { background: var(--blueprint); color: #fff; }
  .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border-top: 1.5px solid var(--ink); }
  .step { padding: 22px 22px 0; border-inline-start: 1px solid var(--rule); }
  .step:first-child { border: 0; padding-inline-start: 0; }
  .step .mono { color: var(--signal); font-weight: 500; }
  .step h3 { font-size: 26px; margin: 8px 0 6px; }
  .step p { margin: 0; color: var(--ink-soft); }
  .area { background: var(--blueprint-deep); color: #fff; }
  .area .head h2 { color: #fff; } .area .head .mono { color: #a9bce6; }
  .towns { display: flex; flex-wrap: wrap; gap: 8px; }
  .towns span { border: 1px solid rgba(232, 239, 255, .35); padding: 8px 14px; border-radius: 4px; }
  .area .row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 40px; align-items: center; }
  .area p { color: #d5def3; margin: 0 0 20px; }
  footer { padding-block: 34px 90px; color: var(--ink-soft); font-size: 14px; }
  footer .row { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-top: 1px solid var(--rule); padding-top: 20px; }
  .field { background: var(--blueprint-deep); color: #fff; overflow: hidden;
    background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px); background-size: 24px 24px; }
  .field .head .mono { color: #a9bce6; }
  .field-grid { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 64px; align-items: start; }
  .field-grid.solo { grid-template-columns: minmax(0, 300px); justify-content: center; }
  .lanyard { display: flex; flex-direction: column; align-items: center; }
  .lanyard::before { content: ""; width: 34px; height: 90px; background: repeating-linear-gradient(180deg, var(--signal) 0 14px, #b8261e 14px 16px); clip-path: polygon(0 0, 100% 0, 70% 100%, 30% 100%); }
  .clip { width: 46px; height: 18px; border-radius: 4px; background: linear-gradient(180deg, #d8dde6, #9aa3b3); margin-top: -4px; position: relative; z-index: 1; }
  .badge { width: 100%; background: #fff; color: var(--ink); border-radius: 14px; padding: 16px; margin-top: -6px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.7); transform: rotate(-3deg); }
  .badge-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; color: var(--ink-soft); margin-bottom: 12px; }
  .badge-top b { color: var(--blueprint); font-family: var(--display); font-size: 16px; font-weight: 400; }
  .badge .ps { aspect-ratio: 1; border-radius: 10px; }
  .badge h3 { font-size: 30px; margin-top: 14px; }
  .badge p { margin: 2px 0 12px; color: var(--ink-soft); font-size: 15px; }
  .badge .code { height: 30px; background: repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 4px, var(--ink) 4px 7px, transparent 7px 9px); }
  .mono-letter { display: grid; place-items: center; color: #fff; font-family: var(--display); font-size: 120px; line-height: 1; background: linear-gradient(135deg, var(--ps-a), var(--ps-b)); }
  .details { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .detail { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
  .detail .ring { width: 100%; max-width: 230px; aspect-ratio: 1; border-radius: 50%; padding: 8px; border: 2px dashed rgba(232,239,255,.55); position: relative; }
  .detail .ring::after { content: ""; position: absolute; width: 46px; height: 2px; background: rgba(232,239,255,.55); bottom: 10%; left: -30px; transform: rotate(-35deg); }
  .detail .ps { width: 100%; height: 100%; border-radius: 50%; }
  .detail .mono { color: #a9bce6; margin-top: 14px; }
  .detail h3 { font-size: 22px; margin-top: 2px; }
  .ps { position: relative; overflow: hidden; margin: 0; background: var(--ps-b); }
  .ps img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  @media (max-width: 880px) {
    .field-grid { grid-template-columns: minmax(0, 1fr); gap: 40px; } .lanyard { max-width: 300px; margin-inline: auto; }
    .hero-grid, .area .row { grid-template-columns: minmax(0, 1fr); }
    .drawing { max-width: 420px; }
    .reel { width: min(100%, 300px); }
    .steps { grid-template-columns: minmax(0, 1fr); }
    .step { border-inline-start: 0; border-top: 1px solid var(--rule); padding: 18px 0 0; }
    .step:first-child { border-top: 0; }
    .order .hide-sm { display: none; }
  }
  @media (max-width: 620px) { .details { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .detail:last-child:nth-child(odd) { grid-column: 1 / -1; max-width: 60%; margin-inline: auto; } }
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
  .ps.ph { display: grid; place-items: center; text-align: center; color: #e8efff; font: 600 14px/1.4 var(--body); border: 2px dashed rgba(232,239,255,.5); background: rgba(255,255,255,.06); }
  .badge .ps.ph { color: var(--ink-soft); border-color: var(--rule); background: #eef2f9; }
`;

const LEGAL_CSS = `
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
