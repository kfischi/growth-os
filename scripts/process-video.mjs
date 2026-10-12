// Records the whole process as one landscape video, for the home page, WhatsApp and outreach:
// pick a trade, see its demo working, open the builder, pick a template and colours, answer the questions
// while the site fills up, add photos, look at the result, approve and hand over.
// The builder runs against the test fakes (scripts/tests/builder-fakes.mjs): no Supabase, no AI, no WhatsApp.
// Run: node scripts/process-video.mjs [out-dir]   (default demos/shared/video/process). Needs Playwright and ffmpeg.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { T, storage } from "./tests/builder-fakes.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(new URL("../demos", import.meta.url).pathname);
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "shared/video/process"));
const F = new URL("../demos/netlify/functions/", import.meta.url).href;
const builder = (await import(F + "builder.mjs")).default;
const draft = (await import(F + "draft.mjs")).default;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".mp4": "video/mp4", ".webm": "video/webm" };
const PORT = 8797, BASE = `http://localhost:${PORT}`;
const W = 1280, H = 720;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const send = async (r) => { res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); };
  const request = () => new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
  let m;
  if ((m = /^\/api\/builder\/(\w+)$/.exec(url.pathname))) return send(await builder(request(), { params: { action: m[1] } }));
  if ((m = /^\/draft\/([\w-]+)$/.exec(url.pathname))) return send(await draft(request(), { params: { id: m[1] } }));
  const f = path.join(ROOT, decodeURIComponent(url.pathname).replace(/\/$/, "/index.html"));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
}).listen(PORT);

