// The whole process as one landscape video (1920x1080), hand in hand from the first click to the site in the air:
// the trade, the demo, the builder, the template, the colours, the questions, the photos, the check, the approval,
// and the address, the card payment and the site live by itself with its first enquiry. The real pages run in a browser window on a stage (scripts/video-stage.html):
// a panel explains every step and names the next one, a rail shows all ten, a camera zooms in on each action,
// and an arrow shows what to press. The builder runs against the test fakes: no Supabase, no AI, no WhatsApp,
// a fake Grow (its payment page is a plain stand-in, not Grow's own), and the publish goes to fake GitHub and Netlify.
// Run: node scripts/process-video.mjs [out-dir]   (default demos/shared/video/process). Needs Playwright and ffmpeg.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { T, storage, ai, nl } from "./tests/builder-fakes.mjs";
// Payment and hosting as on the real site: a fake Grow behind lib/grow.mjs, the fake Netlify with our domain's zone.
Object.assign(process.env, { GROW_USER_ID: "u-film", GROW_PAGE_CODE: "pc-film", GROW_SANDBOX: "1", NETLIFY_TOKEN: "nf-test", SITES_DOMAIN: "easylanding.co.il" });
nl.zones.push({ id: "z-film", name: "easylanding.co.il" });
const grow = { processes: new Map(), n: 0 };
const fakeFetch = globalThis.fetch;
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url);
  if (u.host !== "sandbox.meshulam.co.il") return fakeFetch(url, opt);
  const f = Object.fromEntries(opt.body.entries()), name = u.pathname.split("/").pop();
  const ok = (data) => new Response(JSON.stringify({ status: 1, data }));
  if (name === "createPaymentProcess") { const id = String(++grow.n); grow.processes.set(id, { sum: Number(f.sum), paid: false, back: f.successUrl }); return ok({ url: "https://sandbox.meshulam.co.il/pay/" + id, processId: id, processToken: "t" + id }); }
  if (name === "getPaymentProcessInfo") { const g = grow.processes.get(f.processId); return ok({ transactions: g.paid ? [{ transactionId: "tx" + f.processId, asmachta: "A1", sum: g.sum, cardToken: "card", cardSuffix: "4580" }] : [] }); }
  return ok({});
};
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(new URL("../demos", import.meta.url).pathname);
const STAGE = fs.readFileSync(new URL("./video-stage.html", import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "shared/video/process"));
const F = new URL("../demos/netlify/functions/", import.meta.url).href;
const builder = (await import(F + "builder.mjs")).default;
const draft = (await import(F + "draft.mjs")).default;
const plumber = await import(new URL("../demos/netlify/lib/templates/plumber.mjs", import.meta.url).href);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".mp4": "video/mp4", ".webm": "video/webm" };
const PORT = 8797, BASE = `http://localhost:${PORT}`;
const W = 1920, H = 1080;
// The window on the stage: where the site sits, and its size at rest.
const VIEW = { x: 48, y: 150 + 46, w: 1240, h: 775 }, APP = { w: 1280, h: 800 }, S0 = VIEW.w / APP.w;