// The overlays, on every page of the top window (not inside the draft's frame): a caption at the bottom with the
// step, an arrow that glides to what is about to be pressed, a ring where the finger taps, and full-screen cards
// between chapters. The studio's colours: plum and mint.
const OVERLAY = () => {
  if (window.top !== window) return;
  const css = `@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;700;900&display=swap');
  .__cap{position:fixed;z-index:2147483646;bottom:22px;left:50%;transform:translate(-50%,10px);max-width:min(780px,calc(100% - 40px));box-sizing:border-box;display:flex;align-items:center;gap:14px;
    padding:12px 20px 12px 14px;border-radius:16px;background:rgba(36,22,44,.93);color:#fff;font:700 22px/1.3 Rubik,system-ui,sans-serif;direction:rtl;text-align:start;
    box-shadow:0 18px 40px -14px rgba(0,0,0,.6);opacity:0;transition:opacity .35s,transform .35s;pointer-events:none}
  .__cap.on{opacity:1;transform:translate(-50%,0)}
  body:has(#work:not([hidden])) .__cap{bottom:auto;top:66px}
  .__cap .n{flex:none;display:grid;place-items:center;min-width:42px;height:42px;padding:0 8px;border-radius:12px;background:#0f7a6c;color:#fff;font:900 20px Rubik,sans-serif}
  .__cap small{display:block;font-weight:500;font-size:16px;color:#d8cfe0;margin-top:2px}
  .__tap{position:fixed;z-index:2147483647;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(15,122,108,.25);border:3px solid #0f7a6c;pointer-events:none;animation:__tap .6s ease-out forwards}
  @keyframes __tap{0%{transform:scale(.35);opacity:1}100%{transform:scale(1.3);opacity:0}}
  .__arrow{position:fixed;z-index:2147483647;width:58px;height:58px;pointer-events:none;opacity:0;transition:left .5s cubic-bezier(.2,.8,.2,1),top .5s cubic-bezier(.2,.8,.2,1),opacity .25s;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}
  .__arrow.on{opacity:1}.__arrow svg{width:100%;height:100%;animation:__bob .65s ease-in-out infinite alternate}
  @keyframes __bob{from{transform:translateY(0)}to{transform:translateY(var(--by))}}
  .__glow{position:fixed;z-index:2147483645;pointer-events:none;border-radius:14px;box-shadow:0 0 0 3px #0f7a6c,0 0 0 10px rgba(15,122,108,.22);opacity:0;transition:opacity .3s}
  .__glow.on{opacity:1}
  .__card{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#24162c;color:#fff;font-family:Rubik,system-ui,sans-serif;direction:rtl;text-align:center;opacity:0;transition:opacity .45s;pointer-events:none}
  .__card.on{opacity:1}
  .__card .in{display:grid;gap:14px;justify-items:center;padding:0 40px}
  .__card .n{font:900 26px Rubik,sans-serif;color:#7fd8c8;letter-spacing:.04em}
  .__card h2{margin:0;font:900 64px/1.05 Rubik,sans-serif;letter-spacing:-.02em}
  .__card p{margin:0;font:500 26px/1.4 Rubik,sans-serif;color:#d8cfe0;max-width:26ch}
  .__card .bar{display:flex;gap:8px;margin-top:10px}.__card .bar i{width:34px;height:6px;border-radius:3px;background:rgba(255,255,255,.18)}.__card .bar i.on{background:#0f7a6c}`;
  const boot = () => {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const cap = document.createElement("div"); cap.className = "__cap";
    const a = document.createElement("div"); a.className = "__arrow";
    a.innerHTML = '<svg viewBox="0 0 48 48"><path d="M24 44 L10 26 H19 V4 H29 V26 H38 Z" fill="#0f7a6c" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
    const g = document.createElement("div"); g.className = "__glow";
    const card = document.createElement("div"); card.className = "__card";
    document.body.append(g, a, cap, card);
    window.__cap = (n, t, sub) => new Promise((done) => {
      const key = n + t + (sub || "");
      if (cap.dataset.k === key) return done();
      const had = Boolean(cap.dataset.k);
      cap.classList.remove("on");
      setTimeout(() => {
        cap.dataset.k = key; cap.textContent = "";
        if (n) { const b = document.createElement("span"); b.className = "n"; b.textContent = n; cap.append(b); }
        const tx = document.createElement("span"); tx.textContent = t;
        if (sub) { const m = document.createElement("small"); m.textContent = sub; tx.append(m); }
        cap.append(tx); cap.classList.add("on"); done();
      }, had ? 330 : 0);
    });
    window.__uncap = () => { cap.classList.remove("on"); cap.dataset.k = ""; };
    window.__card = (n, title, sub, step, of) => {
      card.innerHTML = "";
      const inn = document.createElement("div"); inn.className = "in";
      if (n) { const e = document.createElement("div"); e.className = "n"; e.textContent = n; inn.append(e); }
      const h = document.createElement("h2"); h.textContent = title; inn.append(h);
      if (sub) { const e = document.createElement("p"); e.textContent = sub; inn.append(e); }
      if (of) { const bar = document.createElement("div"); bar.className = "bar"; for (let i = 1; i <= of; i++) { const x = document.createElement("i"); if (i <= step) x.className = "on"; bar.append(x); } inn.append(bar); }
      card.append(inn); card.classList.add("on");
    };
    window.__uncard = () => card.classList.remove("on");
    window.__point = (r) => {
      const up = r.top < 110, x = r.left + r.width / 2 - 29, y = up ? r.bottom + 8 : r.top - 64;
      a.style.left = x + "px"; a.style.top = y + "px"; a.style.setProperty("--by", up ? "-7px" : "7px");
      a.querySelector("svg").style.rotate = up ? "180deg" : "0deg";
      Object.assign(g.style, { left: r.left - 5 + "px", top: r.top - 5 + "px", width: r.width + 10 + "px", height: r.height + 10 + "px", borderRadius: Math.min(18, r.height / 2 + 5) + "px" });
      a.classList.add("on"); g.classList.add("on");
    };
    window.__unpoint = () => { a.classList.remove("on"); g.classList.remove("on"); };
    window.__tap = (x, y) => { const d = document.createElement("div"); d.className = "__tap"; d.style.left = x + "px"; d.style.top = y + "px"; document.body.appendChild(d); setTimeout(() => d.remove(), 700); };
  };
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);
};

const wait = (p, ms) => p.waitForTimeout(ms);
const cap = (p, n, t, sub) => p.evaluate(([n, t, sub]) => window.__cap(n, t, sub), [n, t, sub || ""]);
const STEPS = 9;
async function card(p, n, title, sub, ms = 2300) {
  await p.evaluate(() => window.__uncap());
  await p.evaluate(([n, t, s, k, of]) => window.__card(n, t, s, k, of), [n ? `שלב ${n}` : "", title, sub || "", n || 0, n ? STEPS : 0]);
  await wait(p, ms);
}
const uncard = async (p) => { await p.evaluate(() => window.__uncard()); await wait(p, 500); };

async function point(p, el, hold = 750) {
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const r = await el.evaluate((e) => { const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height, bottom: b.bottom }; });
  await p.evaluate((r) => window.__point(r), r);
  await wait(p, hold);
}
async function tap(p, el, hold) {
  if (typeof el === "string") el = p.locator(el).first();
  await point(p, el, hold);
  const b = await el.boundingBox();
  await p.evaluate(([x, y]) => window.__tap(x, y), [b.x + b.width / 2, b.y + b.height / 2]);
  await wait(p, 240);
  await p.evaluate(() => window.__unpoint());
  await el.click();
}
async function type(p, sel, text) {
  const el = p.locator(sel).first();
  await tap(p, el, 500);
  await el.pressSequentially(text, { delay: 85 });
  await wait(p, 300);
}
async function smoothScroll(p, to, ms = 1400, frame = null) {
  await (frame || p).evaluate(([to, ms]) => new Promise((done) => {
    const from = scrollY, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, from + (to - from) * e); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [to, ms]);
}
// The draft's frame, after it reloads with the last answer.
async function draftFrame(p) {
  await p.waitForFunction(() => { const f = document.querySelector("#frame"); return f && f.contentDocument && f.contentDocument.readyState === "complete" && f.contentDocument.querySelector(".hero"); }, null, { timeout: 15000 });
  await wait(p, 350);
  return p.frames().find((f) => /\/draft\//.test(f.url()));
}
const nextQ = (p, re) => p.waitForFunction((src) => new RegExp(src).test((document.querySelector("#guide .q") || {}).textContent || ""), re.source, { timeout: 15000 });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5, locale: "he-IL" });
await ctx.addInitScript(OVERLAY);
await ctx.addInitScript(() => { window.NR_VIDEO_CODEC = "vp9"; });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("page error:", e.message));
await p.route(/wa\.me|\/api\/(chat|lead|visit|status)/, (r) => r.abort());
await p.route(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/builder\//, (r) => {
  const key = new URL(r.request().url()).pathname.replace("/storage/v1/object/public/builder/", "");
  const buf = storage.get(key);
  return buf ? r.fulfill({ status: 200, contentType: key.endsWith(".jpg") ? "image/jpeg" : "image/webp", body: buf }) : r.fulfill({ status: 404 });
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "process-"));
const frames = [];
let cdp, endT = 0;
async function startRec() {
  cdp = await ctx.newCDPSession(p);
  cdp.on("Page.screencastFrame", async (f) => {
    const file = path.join(dir, String(frames.length).padStart(6, "0") + ".jpg");
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch { /* closing */ }
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: W * 1.5, maxHeight: H * 1.5, everyNthFrame: 1 });
}
// A new page in the same tab keeps the screencast; this waits for the overlays and the fonts.
async function go(url) {
  await p.goto(BASE + url, { waitUntil: "networkidle" });
  await p.evaluate(async () => { await document.fonts.ready; document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }); });
  await wait(p, 300);
}