// The live site at the end: the approved draft, rendered as the real site would be.
function liveSite() {
  const d = T.ls_drafts.at(-1);
  const photos = Object.fromEntries(Object.entries(d.photos || {}).map(([slot, p]) => [slot, "/__live/p/" + p.path]));
  return plumber.render(d.content, { mode: "site", assets: "/shared/", photos })["index.html"];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const send = async (r) => { res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); };
  const request = () => new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
  let m;
  if (url.pathname === "/__stage") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(STAGE); }
  if (url.pathname === "/__live/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(liveSite()); }
  if ((m = /^\/__live\/p\/(.+)$/.exec(url.pathname))) { const b = storage.get(decodeURIComponent(m[1])); res.writeHead(b ? 200 : 404, { "content-type": "image/webp" }); return res.end(b); }
  if ((m = /^\/api\/builder\/([\w-]+)$/.exec(url.pathname))) { const r = await builder(request(), { params: { action: m[1] } }); return send(r); }
  if ((m = /^\/draft\/([\w-]+)$/.exec(url.pathname))) return send(await draft(request(), { params: { id: m[1] } }));
  const f = path.join(ROOT, decodeURIComponent(url.pathname).replace(/\/$/, "/index.html"));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
}).listen(PORT);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "he-IL" });
await ctx.addInitScript(() => { window.NR_VIDEO_CODEC = "vp9"; });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("page error:", e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
await p.route(/wa\.me|\/api\/(chat|lead|visit|status)/, (r) => r.abort());
// The card payment page: a plain stand-in (the real one is Grow's). Paying sends the owner back to the builder.
await p.route(/^https:\/\/sandbox\.meshulam\.co\.il\/pay\/(\d+)/, (r) => {
  const id = /pay\/(\d+)/.exec(r.request().url())[1], g = grow.processes.get(id);
  if (r.request().method() === "POST" || new URL(r.request().url()).searchParams.get("go")) {
    // Chrome won't let a public page send the frame to localhost, so the stage does it, as Grow's redirect would.
    g.paid = true; r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><title>תשלום מאובטח</title>" });
    return p.evaluate((u) => { document.getElementById("app").src = u; }, g.back);
  }
  return r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>תשלום מאובטח</title>
<style>body{margin:0;font:400 17px/1.5 Rubik,system-ui,sans-serif;background:#f3f4f7;color:#1b1d29;display:grid;place-items:center;min-height:100vh}
.c{background:#fff;border-radius:16px;box-shadow:0 20px 50px -30px rgba(0,0,0,.4);padding:28px 30px;width:min(420px,92vw)}
h1{font-size:20px;margin:0 0 4px}.s{color:#5b5f72;margin:0 0 18px;font-size:15px}.sum{font-size:30px;font-weight:700;margin:0 0 18px}
label{display:block;font-size:14px;color:#5b5f72;margin:10px 0 4px}.f{border:1px solid #d5d8e2;border-radius:10px;padding:10px 12px;direction:ltr;text-align:left;font-family:monospace}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}a.pay{display:block;margin-top:20px;text-align:center;background:#1b1d29;color:#fff;border-radius:12px;padding:14px;text-decoration:none;font-weight:700}
.lock{margin-top:12px;font-size:13px;color:#5b5f72;text-align:center}</style>
<div class="c"><h1>תשלום מאובטח</h1><p class="s">Easy Landing · הקמת אתר</p><p class="sum">${g.sum.toLocaleString("he-IL")} ₪ <small style="font-size:14px;font-weight:400">כולל מע״מ</small></p>
<label>מספר כרטיס</label><div class="f">4580 •••• •••• 1234</div><div class="row"><div><label>תוקף</label><div class="f">12/28</div></div><div><label>CVV</label><div class="f">•••</div></div></div>
<a class="pay" href="?go=1">לשלם</a><p class="lock">החשבונית נשלחת אליכם מיד אחרי התשלום</p></div></html>` });
});
await p.route(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/builder\//, (r) => {
  const key = new URL(r.request().url()).pathname.replace("/storage/v1/object/public/builder/", "");
  const buf = storage.get(key);
  return buf ? r.fulfill({ status: 200, contentType: key.endsWith(".jpg") ? "image/jpeg" : "image/webp", body: buf }) : r.fulfill({ status: 404 });
});
await p.goto(BASE + "/__stage", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);

// PACE scales the pauses for reading; the camera keeps its own timing, so the zoom is always measured at rest.
const PACE = 0.78;
const raw = (ms) => p.waitForTimeout(ms);
const wait = (ms) => p.waitForTimeout(Math.round(ms * PACE));
const st = (fn, ...a) => p.evaluate(([fn, a]) => window.stage[fn](...a), [fn, a]);
const app = () => p.frame({ name: "app" });
// The draft: a /draft/ page at first, then written in place through srcdoc (build/index.html refreshFrame).
const draftFrame = () => p.frames().find((f) => f.parentFrame() === app() && /\/draft\/|^about:srcdoc/.test(f.url()));
const A = (sel) => app().locator(sel).first();
const D = (sel) => draftFrame().locator(sel).first();

/* ---------- the camera ---------- */
let cam = { tx: 0, ty: 0, s: S0 };
// WIDE=1 keeps the camera wide all the way (the same timing, the whole page in frame): the home page's hero loop
// is cut from that recording (scripts/hero-video.mjs), since a zoomed frame loses the page's sides.
const WIDE = process.env.WIDE === "1";
async function setCam(c, ms = 1100) { if (WIDE) c = { tx: 0, ty: 0, s: S0 }; cam = c; await st("cam", c.tx, c.ty, c.s); await raw(Math.max(ms, 1100)); }
const wide = (ms) => setCam({ tx: 0, ty: 0, s: S0 }, ms);
// Zooms so the box (in stage pixels, as Playwright measures it) fills the window, within limits.
async function zoomTo(loc, { pad = 70, max = 1.9, ms = 1100 } = {}) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const bb = await loc.boundingBox();
  if (!bb) return;
  // back to the site's own coordinates
  const r = { x: (bb.x - VIEW.x - cam.tx) / cam.s, y: (bb.y - VIEW.y - cam.ty) / cam.s, w: bb.width / cam.s, h: bb.height / cam.s };
  const s = Math.max(S0, Math.min(max, VIEW.w / (r.w + pad * 2), VIEW.h / (r.h + pad * 2)));
  let tx = VIEW.w / 2 - (r.x + r.w / 2) * s, ty = VIEW.h / 2 - (r.y + r.h / 2) * s;
  tx = Math.min(0, Math.max(VIEW.w - APP.w * s, tx)); ty = Math.min(0, Math.max(VIEW.h - APP.h * s, ty));
  await setCam({ tx, ty, s }, ms);
}

/* ---------- the hand ---------- */
async function point(loc, say, hold = 900) {
  const bb = await loc.boundingBox();
  await st("point", { left: bb.x, top: bb.y, width: bb.width, height: bb.height, bottom: bb.y + bb.height }, say || "");
  await wait(hold);
}
async function tap(loc, say, { hold = 900, zoom = true, max } = {}) {
  if (typeof loc === "string") loc = A(loc);
  if (zoom) await zoomTo(loc, { max });
  await point(loc, say, hold);
  const bb = await loc.boundingBox();
  await st("tap", bb.x + bb.width / 2, bb.y + bb.height / 2);
  await wait(260);
  await st("unpoint");
  await loc.click();
}
async function type(loc, text, say) {
  await tap(loc, say, { hold: 700 });
  await loc.pressSequentially(text, { delay: 75 });
  await wait(450);
}
async function scrollApp(frame, to, ms) {
  await frame.evaluate(([to, ms]) => new Promise((done) => {
    const from = scrollY, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, from + (to - from) * e); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [to, ms]);
}
// The draft next to the chat, after it reloads with the last answer.
async function draftReady() {
  await p.waitForFunction(() => {
    const f = document.getElementById("app").contentDocument.querySelector("#frame");
    return f && f.contentDocument && f.contentDocument.readyState === "complete" && f.contentDocument.querySelector(".hero");
  }, null, { timeout: 15000 });
  await wait(350);
}
const nextQ = (re) => app().waitForFunction((src) => new RegExp(src).test((document.querySelector("#guide .q") || {}).textContent || ""), re.source, { timeout: 15000 });
async function goApp(url) {
  await p.evaluate((u) => { document.getElementById("app").src = u; }, url);
  await p.waitForFunction((u) => { try { const w = document.getElementById("app").contentWindow; return w.location.pathname === u && w.document.readyState === "complete"; } catch (e) { return false; } }, url, { timeout: 15000 });
  await app().evaluate(async () => { await document.fonts.ready; document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }); });
  await wait(400);
}
async function waitPath(re) {
  // Through Playwright, not the stage: the payment page is on another origin, whose location the stage can't read.
  for (const t = Date.now() + 15000; !re.test(new URL(app().url()).pathname); await p.waitForTimeout(100)) if (Date.now() > t) throw new Error("timeout waiting for " + re + " at " + app().url());
  await app().waitForLoadState("load");
  await app().evaluate(() => document.fonts.ready); await wait(400);
}

/* ---------- a step: the card, then the panel ---------- */
const STEPS = [
  ["בוחרים תחום", "נכנסים לאתר ובוחרים את התחום שלכם. יש 16 תחומים, ולכל אחד דמו משלו."],
  ["מסתכלים על הדמו", "עסק בדוי, באותה תבנית שתקבלו: השירותים, המחירים, האזורים, והצ׳אט שעונה ללקוחות."],
  ["נכנסים לבונה", "לוחצים \"לבנות את האתר שלי\". שם וטלפון, וזהו. בלי שיחת היכרות ובלי לחכות."],
  ["בוחרים תבנית", "שש תבניות לאותו תוכן. לוחצים על אחת, והאתר מתחלף מיד."],
  ["בוחרים צבעים", "לכל תבנית שמונה ערכות צבעים. לא סגור? אפשר להחליף גם אחר כך."],
  ["עונים על שאלות", "שאלה אחת בכל פעם. בוחרים תשובה מוכנה, ומה שחסר כותבים. האתר מתמלא תוך כדי."],
  ["מעלים תמונות", "תמונה שלכם ועד שלוש של העבודה. אפשר גם לפני ואחרי, וסרטון קצר."],
  ["בודקים את האתר", "גוללים ורואים הכול, בדיוק כמו שיעלה. רוצים שינוי? כותבים לנו בצ׳אט."],
  ["מאשרים ובוחרים חבילה", "מרוצים? מאשרים, ובוחרים חבילה: נציג AI, או נוכחות בלבד."],
  ["כתובת, תשלום, באוויר", "בוחרים כתובת לאתר, משלמים בכרטיס, והאתר עולה לאוויר לבד. מאותו רגע כל פנייה מגיעה אליכם."],
];
// When each step card shows, in the film's own seconds: the "at" of each line in scripts/process-voice.json.
const marks = [];
async function step(n) {
  const [title, text] = STEPS[n - 1];
  if (frames.length) marks.push([n, Date.now() / 1000 - frames[0].t]);
  await st("unpoint");
  await st("card", String(n), title, n < 10 ? "השלב הבא: " + STEPS[n][0] : "");
  await wait(500);
  await st("step", n, title, text, n < 10 ? STEPS[n][0] : "");
  await wait(1500);
  await st("uncard");
  await wait(900);
}
const now = async (t, ms = 700) => { await st("now", t); await wait(ms); };
async function endStep() { await st("pulseNext"); await wait(1500); }

/* ---------- recording: Chrome's own screencast frames ---------- */
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
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
}

try {
  await goApp("/");
  /* ---------- opening ---------- */
  await st("full", true);
  await st("lines", `<div class="l big">אתר לעסק שלכם</div><div class="l mid">בונים לבד, בצ׳אט. בלי שיחות ובלי לחכות.</div><div class="l small">ככה זה עובד, שלב אחרי שלב, עד שהאתר באוויר.</div>`);
  await wait(400);
  await startRec();
  await wait(500);
  for (let i = 0; i < 3; i++) { await p.evaluate((i) => window.stage.showN(".l", i), i); await wait(i ? 1900 : 1500); }
  await wait(900);
  await st("lines", `<div class="l mid">10 שלבים</div><div class="grid">${STEPS.map(([t], i) => `<div class="st"><em>${i + 1}</em><b>${t}</b></div>`).join("")}</div>`);
  await wait(200); await st("show", ".l");
  for (let i = 0; i < 10; i++) { await p.evaluate((i) => window.stage.showN(".st", i), i); await wait(230); }
  await wait(2600);
  await st("full", false);
  await wait(700);

  /* ---------- 1. the trade ---------- */
  await step(1);
  await now("גוללים לדוגמאות", 300);
  const demosY = await app().evaluate(() => document.querySelector("#demos").getBoundingClientRect().top + scrollY - 40);
  await scrollApp(app(), demosY, 2000); await wait(900);
  await zoomTo(A("#demos"), { max: 1.25 });
  await wait(900);
  await now("בוחרים תחום, והטלפון מראה את האתר שלו", 300);
  await tap(A('#chips .chip[data-id="electrician"]'), "חשמלאי", { max: 1.6 }); await wait(1300);
  await tap(A('#chips .chip[data-id="plumber"]'), "אינסטלטור", { zoom: false }); await wait(1300);
  await now("ונכנסים לדמו המלא");
  await tap(A("#toDemo"), "לדמו המלא", { max: 1.6 });
  await waitPath(/^\/plumber\/$/);
  await wide(600);
  await endStep();

  /* ---------- 2. the demo ---------- */
  await step(2);
  await now("ככה האתר ייראה ללקוחות שלכם", 1800);
  await scrollApp(app(), 820, 2200); await wait(1300);
  await now("השירותים והמחירים, בטבלה ברורה", 1500);
  await scrollApp(app(), 0, 1500); await wait(500);
  await now("לקוח פותח את הצ׳אט");
  await tap(A(".lb-launch"), "נציג AI", { max: 1.5 });
  await wait(700);
  await zoomTo(A(".lb-panel"), { max: 1.45, pad: 40 });
  for (let i = 0; i < 3; i++) { // the job, the photo (skipped), how urgent
    await A(".lb-panel .lb-chips button").waitFor({ timeout: 8000 }); await wait(900);
    if (i === 0) await now("הצ׳אט שואל, הלקוח עונה בלחיצה", 300);
    await tap(A(".lb-panel .lb-chips button"), null, { hold: 650, zoom: false });
  }
  await wait(1300);
  await now("והפנייה מגיעה אליכם בוואטסאפ, מסודרת", 1700);
  await tap(A(".lb-launch"), null, { hold: 400, zoom: false });
  await wide(600);
  await endStep();

  /* ---------- 3. the builder ---------- */
  await step(3);
  await goApp("/");
  await now("לוחצים \"לבנות את האתר שלי\"");
  await tap(A('.hero .ctas a[href="build/"]'), "לבנות את האתר שלי", { max: 1.6 });
  await waitPath(/^\/build\/$/);
  await wide(500);
  await zoomTo(A("#startForm"), { max: 1.6, pad: 50 });
  await now("שם");
  await type(A("#fName"), "אורן לוי");
  await now("וטלפון");
  await type(A("#fPhone"), "052-6359513");
  await now("מאשרים, ומתחילים");
  await tap(A("#fConsent"), null, { hold: 500, zoom: false });
  await tap(A("#startForm button[type=submit]"), null, { hold: 600, zoom: false });
  await A("#work:not([hidden])").waitFor();
  await draftReady();
  await wide(900);
  await now("משמאל האתר שלכם, מימין השאלות", 2200);
  await endStep();

  /* ---------- 4. the template ---------- */
  await step(4);
  await zoomTo(A("#guide"), { max: 1.7, pad: 30 });
  await now("שש תבניות לבחירה", 1500);
  const LOOKS = [["van", "שלט על הרכב"], ["ticket", "כרטיס עבודה"], ["dispatch", "מוקד"], ["mosaic", "פסיפס"], ["certificate", "תעודת אחריות"]];
  for (const [i, [look, name]] of LOOKS.entries()) {
    await now(`לוחצים על "${name}"`, 300);
    await tap(A(`#guide .look[data-look="${look}"]`), name, { zoom: false });
    await A(`#guide .look[data-look="${look}"][aria-pressed=true]`).waitFor(); await draftReady();
    if (!i) await now("והאתר מתחלף מיד", 200);
    await zoomTo(A("#frame"), { max: 1.15, pad: 10 }); await wait(i ? 1100 : 1800);
    await zoomTo(A("#guide"), { max: 1.7, pad: 30 });
  }
  await endStep();

  /* ---------- 5. the colours ---------- */
  await step(5);
  await now("לוחצים על ערכת צבעים", 500);
  for (const [pal, name] of [["navy", "כחול"], ["plum", "שזיף"], ["green", "ירוק מסמך"]]) {
    await tap(A(`#guide .pal[data-palette="${pal}"]`), name, { zoom: false, hold: 650 });
    await A(`#guide .pal[data-palette="${pal}"][aria-pressed=true]`).waitFor(); await draftReady();
    await zoomTo(A("#frame"), { max: 1.15, pad: 10 }); await wait(1500);
    await zoomTo(A("#guide"), { max: 1.7, pad: 30 });
  }
  await now("מצאתם? ממשיכים");
  await tap(A("#guide > .btn"), "ממשיכים", { zoom: false });
  await nextQ(/איך קוראים לעסק/);
  await endStep();

  /* ---------- 6. the questions ---------- */
  await step(6);
  const showDraft = async (sel, say, ms = 2000) => {
    await draftReady();
    const loc = D(sel);
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await wait(250);
    await zoomTo(loc, { max: 1.7, pad: 40 });
    if (say) await point(loc, say, ms); else await wait(ms);
    await st("unpoint");
  };
  await zoomTo(A("#guide"), { max: 1.7, pad: 30 });
  await now("שם העסק");
  await type(A("#guide .other input"), "אורן מים");
  await tap(A("#guide .other button"), null, { zoom: false, hold: 400 });
  await nextQ(/באיזה אזור/);
  await showDraft(".logo", "השם כבר באתר");
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  await now("באיזה אזור אתם עובדים");
  await tap(A("#guide .chip"), null, { zoom: false, hold: 600 });
  await nextQ(/לאילו ישובים/); await wait(600);
  await now("הישובים כבר מסומנים. מורידים או מוסיפים", 1500);
  await tap(A("#guide > .btn"), "שמירה", { zoom: false });
  await nextQ(/מה אתם עושים/);
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  await now("מסמנים את השירותים שלכם");
  for (const i of [0, 1, 2, 3]) await tap(app().locator("#guide .chip").nth(i), null, { zoom: false, hold: 380 });
  await tap(A("#guide > .btn"), "שמירה", { zoom: false });
  await nextQ(/להציג מחירים/);
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  await now("מחירים: טווחים לדוגמה. משאירים רק מה שנכון אצלכם", 2200);
  await tap(A("#guide .row .btn"), "שמירה", { zoom: false });
  await nextQ(/תוך כמה זמן/);
  await showDraft(".order", "השירותים והמחירים באתר", 2300);
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  await now("תוך כמה זמן אתם חוזרים ללקוח");
  await tap(A("#guide .chip"), null, { zoom: false, hold: 500 });
  await nextQ(/מתי אתם עובדים/);
  await now("שעות, שנים בתחום ואחריות. רק מה שנכון", 400);
  await tap(app().locator("#guide .chip").nth(1), null, { zoom: false, hold: 450 }); await nextQ(/כמה שנים/);
  await tap(app().locator("#guide .chip").nth(4), null, { zoom: false, hold: 450 }); await nextQ(/אחריות/);
  await tap(app().locator("#guide .chip").nth(2), null, { zoom: false, hold: 450 }); await nextQ(/איזו כותרת/);
  await showDraft(".seal", "האחריות שלכם, בחותמת", 2000);
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  await now("בוחרים כותרת. נוסח מוכן, או כותבים לנו", 600);
  await tap(app().locator("#guide .chip.card").nth(1), null, { zoom: false, hold: 800 });
  await nextQ(/פסקת פתיחה/);
  await now("ופסקת פתיחה", 400);
  await tap(app().locator("#guide .chip.card").nth(0), null, { zoom: false, hold: 800 });
  await nextQ(/דף לכל אזור/);
  await now("דף לכל אזור, מהמילים שלכם. לא חובה", 1600);
  await tap(A("#guide button.skip:last-of-type"), "לדלג", { zoom: false, hold: 500 });
  await nextQ(/תמונות/);
  await showDraft(".hero h1", "הכותרת שבחרתם", 2200);
  await endStep();

  /* ---------- 7. photos ---------- */
  await step(7);
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  await now("פותחים \"תמונות וסרטון\"");
  await tap(A("#guide .row .btn"), "לתמונות", { zoom: false });
  await wait(400);
  await zoomTo(A("#photos"), { max: 1.7, pad: 30 });
  await now("מאשרים שהתמונות שלכם");
  await tap(A("#rights"), null, { zoom: false, hold: 600 });
  await now("ובוחרים תמונות מהטלפון", 300);
  const PH = path.join(ROOT, "shared/photos");
  for (const [n, file] of [["1", "plumber-portrait.webp"], ["2", "plumber-leak.webp"], ["3", "plumber-drain.webp"], ["4", "plumber-siphon.webp"]]) {
    const slot = A(`#slots .slot:nth-child(${n})`);
    await point(slot, null, 500); await st("unpoint");
    await A(`#slots .slot:nth-child(${n}) input`).setInputFiles(path.join(PH, file));
    await A(`#slots .slot:nth-child(${n}) img`).waitFor({ timeout: 10000 }).catch(() => {});
    await wait(450);
  }
  await now("התמונות כבר באתר", 300);
  await showDraft(".field", null, 2600);
  await endStep();

  /* ---------- 8. the check ---------- */
  await step(8);
  await zoomTo(A("#frame"), { max: 1.2, pad: 6 });
  await now("גוללים את כל האתר", 400);
  const df = draftFrame();
  const tall = await df.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await scrollApp(df, Math.min(tall, 3200), 8000); await wait(900);
  await scrollApp(df, 0, 2200); await wait(500);
  await now("רוצים עיצוב אחר? הכפתור \"עיצוב\" תמיד כאן");
  await wide(700);
  await tap(A("#design summary"), "עיצוב", { max: 1.5 });
  await wait(500);
  await zoomTo(A("#design"), { max: 1.6, pad: 30 });
  await tap(A('#designBox .look[data-look="blueprint"]'), "שרטוט", { zoom: false }); await draftReady();
  await zoomTo(A("#frame"), { max: 1.15, pad: 10 }); await wait(1800);
  await zoomTo(A("#design"), { max: 1.6, pad: 30 });
  await tap(A('#designBox .look[data-look="certificate"]'), "חוזרים לתעודה", { zoom: false }); await draftReady();
  await tap(A('#designBox .pal[data-palette="green"]'), null, { zoom: false, hold: 500 }); await draftReady();
  await app().evaluate(() => { document.querySelector("#design").open = false; });
  await wide(900);
  await endStep();

  /* ---------- 9. approve ---------- */
  await step(9);
  if (await A("#approveBox .btn").isDisabled()) throw new Error("the draft still misses something: " + (await A("#approveBox").textContent()));
  await now("לוחצים \"מאשרים את האתר\"");
  await tap(A("#approveBox .btn"), "מאשרים את האתר", { max: 1.6 });
  await wait(600);
  await zoomTo(A("#approveDlg"), { max: 1.6, pad: 30 });
  await now("בוחרים חבילה", 400);
  await point(A("#approveDlg .pkg"), "נציג AI: האתר, מערכת הפניות והצ׳אט", 2600);
  await point(app().locator("#approveDlg .pkg").nth(1), "נוכחות: האתר, עם וואטסאפ ושיחה", 2400);
  await st("unpoint");
  await now("ומאשרים");
  ai.queue.push({ names: ["oren-mayim", "oren-plumber", "instalator-hadera"] }); // the address suggestions (lib/builder.mjs suggestSlugs)
  await tap(A("#approveGo"), "מאשרים", { zoom: false });
  await A("#addrDlg[open] #addrList input[name=addr]").waitFor({ timeout: 15000 });
  await endStep();

  /* ---------- 10. the address, the payment, live ---------- */
  await step(10);
  await zoomTo(A("#addrDlg"), { max: 1.5, pad: 30 });
  await now("בוחרים כתובת לאתר. היא עובדת מהיום הראשון", 2200);
  await point(A("#addrList .pkg"), "oren-mayim.easylanding.co.il", 1800);
  await st("unpoint");
  await now("יש לכם דומיין משלכם? מחברים אותו אחרי התשלום", 2000);
  await tap(A("#addrGo"), "לשמור את הכתובת", { zoom: false });
  await app().waitForFunction(() => /הכתובת: oren-mayim/.test(document.querySelector("#approveBox").textContent), null, { timeout: 10000 });
  await wait(500);
  await zoomTo(A("#approveBox"), { max: 1.5, pad: 30 });
  await now("חודשי, או שנה מראש. המחיר לפני מע״מ, והסכום להיום כולל אותו", 2600);
  await tap(app().locator("#approveBox .btn").filter({ hasText: "לתשלום מאובטח" }), "לתשלום מאובטח", { zoom: false });
  await waitPath(/^\/pay\/\d+$/);
  await wide(500);
  await now("משלמים בכרטיס, בדף מאובטח. החשבונית נשלחת מיד", 2400);
  await tap(A("a.pay"), "לשלם", { max: 1.6 });
  await waitPath(/^\/build\/$/);
  await wide(500);
  await app().waitForFunction(() => /האתר באוויר/.test(document.querySelector("#approveBox").textContent), null, { timeout: 30000 });
  marks.push(["live", Date.now() / 1000 - frames[0].t]);
  await zoomTo(A("#approveBox"), { max: 1.5, pad: 30 });
  await now("האתר עלה לאוויר לבד, תוך דקה", 2200);
  await app().evaluate(() => { const b = document.querySelector("#approveBox"); const h = [...b.querySelectorAll("h3")].find((x) => /הלקוחות הראשונים/.test(x.textContent)); if (h) b.scrollTop = h.offsetTop - 10; });
  await wait(400);
  await now("ואיך מביאים את הלקוחות הראשונים: גוגל, סטטוס וקבוצות", 2600);
  await wide(400);
  await now("האתר באוויר, בכתובת שלכם", 300);
  await goApp("/__live/");
  await wait(1800);
  await scrollApp(app(), 700, 2400); await wait(700); await scrollApp(app(), 0, 1400);
  await now("לקוח נכנס ופותח קריאה");
  await tap(A(".lb-launch"), null, { max: 1.5 });
  await zoomTo(A(".lb-panel"), { max: 1.45, pad: 40 });
  for (let i = 0; i < 2; i++) {
    await A(".lb-panel .lb-chips button").waitFor({ timeout: 8000 }); await wait(800);
    await tap(A(".lb-panel .lb-chips button"), null, { hold: 500, zoom: false });
  }
  await wait(900);
  await wide(600);
  await now("והפנייה אצלכם בוואטסאפ, מסודרת", 300);
  await st("phone", true, "האתר של אורן מים", "א");
  await wait(1100);
  await st("msg", "<b>פנייה חדשה מהאתר</b>\nתקלה: סתימה בכיור, באסלה או בניקוז\nדחיפות: עכשיו\nישוב: חדרה\nשם: דנה\nטלפון: 054-1234567<span class=\"btn\">טיפלתי</span><time>16:12</time>");
  await wait(3600);
  await st("phone", false);
  await wait(500);
  await st("allDone");
  await wait(900);

  /* ---------- closing ---------- */
  await st("full", true);
  marks.push(["end", Date.now() / 1000 - frames[0].t]);
  await st("lines", `<div class="l mid">10 שלבים, ואתם באוויר</div><div class="grid">${STEPS.map(([t], i) => `<div class="st on ok"><em>${i + 1}</em><b>${t}</b></div>`).join("")}</div>`);
  await wait(100); await st("show", ".l");
  await wait(3800);
  await st("lines", `<div class="l big">Easy Landing</div><div class="l small">אתרים שבונים עסקים</div><div class="l cta">לבנות את האתר שלי</div><div class="l addr">service-pro-web.netlify.app/build</div>`);
  for (let i = 0; i < 4; i++) { await p.evaluate((i) => window.stage.showN(".l", i), i); await wait(500); }
  await wait(3800);
  endT = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
} finally {
  await ctx.close(); await browser.close(); server.close();
}

// Frames come only when something changes: each one lasts until the next, and the last until the recording stopped.
const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, ((frames[i + 1] || { t: Math.max(endT, f.t + 0.6) }).t - f.t)).toFixed(3)}`).join("\n") + `\nfile '${frames.at(-1).file}'\n`;
fs.writeFileSync(path.join(dir, "list.txt"), list);
fs.mkdirSync(OUT, { recursive: true });
// The silent master: scripts/process-voice.mjs lays the narration and the music on it and writes the film the site plays.
const out = WIDE ? path.join(os.tmpdir(), "process-wide.mp4") : path.join(ROOT, "../scripts/process-voice/film.mp4");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
  "-vf", `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "30", "-tune", "animation", "-movflags", "+faststart", "-an", out]);
if (!WIDE) execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", "118", "-i", out, "-frames:v", "1", "-vf", "scale=1280:-2", "-c:v", "libwebp", "-quality", "78", path.join(OUT, "process-poster.webp")]);
fs.rmSync(dir, { recursive: true, force: true });
const secs = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim();
if (marks.length) console.log("step cards at: " + marks.map(([n, t]) => `${n}:${t.toFixed(1)}`).join(" "));
console.log(`${out} · ${Number(secs).toFixed(1)} s · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · ${frames.length} frames`);