try {
  /* ---------- opening ---------- */
  await go("/");
  await p.evaluate(() => window.__card("", "איך בונים אתר אצלנו", "בלי שיחות ובלי לחכות לאף אחד. ככה זה עובד, מההתחלה עד הסוף."));
  await wait(p, 600);
  await startRec();
  await wait(p, 3200);

  /* ---------- 1. the trade ---------- */
  await card(p, 1, "בוחרים את המקצוע", "16 תחומים, לכל אחד דמו משלו");
  await uncard(p);
  const demosY = await p.evaluate(() => document.querySelector("#demos").getBoundingClientRect().top + scrollY - 70);
  await cap(p, "1", "בוחרים את התחום שלכם", "אינסטלטור, חשמלאי, מיזוג, מורה ועוד");
  await smoothScroll(p, demosY, 1800); await wait(p, 1500);
  await tap(p, '#demos a.demo[href="plumber/"]', 1100);
  await p.waitForURL(/\/plumber\/$/); await p.evaluate(() => document.fonts.ready); await wait(p, 300);

  /* ---------- 2. the demo ---------- */
  await card(p, 2, "רואים את האתר עובד", "דמו של עסק בדוי, באותה תבנית שתקבלו");
  await uncard(p);
  await cap(p, "2", "ככה האתר שלכם ייראה", "השירותים, המחירים והאזורים שלכם");
  await wait(p, 1600);
  await smoothScroll(p, 760, 1800); await wait(p, 1100); await smoothScroll(p, 0, 1200); await wait(p, 400);
  await cap(p, "2", "הנציג עונה ללקוחות שלכם מיד", "גם כשאתם באמצע עבודה");
  await tap(p, ".lb-launch", 1300);
  for (let i = 0; i < 3; i++) { // the job, the photo (skipped), how urgent
    await p.waitForSelector(".lb-panel .lb-chips button", { timeout: 8000 }); await wait(p, 900);
    await tap(p, ".lb-panel .lb-chips button >> nth=0", 600);
  }
  await wait(p, 1800);
  await tap(p, ".lb-launch", 500);
  await wait(p, 500);

  /* ---------- 3. into the builder ---------- */
  await go("/");
  await card(p, 3, "נכנסים לבונה האתרים", "שם וטלפון, ומתחילים");
  await uncard(p);
  await cap(p, "3", "לוחצים \"לבנות את האתר שלי\"");
  await tap(p, '.hero a[href="build/"]', 1100);
  await p.waitForURL(/\/build\/$/); await p.evaluate(() => document.fonts.ready); await wait(p, 600);
  await cap(p, "3", "שם וטלפון, וזהו", "בלי שיחת היכרות ובלי טופס ארוך");
  await type(p, "#fName", "אורן לוי");
  await type(p, "#fPhone", "052-6359513");
  await tap(p, "#fConsent", 500);
  await tap(p, "#startForm button[type=submit]", 700);
  await p.waitForSelector("#work:not([hidden])");
  await draftFrame(p); await wait(p, 900);

  /* ---------- 4. the template ---------- */
  await card(p, 4, "בוחרים תבנית", "שלוש תבניות. כל בחירה מופיעה מיד באתר");
  await uncard(p);
  await cap(p, "4", "בוחרים תבנית, ורואים אותה מיד", "האתר שלכם מצד שמאל");
  await wait(p, 900);
  for (const look of ["van", "certificate"]) {
    await tap(p, `#guide .look[data-look="${look}"]`, 800);
    await p.waitForSelector(`#guide .look[data-look="${look}"][aria-pressed=true]`); await draftFrame(p); await wait(p, 1700);
  }

  /* ---------- 5. the colours ---------- */
  await card(p, 5, "בוחרים צבעים", "לכל תבנית ארבע ערכות צבעים");
  await uncard(p);
  await cap(p, "5", "לוחצים על ערכת צבעים", "ואפשר להחליף בכל רגע");
  for (const pal of ["navy", "plum", "green"]) {
    await tap(p, `#guide .pal[data-palette="${pal}"]`, 650);
    await p.waitForSelector(`#guide .pal[data-palette="${pal}"][aria-pressed=true]`); await draftFrame(p); await wait(p, 1300);
  }
  await tap(p, "#guide > .btn", 600);
  await nextQ(p, /איך קוראים לעסק/);

  /* ---------- 6. the questions ---------- */
  await card(p, 6, "עונים על כמה שאלות", "בוחרים תשובה, והאתר מתמלא מול העיניים");
  await uncard(p);
  await cap(p, "6", "שם העסק");
  await type(p, "#guide .other input", "אורן מים");
  await tap(p, "#guide .other button", 400);
  await nextQ(p, /באיזה אזור/); await draftFrame(p); await wait(p, 700);
  await cap(p, "6", "אזור וישובים", "בלחיצה, בלי להקליד");
  await tap(p, "#guide .chip >> nth=0", 600);
  await nextQ(p, /לאילו ישובים/); await wait(p, 900);
  await tap(p, "#guide > .btn", 600);
  await nextQ(p, /מה אתם עושים/); await draftFrame(p); await wait(p, 500);
  await cap(p, "6", "השירותים שלכם", "מסמנים מהרשימה, ומה שחסר מוסיפים");
  for (const i of [0, 1, 2, 3]) await tap(p, `#guide .chip >> nth=${i}`, 350);
  await tap(p, "#guide > .btn", 500);
  await nextQ(p, /להציג מחירים/); await draftFrame(p); await wait(p, 600);
  await cap(p, "6", "מחירים, רק אם רוצים", "טווחים לדוגמה. משאירים רק מה שנכון אצלכם");
  await wait(p, 1200);
  await tap(p, "#guide .row .btn", 500);
  await nextQ(p, /תוך כמה זמן/); await draftFrame(p); await wait(p, 600);
  await cap(p, "6", "תוך כמה זמן אתם חוזרים ללקוח");
  await tap(p, "#guide .chip >> nth=0", 500);
  await nextQ(p, /מתי אתם עובדים/); await draftFrame(p);
  await cap(p, "6", "שעות, שנים ואחריות", "רק מה שנכון. מה שלא בוחרים, לא מופיע");
  await tap(p, "#guide .chip >> nth=1", 400); await nextQ(p, /כמה שנים/); await draftFrame(p);
  await tap(p, "#guide .chip >> nth=4", 400); await nextQ(p, /אחריות/); await draftFrame(p);
  await tap(p, "#guide .chip >> nth=2", 400); await nextQ(p, /איזו כותרת/); await draftFrame(p); await wait(p, 500);
  await cap(p, "6", "כותרת ופסקת פתיחה", "בוחרים נוסח מוכן, או כותבים לנו בצ׳אט");
  await tap(p, "#guide .chip.card >> nth=1", 700); await nextQ(p, /פסקת פתיחה/); await draftFrame(p); await wait(p, 700);
  await tap(p, "#guide .chip.card >> nth=0", 700); await nextQ(p, /תמונות/); await draftFrame(p); await wait(p, 600);

  /* ---------- 7. photos ---------- */
  await card(p, 7, "מעלים תמונות", "תמונה שלכם ושל העבודה, ואם יש, גם סרטון קצר");
  await uncard(p);
  await cap(p, "7", "תמונות מהטלפון", "מוקטנות לבד, בלי פרטי מיקום");
  await tap(p, "#guide .row .btn", 600);
  await wait(p, 500);
  await tap(p, "#rights", 500);
  const PH = path.join(ROOT, "shared/photos");
  const slots = [["1", "plumber-portrait.webp"], ["2", "plumber-leak.webp"], ["3", "plumber-drain.webp"], ["4", "plumber-siphon.webp"]];
  for (const [n, file] of slots) {
    const input = p.locator(`#slots .slot:nth-child(${n}) input`);
    await point(p, p.locator(`#slots .slot:nth-child(${n})`), 450);
    await p.evaluate(() => window.__unpoint());
    if (fs.existsSync(path.join(PH, file))) await input.setInputFiles(path.join(PH, file));
    await p.waitForSelector(`#slots .slot:nth-child(${n}) img`, { timeout: 10000 }).catch(() => {});
    await wait(p, 500);
  }
  await draftFrame(p); await wait(p, 900);

  /* ---------- 8. the result ---------- */
  await card(p, 8, "ככה האתר נראה", "הטיוטה מתעדכנת אחרי כל תשובה");
  await uncard(p);
  await cap(p, "8", "הטיוטה שלכם, בדיוק כמו שתעלה");
  let fr = await draftFrame(p);
  const tall = await fr.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await smoothScroll(p, Math.min(tall, 2600), 6500, fr); await wait(p, 900);
  await smoothScroll(p, 0, 2000, fr); await wait(p, 600);
  await cap(p, "8", "רוצים עיצוב אחר? משנים בכל רגע", "בכפתור \"עיצוב\" מתחת לשיחה");
  await tap(p, "#design summary", 700);
  await wait(p, 600);
  await tap(p, '#designBox .look[data-look="blueprint"]', 700); await draftFrame(p); await wait(p, 1500);
  await tap(p, '#designBox .pal[data-palette="green"]', 700); await draftFrame(p); await wait(p, 1500);
  await tap(p, '#designBox .look[data-look="certificate"]', 700); await draftFrame(p); await wait(p, 1000);
  await tap(p, '#designBox .pal[data-palette="green"]', 500); await draftFrame(p); await wait(p, 700);
  await p.evaluate(() => { document.querySelector("#design").open = false; });

  /* ---------- 9. approve and hand over ---------- */
  await card(p, 9, "מאשרים ומעבירים לביצוע", "בוחרים חבילה, ואנחנו מעלים את האתר לאוויר");
  await uncard(p);
  await cap(p, "9", "הכול מוכן? מאשרים את האתר");
  const missing = await p.evaluate(() => document.querySelector("#approveBox .btn") && document.querySelector("#approveBox .btn").disabled);
  if (missing) throw new Error("the draft still misses something: " + (await p.textContent("#approveBox")));
  await tap(p, "#approveBox .btn", 900);
  await wait(p, 600);
  await cap(p, "9", "בוחרים חבילה", "נציג AI, או נוכחות בלבד");
  await point(p, p.locator(".pkg >> nth=0"), 1600);
  await p.evaluate(() => window.__unpoint());
  await tap(p, "#approveGo", 900);
  await p.waitForFunction(() => /חשבונית/.test(document.querySelector("#approveBox").textContent + document.querySelector("#log").textContent), null, { timeout: 10000 }).catch(() => {});
  await wait(p, 600);
  await cap(p, "9", "חשבונית ופרטי תשלום מגיעים בוואטסאפ", "אחרי התשלום אנחנו מעלים את האתר, ושולחים לכם את הקישור");
  await point(p, p.locator("#approveBox"), 3200);
  await p.evaluate(() => window.__unpoint());

  /* ---------- closing ---------- */
  await p.evaluate(() => window.__uncap());
  await p.evaluate(() => window.__card("", "נחיתה רכה", "אתרים שבונים עסקים. מתחילים בכתובת service-pro-web.netlify.app/build"));
  await wait(p, 3600);
  endT = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
} finally {
  await ctx.close(); await browser.close(); server.close();
}

// Frames come only when something changes: each one lasts until the next.
// The last one lasts until the recording stopped (a card that doesn't move sends no new frames).
const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, ((frames[i + 1] || { t: Math.max(endT, f.t + 0.6) }).t - f.t)).toFixed(3)}`).join("\n") + `\nfile '${frames.at(-1).file}'\n`;
fs.writeFileSync(path.join(dir, "list.txt"), list);
fs.mkdirSync(OUT, { recursive: true });
const out = path.join(OUT, "process.mp4");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
  "-vf", `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "24", "-movflags", "+faststart", "-an", out]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", "1", "-i", out, "-frames:v", "1", "-vf", "scale=960:-2", "-c:v", "libwebp", "-quality", "78", path.join(OUT, "process-poster.webp")]);
fs.rmSync(dir, { recursive: true, force: true });
const secs = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim();
console.log(`${out} · ${Number(secs).toFixed(1)} s · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · ${frames.length} frames · drafts ${T.ls_drafts.length}`);
