// The explainer film (1920x1080), at a calm pace with no dead time: a hook over real demo sites, the ten steps of the build from the first click
// to the site in the air (the trade, the demo, the builder, the template, the colours, the questions, the photos, the
// check, the approval, then the address, the card payment and the site live by itself), then "what you get": every
// thing the site does once it is live, each in a few seconds with a big title, and the two packages at the end.
// The real pages run in a browser window on a stage (scripts/video-stage.html): big titles that carry the film with
// the sound off, a rail of the ten steps, a camera that zooms in on each action, an arrow on what to press, a phone
// for the WhatsApp messages. The builder runs against the test fakes: no Supabase, no AI, no WhatsApp, a fake Grow
// (its payment page is a plain stand-in, not Grow's own), and the publish goes to fake GitHub and Netlify. The owner's
// panel runs on sample numbers, and the montage says "המחשה" all along.
// No dead time: the recorder keeps a frame only when something changes, so a still frame is cut to CAP seconds
// (HOLD_CAP where the film holds on purpose for reading), and the waits for the network are cut out altogether.
// Run: node scripts/process-video.mjs   (WIDE=1 keeps the camera wide, for the home page's loop: scripts/hero-video.mjs)
// Writes scripts/process-voice/film.mp4 (the silent master) and film.json (its beats, captions and cuts), which
// scripts/process-voice.mjs turns into the film the site plays. Needs Playwright and ffmpeg.
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
const F = new URL("../demos/netlify/functions/", import.meta.url).href;
const builder = (await import(F + "builder.mjs")).default;
const draft = (await import(F + "draft.mjs")).default;
const plumber = await import(new URL("../demos/netlify/lib/templates/plumber.mjs", import.meta.url).href);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".vcf": "text/vcard" };
const PORT = 8797, BASE = `http://localhost:${PORT}`;
const W = 1920, H = 1080;
// The window on the stage: where the site sits, and its size at rest.
const VIEW = { x: 48, y: 150 + 46, w: 1240, h: 775 }, APP = { w: 1280, h: 800 }, S0 = VIEW.w / APP.w;
const WIDE = process.env.WIDE === "1";
// A still frame lasts at most CAP seconds, or HOLD_CAP inside a hold for reading.
const CAP = 2, HOLD_CAP = 3.5;

/* ---------- the live site at the end: the approved draft, rendered as the real site is ---------- */
const SLUG = "oren-mayim", SITE_URL = `https://${SLUG}.easylanding.co.il/`;
let liveFiles = null;
function live() {
  if (liveFiles) return liveFiles;
  const d = T.ls_drafts.at(-1);
  const photos = Object.fromEntries(Object.entries(d.photos || {}).map(([slot, p]) => [slot, "/__live/p/" + p.path]));
  liveFiles = plumber.render(d.content, { mode: "site", assets: "/shared/", photos, leads: "/api/lead/" + SLUG, url: SITE_URL, credit: { name: "Easy Landing", url: "/" } });
  return liveFiles;
}
// What the site's "available now" line says (GET /api/status/<slug>): the owner changes it from WhatsApp in the montage.
let status = { state: "open", text: "זמינים היום עד 18:00." };

/* ---------- the owner's panel, on sample numbers (the shape /api/leads answers, demos/panel/index.html reads) ---------- */
function panelData() {
  const now = Date.now(), ago = (min) => new Date(now - min * 60000).toISOString();
  const day = (i) => new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10);
  const wave = (i, a, b) => Math.round(a + (b - a) * (0.5 + 0.5 * Math.sin(i * 1.7) * Math.cos(i * 0.6)));
  const daily = Array.from({ length: 30 }, (_, i) => ({ day: day(i), visits: wave(i, 8, 27) + (i % 7 === 5 ? -5 : 0), leads: wave(i + 3, 0, 3) }));
  const visits = daily.reduce((a, d) => a + d.visits, 0), leads = daily.reduce((a, d) => a + d.leads, 0);
  const hours = [1, 0, 0, 0, 0, 1, 4, 9, 14, 12, 10, 9, 8, 9, 10, 11, 13, 15, 17, 18, 16, 11, 6, 3];
  const u = (code) => `${SITE_URL}?s=${code}`;
  return {
    client: { name: "אורן מים", slug: SLUG, active: true, job_value: null },
    leads: [
      { id: "l1", name: "דנה כהן", phone: "054-1234567", phone_intl: "972541234567", service: "סתימה בכיור, באסלה או בניקוז", message: "דחיפות: עכשיו. ישוב: חדרה.\nמהתמונה: סיפון מתחת לכיור במטבח. נראה כמו: סתימה בכיור, באסלה או בניקוז (250 עד 450 ₪).", status: "new", created_at: ago(3), channel: "chat", source: "google", auto_reply: "sent", owner_alert: "sent", photo_url: "/shared/photos/plumber-siphon.webp" },
      { id: "l2", name: "יוסי לוי", phone: "052-7654321", phone_intl: "972527654321", service: "נזילה מתחת לכיור או מצנרת", message: "ישוב: פרדס חנה כרכור.", status: "new", created_at: ago(48), callback_at: new Date(now + 3 * 3600000).toISOString(), channel: "chat", source: "t-ab12", auto_reply: "sent", owner_alert: "sent" },
      { id: "l3", name: "מיכל אברהם", phone: "050-2223344", phone_intl: "972502223344", service: "דוד חשמל או שמש", status: "handled", created_at: ago(190), handled_at: ago(150), channel: "chat", source: "facebook", auto_reply: "sent", owner_alert: "sent", review: "sent" },
      { id: "l4", name: "רון שמש", phone: "053-9988776", phone_intl: "972539988776", service: "החלפת ברז או סוללה", status: "won", created_at: ago(1500), handled_at: ago(1480), channel: "form", source: "direct", auto_reply: "sent", owner_alert: "sent" },
    ],
    messages: [],
    month: { visits, afterHours: 9, conversion: Math.round(leads / visits * 100), won: 7, open: 2 },
    stats: {
      visits, leads, google: { impressions: 3120, clicks: 214 }, acts: { wa: 58, call: 41, chat: 77, save: 12 },
      daily, devices: { mobile: Math.round(visits * 0.83), desktop: Math.round(visits * 0.14), tablet: visits - Math.round(visits * 0.83) - Math.round(visits * 0.14) }, deviceTotal: visits, hours,
      sources: [{ source: "google", visits: 211 }, { source: "t-ab12", visits: 96 }, { source: "direct", visits: 70 }, { source: "t-cd34", visits: 64 }, { source: "t-ef56", visits: 25 }, { source: "whatsapp", visits: 20 }],
    },
    links: [
      { code: "ab12", label: "אינסטגרם", url: u("ab12"), visits: 96, leads: 7 },
      { code: "cd34", label: "פייסבוק", url: u("cd34"), visits: 64, leads: 5 },
      { code: "ef56", label: "טיקטוק", url: u("ef56"), visits: 25, leads: 2 },
      { code: "gh78", label: "קבוצת השכונה בחדרה", url: u("gh78"), visits: 18, leads: 3 },
    ],
    availability: { state: "open", text: "זמינים היום עד 18:00.", manual: false },
  };
}

const json = (res, data, code = 200) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(data)); };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const send = async (r) => { res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); };
  const request = () => new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
  let m;
  if (url.pathname === "/__stage") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(STAGE); }
  if ((m = /^\/__live\/p\/(.+)$/.exec(url.pathname))) { const b = storage.get(decodeURIComponent(m[1])); res.writeHead(b ? 200 : 404, { "content-type": "image/webp" }); return res.end(b); }
  if ((m = /^\/__live\/(.*)$/.exec(url.pathname))) {
    const name = m[1] || "index.html", file = live()[name];
    if (file == null) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(name)] || "text/plain; charset=utf-8" }); return res.end(file);
  }
  // The lead system, as the live site and the panel see it: everything is stored and sent (the montage shows what follows).
  if (url.pathname === "/api/leads") return json(res, panelData());
  if (url.pathname.startsWith("/api/status/")) return json(res, status);
  if (/^\/api\/(lead|visit)\//.test(url.pathname)) return json(res, { ok: true, id: "film" });
  if (url.pathname.startsWith("/api/testimonials/")) return json(res, { testimonials: [] });
  if (url.pathname === "/api/estimate") {
    // The photo's first look (functions/photo-estimate.mjs): what it shows, and the range copied from the site's own list.
    const svc = (T.ls_drafts.at(-1)?.content.services || []).find((s) => /סתימה/.test(s.name)) || { name: "סתימה בכיור, באסלה או בניקוז", price: "250 עד 450 ₪" };
    await new Promise((r) => setTimeout(r, 300));
    return json(res, { seen: "סיפון מתחת לכיור במטבח.", service: svc.name, range: svc.price, urgent: false, advice: "עד שאורן מגיע, לא לשפוך עוד מים לכיור." });
  }
  if (url.pathname.startsWith("/api/demo-chat/")) {
    // The plumber demo's live נציג AI (functions/demo-chat.mjs), answering from the demo's own price list.
    await new Promise((r) => setTimeout(r, 300));
    return json(res, { reply: "פתיחת סתימה עולה אצל אורן 250 עד 450 ₪. המחיר הסופי אחרי אבחון, ומחיר סגור לפני שמתחילים. רוצים שאורן יחזור אליכם? השאירו שם וטלפון." });
  }
  if (/^\/api\/(chat|lead)/.test(url.pathname) || url.pathname.startsWith("/api/visit")) return json(res, { ok: false }, 404);
  if ((m = /^\/api\/builder\/([\w-]+)$/.exec(url.pathname))) { const r = await builder(request(), { params: { action: m[1] } }); return send(r); }
  if ((m = /^\/draft\/([\w-]+)$/.exec(url.pathname))) return send(await draft(request(), { params: { id: m[1] } }));
  const f = path.join(ROOT, decodeURIComponent(url.pathname).replace(/\/$/, "/index.html"));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
}).listen(PORT);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "he-IL" });
await ctx.addInitScript(() => {
  window.NR_VIDEO_CODEC = "vp9";
  // The pages' own pauses (the chat's typing, a message's delay) run a little faster in the film. Not on the stage.
  if (location.pathname === "/__stage") return;
  const later = window.setTimeout;
  window.setTimeout = function (fn, ms, ...a) { return later.call(this, fn, ms >= 250 ? ms * 0.75 : ms, ...a); };
});
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("page error:", e.message));
p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) console.log("console:", m.text()); });
await p.route(/wa\.me/, (r) => r.abort());
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
<div class="c"><h1>תשלום מאובטח</h1><p class="s">Easy Landing · הקמת אתר</p><p class="sum">${g.sum.toLocaleString("he-IL")} ₪</p>
<label>מספר כרטיס</label><div class="f">4580 •••• •••• 1234</div><div class="row"><div><label>תוקף</label><div class="f">12/28</div></div><div><label>CVV</label><div class="f">•••</div></div></div>
<a class="pay" href="?go=1">לשלם</a><p class="lock">הקבלה נשלחת אליכם מיד אחרי התשלום</p></div></html>` });
});
await p.route(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/builder\//, (r) => {
  const key = new URL(r.request().url()).pathname.replace("/storage/v1/object/public/builder/", "");
  const buf = storage.get(key);
  return buf ? r.fulfill({ status: 200, contentType: key.endsWith(".jpg") ? "image/jpeg" : "image/webp", body: buf }) : r.fulfill({ status: 404 });
});

// The hook's flashes: the first screen of six demo sites from the home page's trades, as they really look.
const HOOK_DEMOS = ["electrician", "barber", "ac", "cosmetics", "garden", "photographer"];
const shots = [];
{
  const sp = await ctx.newPage();
  await sp.setViewportSize({ width: 1440, height: 810 });
  for (const d of HOOK_DEMOS) {
    await sp.goto(`${BASE}/${d}/`, { waitUntil: "load" });
    await sp.evaluate(async () => { await document.fonts.ready; document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }); });
    await sp.waitForTimeout(700);
    shots.push("data:image/jpeg;base64," + (await sp.screenshot({ type: "jpeg", quality: 82 })).toString("base64"));
  }
  await sp.close();
}

await p.goto(BASE + "/__stage", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);

const PACE = 1; // scales the waits for reading; the camera keeps its own (short) timing
const raw = (ms) => p.waitForTimeout(ms);
const wait = (ms) => p.waitForTimeout(Math.round(ms * PACE));
const st = (fn, ...a) => p.evaluate(([fn, a]) => window.stage[fn](...a), [fn, a]);
const app = () => p.frame({ name: "app" });
// The draft: a /draft/ page at first, then written in place through srcdoc (build/index.html refreshFrame).
const draftFrame = () => p.frames().find((f) => f.parentFrame() === app() && /\/draft\/|^about:srcdoc/.test(f.url()));
const A = (sel) => app().locator(sel).first();
const D = (sel) => draftFrame().locator(sel).first();

/* ---------- the clock of the film: cuts, holds, beats, captions ---------- */
const clock = () => Date.now() / 1000;
const drops = [], holds = [], beats = [], cues = [], hits = [], marks = {};
// Network waits are cut out of the film: what is on screen when they end follows straight after what was before.
async function cut(fn) { const a = clock(); try { return await fn(); } finally { await raw(120); drops.push([a, clock()]); } }
// A pause for reading: a still frame may last up to HOLD_CAP here.
// READ stretches every reading pause: a calm pace a viewer can follow, while the dead time is still cut.
const READ = 1.8;
async function hold(ms) { const a = clock(); await raw(Math.round(ms * READ)); holds.push([a, clock()]); }
const cue = (text) => { cues.push({ t: clock(), text }); };
const mark = (name) => { marks[name] = clock(); };
const beat = (id, title, k = "cut") => { beats.push({ id, t: clock(), title }); hits.push({ t: clock(), k }); };

/* ---------- the camera ---------- */
let cam = { tx: 0, ty: 0, s: S0 };
// WIDE=1 keeps the camera wide all the way (the same timing, the whole page in frame): the home page's hero loop
// is cut from that recording (scripts/hero-video.mjs), since a zoomed frame loses the page's sides.
async function setCam(c) { if (WIDE) c = { tx: 0, ty: 0, s: S0 }; const same = Math.abs(c.tx - cam.tx) + Math.abs(c.ty - cam.ty) + Math.abs(c.s - cam.s) * 500 < 4; cam = c; await st("cam", c.tx, c.ty, c.s); if (!same) await raw(650); }
const wide = () => setCam({ tx: 0, ty: 0, s: S0 });
// Zooms so the box (in stage pixels, as Playwright measures it) fills the window, within limits.
async function zoomTo(loc, { pad = 70, max = 1.9 } = {}) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const bb = await loc.boundingBox();
  if (!bb) return;
  const r = { x: (bb.x - VIEW.x - cam.tx) / cam.s, y: (bb.y - VIEW.y - cam.ty) / cam.s, w: bb.width / cam.s, h: bb.height / cam.s };
  const s = Math.max(S0, Math.min(max, VIEW.w / (r.w + pad * 2), VIEW.h / (r.h + pad * 2)));
  let tx = VIEW.w / 2 - (r.x + r.w / 2) * s, ty = VIEW.h / 2 - (r.y + r.h / 2) * s;
  tx = Math.min(0, Math.max(VIEW.w - APP.w * s, tx)); ty = Math.min(0, Math.max(VIEW.h - APP.h * s, ty));
  await setCam({ tx, ty, s });
}

/* ---------- the hand ---------- */
async function point(loc, say, ms = 500) {
  const bb = await loc.boundingBox();
  await st("point", { left: bb.x, top: bb.y, width: bb.width, height: bb.height, bottom: bb.y + bb.height }, say || "");
  if (ms) await raw(Math.max(380, Math.round(ms * PACE))); // the arrow needs that long to get there
}
async function tap(loc, say, { hold: ms = 550, zoom = true, max } = {}) {
  if (typeof loc === "string") loc = A(loc);
  if (zoom) await zoomTo(loc, { max });
  await point(loc, say, ms);
  const bb = await loc.boundingBox();
  await st("tap", bb.x + bb.width / 2, bb.y + bb.height / 2);
  await raw(150);
  await st("unpoint");
  await loc.click();
}
// Typing at about twice a person's speed.
async function type(loc, text, say) {
  await tap(loc, say, { hold: 300 });
  await loc.pressSequentially(text, { delay: 45 });
  await raw(150);
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
  await raw(150);
}
// The next question of the questionnaire: the wait for the server is cut.
const nextQ = (re) => cut(() => app().waitForFunction((src) => new RegExp(src).test((document.querySelector("#guide .q") || {}).textContent || ""), re.source, { timeout: 15000 }));
async function goApp(url) {
  await p.evaluate((u) => { document.getElementById("app").src = u; }, url);
  const pathOnly = url.replace(/[?#].*$/, "");
  await p.waitForFunction((u) => { try { const w = document.getElementById("app").contentWindow; return w.location.pathname === u && w.document.readyState === "complete"; } catch (e) { return false; } }, pathOnly, { timeout: 15000 });
  await app().evaluate(async () => { await document.fonts.ready; document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }); });
  await raw(250);
}
async function waitPath(re) {
  // Through Playwright, not the stage: the payment page is on another origin, whose location the stage can't read.
  for (const t = Date.now() + 15000; !re.test(new URL(app().url()).pathname); await p.waitForTimeout(100)) if (Date.now() > t) throw new Error("timeout waiting for " + re + " at " + app().url());
  await app().waitForLoadState("load");
  await app().evaluate(() => document.fonts.ready); await raw(250);
}

/* ---------- a step: the card, then the titles ---------- */
const STEPS = [
  ["בוחרים תחום.", "לכל תחום אתר לדוגמה משלו."],
  ["רואים את האתר לדוגמה.", "באותה תבנית שתקבלו."],
  ["נכנסים לבונה.", "שם וטלפון, וזהו."],
  ["בוחרים תבנית.", "כמה תבניות לכל תחום. האתר מתחלף מיד."],
  ["בוחרים צבעים.", "שמונה ערכות לכל תבנית."],
  ["עונים על כמה שאלות.", "האתר מתמלא תוך כדי."],
  ["מעלים תמונות.", "שלכם, ושל העבודה."],
  ["עוברים על האתר.", "בדיוק כמו שהוא יעלה."],
  ["מאשרים את האתר.", "נציג AI: הצ׳אט והפניות."],
  ["משלמים, והאתר עולה.", "בוחרים כתובת ומשלמים."],
];
async function step(n) {
  const [title, text] = STEPS[n - 1];
  beat("s" + n, title, "big");
  await st("unpoint");
  await st("card", String(n), title, text);
  await st("step", n, title, text);
  cue(`שלב ${n} מתוך 10: ${title} ${text}`);
  await raw(380);
  await hold(800);
  await st("uncard");
  await raw(300);
}
const now = async (t, ms = 0) => { await st("now", t); cue(t); if (ms) await hold(ms); };

// "What you get": each thing the site does, with its title. The stage says "המחשה" all along.
const FEATURES = [
  ["האתר באוויר, בכתובת שלכם.", "מותאם לנייד, עם וואטסאפ וחיוג."],
  ["צ׳אט שעונה ללקוחות, בכל שעה.", "שואל מה צריך, איפה וכמה דחוף."],
  ["הלקוח מצרף תמונה.", "ומקבל הערכה ראשונית מהמחירון שלכם."],
  ["מענה אוטומטי בוואטסאפ.", "מהמספר שלכם, תוך שניות."],
  ["התראה על כל פנייה.", "עם כפתור ״טיפלתי״, ותזכורת אם עוד לא חזרתם."],
  ["ביקורת בגוגל, באישור שלכם.", "נשלחת רק כשאתם לוחצים ״כן, לשלוח״."],
  ["צ׳אט AI שעונה מהמחירון.", "וכשהוא לא יודע, הוא לא ממציא."],
  ["כל הפניות בלוח אחד.", "מי פנה, מה צריך, ומה מחכה לכם."],
  ["סטטיסטיקות, בלי עוגיות.", "כניסות, פניות והופעות בגוגל."],
  ["קישור לכל רשת וקבוצה.", "ו־QR להדפסה. רואים מה הביא פניות."],
  ["דוח חודשי בוואטסאפ.", "כמה נכנסו, כמה פנו, ובכמה טיפלתם."],
  ["כותבים ״חירום״, והאתר מתעדכן.", "גם ״עסוק״ ו״פנוי״, מהוואטסאפ."],
  ["האינסטגרם והטיקטוק, באתר.", "ומי שמגיע מהרשתות מוצא את האתר."],
  ["דף לכל שירות ולכל אזור.", "כדי שימצאו אתכם בגוגל."],
];
async function feature(n) {
  const [title, text] = FEATURES[n - 1];
  beat("m" + n, title);
  await st("unpoint");
  await st("feature", n, FEATURES.length, title, text);
  cue(`${title} ${text}`);
  await hold(600);
}

/* ---------- WhatsApp on the stage's phone ---------- */
const clockAt = (min) => { const d = new Date(Date.now() + min * 60000); return d.toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const msg = (text, { me = false, btns = [], img = "", at = 0 } = {}) => st("msg", (img ? `<img src="${img}" alt="">` : "") + esc(text) + (btns.length ? `<span class="btns">${btns.map((b) => `<span class="btn">${esc(b)}</span>`).join("")}</span>` : "") + `<time>${clockAt(at)}</time>`, me);
const hitBtn = (label) => st("hit", label);

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

const PH = path.join(ROOT, "shared/photos");
try {
  // Before the first frame: the home page at its examples, the camera on them, the hook over everything.
  await goApp("/");
  const demosY = await app().evaluate(() => document.querySelector("#demos").getBoundingClientRect().top + scrollY - 20);
  await app().evaluate((y) => scrollTo(0, y), demosY);
  await zoomTo(A("#demos"), { max: 1.25 });
  await st("slides", shots);
  await st("slide", 0);
  const HOOK = ["לקוח מחפש אתכם עכשיו.", "לא עניתם? הוא עובר לבא בתור.", "אתר שעונה לו, בונים בצ׳אט."];
  await p.evaluate((lines) => window.stage.lines(`<div class="stack">${lines.map((t) => `<div class="l huge">${window.stage.dotted(t)}</div>`).join("")}</div>`), HOOK);
  await st("full", true, true);
  await raw(300);
  await startRec();
  await raw(100);

  /* ---------- the hook: three lines over flashes of real demo sites ---------- */
  beat("hook", HOOK[0], "big");
  let slide = 0;
  for (let i = 0; i < HOOK.length; i++) {
    if (i) { await p.evaluate((i) => window.stage.goneN(".l", i - 1), i); hits.push({ t: clock(), k: "cut" }); }
    await p.evaluate((i) => window.stage.showN(".l", i), i); cue(HOOK[i]);
    for (let k = 0; k < 3; k++) { await st("slide", slide++ % shots.length); if (k) hits.push({ t: clock(), k: "tick" }); await raw(460); }
  }
  await st("slides", []);
  await p.evaluate(() => window.stage.lines(`<div class="l big">Easy Landing</div><div class="l small">אתר לעסק, שלא מפספס אף לקוח<span class="dot">.</span></div>`));
  hits.push({ t: clock(), k: "big" });
  await raw(60); await st("show", ".l"); cue("Easy Landing. אתר לעסק, שלא מפספס אף לקוח.");
  await raw(1300);
  await st("full", false);
  await raw(250);

  /* ---------- 1. the trade ---------- */
  await step(1);
  await now("ארבעה סוגי עסקים");
  // A tour of the trades, each tap turning the phone into another business: the variety the home page's loop shows.
  mark("h-trades");
  const chip = (id, say) => tap(A(`#chips .chip[data-id="${id}"]`), say, { zoom: false, hold: 250 });
  await tap(A('#cats button[data-cat="care"]'), "תורים וטיפולים", { zoom: false, hold: 300 }); await raw(500);
  await chip("barber", "מספרה"); await raw(500);
  await tap(A('#cats button[data-cat="learn"]'), "שיעורים ואירועים", { zoom: false, hold: 250 }); await raw(500);
  await chip("driving", "מורה לנהיגה"); await raw(500);
  await tap(A('#cats button[data-cat="home"]'), "בית וחצר", { zoom: false, hold: 250 }); await raw(500);
  await chip("garden", "גינון"); await raw(500);
  await tap(A('#cats button[data-cat="urgent"]'), "תקלות דחופות", { zoom: false, hold: 250 }); await raw(400);
  await chip("electrician", "חשמלאי"); await raw(450);
  await now("בוחרים תחום, והטלפון מתחלף");
  await tap(A('#chips .chip[data-id="plumber"]'), "אינסטלטור", { zoom: false, hold: 300 }); await raw(650);
  await tap(A("#toDemo"), "לדמו המלא", { max: 1.6, hold: 300 });
  await cut(async () => { await waitPath(/^\/plumber\/$/); await wide(); });

  /* ---------- 2. the demo ---------- */
  await step(2);
  mark("h-site");
  await now("ככה האתר ייראה ללקוחות שלכם", 600);
  await scrollApp(app(), 820, 900); await raw(200);
  await now("השירותים והמחירים, בטבלה", 500);
  await scrollApp(app(), 0, 450);
  await now("לקוח פותח את הצ׳אט");
  await tap(A(".lb-launch"), "נציג AI", { max: 1.5, hold: 300 });
  mark("h-chat");
  await zoomTo(A(".lb-panel"), { max: 1.45, pad: 40 });
  for (let i = 0; i < 2; i++) { // the job, then the photo (skipped)
    await A(".lb-panel .lb-chips button").waitFor({ timeout: 8000 }); await raw(200);
    if (i === 0) await now("שואל, והלקוח עונה בלחיצה");
    await tap(A(".lb-panel .lb-chips button"), null, { hold: 250, zoom: false });
  }
  await A(".lb-panel .lb-chips button").waitFor({ timeout: 8000 }); await hold(500);

  /* ---------- 3. the builder ---------- */
  await cut(async () => { await goApp("/"); await wide(); });
  await step(3);
  await tap(A('.hero .ctas a[href="build/"]'), "לבנות את האתר שלי", { max: 1.6, hold: 350 });
  await cut(async () => { await waitPath(/^\/build\/$/); await zoomTo(A("#startForm"), { max: 1.6, pad: 50 }); });
  await now("שם וטלפון");
  await point(A("#fName"), null, 250); await A("#fName").fill("אורן לוי"); await raw(250);
  await point(A("#fPhone"), null, 250); await A("#fPhone").fill("052-6359513"); await raw(250);
  await tap(A("#fConsent"), null, { hold: 250, zoom: false });
  await tap(A("#startForm button[type=submit]"), "מתחילים", { hold: 300, zoom: false });
  await cut(async () => { await A("#work:not([hidden])").waitFor(); await draftReady(); await wide(); });
  await now("משמאל האתר שלכם. מימין השאלות", 800);

  /* ---------- 4. the template: the camera stays wide, so the tap and the site that changes are both in view ---------- */
  await step(4);
  for (const [i, [look, name]] of [["blueprint", "שרטוט"], ["van", "שלט על הרכב"], ["luxe", "יוקרה חכמה"]].entries()) {
    await tap(A(`#guide .look[data-look="${look}"]`), name, { zoom: false, hold: 300 });
    await cut(async () => { await A(`#guide .look[data-look="${look}"][aria-pressed=true]`).waitFor(); await draftReady(); });
    if (!i) { await now("והאתר מתחלף מיד"); mark("h-look"); }
    await hold(i === 2 ? 800 : 600);
  }

  /* ---------- 5. the colours ---------- */
  await step(5);
  for (const [i, [pal, name]] of [["ocean", "ים"], ["violet", "סגול"]].entries()) {
    await tap(A(`#guide .pal[data-palette="${pal}"]`), name, { zoom: false, hold: 300 });
    await cut(async () => { await A(`#guide .pal[data-palette="${pal}"][aria-pressed=true]`).waitFor(); await draftReady(); });
    if (!i) { await now("אפשר להחליף גם אחר כך"); mark("h-pal"); }
    await hold(600);
  }
  await tap(A("#guide > .btn"), "ממשיכים", { zoom: false, hold: 300 });
  await nextQ(/איך קוראים לעסק/);

  /* ---------- 6. the questions ---------- */
  await step(6);
  const showDraft = async (sel, say, ms = 900) => {
    await cut(async () => { await draftReady(); const loc = D(sel); await loc.scrollIntoViewIfNeeded().catch(() => {}); await raw(150); await zoomTo(loc, { max: 1.6, pad: 40 }); });
    if (say) await point(D(sel), say, 0);
    await hold(ms);
    await st("unpoint");
  };
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  mark("h-q");
  await now("שם העסק");
  await point(A("#guide .other input"), null, 250); await A("#guide .other input").fill("אורן מים"); await raw(200);
  await tap(A("#guide .other button"), null, { zoom: false, hold: 250 });
  await nextQ(/באיזה אזור/);
  await now("אזור וישובים");
  await tap(A("#guide .chip"), null, { zoom: false, hold: 250 });
  await nextQ(/לאילו ישובים/);
  await tap(A("#guide > .btn"), "שמירה", { zoom: false, hold: 250 });
  await nextQ(/מה אתם עושים/);
  await now("השירותים שלכם");
  for (const i of [0, 1, 2, 3]) await tap(app().locator("#guide .chip").nth(i), null, { zoom: false, hold: 160 });
  await tap(A("#guide > .btn"), "שמירה", { zoom: false, hold: 250 });
  await nextQ(/להציג מחירים/);
  await now("מחירים לדוגמה. משאירים או משנים", 500);
  await tap(A("#guide .row .btn"), "שמירה", { zoom: false, hold: 250 });
  await nextQ(/תוך כמה זמן/);
  mark("h-fill");
  await showDraft(".order", "השירותים והמחירים באתר", 1000);
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  // The rest of the short questions (response time, hours, years, warranty, headline, intro, areas) are answered
  // with one tap each: the film shows the first and cuts the others, so the step stays short.
  await now("זמן חזרה, שעות, אחריות וכותרת: לוחצים ובוחרים");
  await tap(A("#guide .chip"), null, { zoom: false, hold: 220 }); await nextQ(/מתי אתם עובדים/);
  await cut(async () => {
    await app().locator("#guide .chip").nth(1).click(); await nextQ(/כמה שנים/);
    await app().locator("#guide .chip").nth(4).click(); await nextQ(/אחריות/);
    await app().locator("#guide .chip").nth(2).click(); await nextQ(/איזו כותרת/);
    await app().locator("#guide .chip.card").nth(1).click(); await nextQ(/פסקת פתיחה/);
    await app().locator("#guide .chip.card").nth(0).click(); await nextQ(/דף לכל אזור/);
    await A("#guide button.skip:last-of-type").click(); await nextQ(/אינסטגרם/);
  });
  await now("האינסטגרם, הפייסבוק והטיקטוק");
  for (const [net, v] of [["instagram", "@oren.mayim"], ["facebook", "OrenMayim"], ["tiktok", "@oren.mayim"]]) {
    const i = A(`#guide .socials input[data-net="${net}"]`);
    await point(i, null, 150); await i.fill(v); await raw(150);
  }
  await st("unpoint");
  await tap(A("#guide .socials + .btn"), "שמירה", { zoom: false, hold: 250 });
  await nextQ(/תמונות/);
  await showDraft(".social", "הרשתות שלכם באתר", 900);

  /* ---------- 7. photos ---------- */
  await step(7);
  await zoomTo(A("#guide"), { max: 1.6, pad: 30 });
  await tap(A("#guide .row .btn"), "לתמונות", { zoom: false, hold: 300 });
  await raw(250);
  await zoomTo(A("#photos"), { max: 1.6, pad: 30 });
  await tap(A("#rights"), "התמונות שלכם", { zoom: false, hold: 250 });
  await now("בוחרים מהטלפון");
  mark("h-photos");
  // The slots by what they say (the builder's photo step may grow): one of you, then the work.
  const labels = await app().evaluate(() => [...document.querySelectorAll("#slots .slot")].map((s) => s.textContent.trim()));
  const want = [labels.findIndex((t) => /שלכם/.test(t)), ...labels.map((t, i) => (/עבודה/.test(t) ? i : -1)).filter((i) => i >= 0).slice(0, 3)];
  if (want.includes(-1) || want.length < 4) throw new Error("photo slots changed: " + labels.join(" | "));
  for (const [k, file] of ["plumber-portrait.webp", "plumber-leak.webp", "plumber-drain.webp", "plumber-siphon.webp"].entries()) {
    const slot = app().locator("#slots .slot").nth(want[k]);
    await point(slot, null, 180);
    await slot.locator("input[type=file]").setInputFiles(path.join(PH, file));
    await cut(() => app().locator("#slots .slot").nth(want[k]).locator("img").waitFor({ timeout: 10000 }).catch(() => {}));
  }
  await st("unpoint");
  await now("והן כבר באתר");
  await showDraft(".field", null, 900);

  /* ---------- 8. the check ---------- */
  await step(8);
  await zoomTo(A("#frame"), { max: 1.2, pad: 6 });
  await now("גוללים את כל האתר");
  const df = draftFrame();
  const tall = await df.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await scrollApp(df, Math.min(tall, 3400), 2600); await raw(200);
  await now("משהו לא יושב? כותבים בצ׳אט");
  await scrollApp(df, 0, 700);
  await wide();
  await hold(500);

  /* ---------- 9. approve ---------- */
  await step(9);
  if (await A("#approveBox .btn").isDisabled()) throw new Error("the draft still misses something: " + (await A("#approveBox").textContent()));
  await tap(A("#approveBox .btn"), "מאשרים את האתר", { max: 1.6, hold: 350 });
  await raw(250);
  await zoomTo(A("#approveDlg"), { max: 1.6, pad: 30 });
  await now("נציג AI, הכול כלול");
  await point(A("#approveDlg .pkg"), "האתר, הפניות והצ׳אט", 0); await hold(1400);
  await st("unpoint");
  ai.queue.push({ names: ["oren-mayim", "oren-plumber", "instalator-hadera"] }); // the address suggestions (lib/builder.mjs suggestSlugs)
  await tap(A("#approveGo"), "מאשרים", { zoom: false, hold: 300 });
  await cut(() => A("#addrDlg[open] #addrList input[name=addr]").waitFor({ timeout: 15000 }));

  /* ---------- 10. the address, the payment, live ---------- */
  await step(10);
  await zoomTo(A("#addrDlg"), { max: 1.5, pad: 30 });
  await now("בוחרים כתובת לאתר");
  await point(A("#addrList .pkg"), "oren-mayim.easylanding.co.il", 0); await hold(1000);
  await st("unpoint");
  await tap(A("#addrGo"), "לשמור את הכתובת", { zoom: false, hold: 300 });
  await cut(async () => { await app().waitForFunction(() => /הכתובת: oren-mayim/.test(document.querySelector("#approveBox").textContent), null, { timeout: 10000 }); await zoomTo(A("#approveBox"), { max: 1.5, pad: 30 }); });
  await now("המחיר סופי. היום משלמים רק את ההקמה", 800);
  await tap(A("#termsOk"), "מאשרים את התנאים", { zoom: false, hold: 300 });
  await tap(app().locator("#approveBox .btn").filter({ hasText: "לתשלום מאובטח" }), "לתשלום מאובטח", { zoom: false, hold: 350 });
  await cut(async () => { await waitPath(/^\/pay\/\d+$/); await wide(); });
  await now("משלמים בכרטיס, בדף מאובטח");
  await tap(A("a.pay"), "לשלם", { max: 1.6, hold: 400 });
  await cut(async () => {
    await waitPath(/^\/build\/$/);
    await app().waitForFunction(() => /האתר באוויר/.test(document.querySelector("#approveBox").textContent), null, { timeout: 30000 });
    await zoomTo(A("#approveBox"), { max: 1.5, pad: 30 });
  });
  mark("h-live");
  await now("האתר עלה לאוויר", 1100);
  await app().evaluate(() => { const b = document.querySelector("#approveBox"); const h = [...b.querySelectorAll("h3")].find((x) => /הלקוחות הראשונים/.test(x.textContent)); if (h) b.scrollTop = h.offsetTop - 10; });
  await now("ואיך מביאים את הלקוחות הראשונים", 1000);
  await st("allDone");

  /* ---------- what you get ---------- */
  await cut(async () => { await goApp("/__live/"); await wide(); });
  await feature(1);
  mark("poster");
  await hold(900);
  await scrollApp(app(), 640, 900); await raw(250); await scrollApp(app(), 0, 500);

  await feature(2);
  await tap(A(".lb-launch"), null, { max: 1.45, hold: 300 });
  await zoomTo(A(".lb-panel"), { max: 1.45, pad: 40 });
  await A(".lb-panel .lb-chips button").waitFor({ timeout: 8000 }); await raw(200);
  await tap(A(".lb-panel .lb-chips button"), null, { hold: 280, zoom: false });
  await A(".lb-panel .lb-photo.on").waitFor({ timeout: 8000 }); await raw(250);

  await feature(3);
  await point(A(".lb-panel .lb-photo"), "לצרף תמונה", 250); await st("unpoint");
  await A(".lb-panel .lb-photo input[type=file]").setInputFiles(path.join(PH, "plumber-siphon.webp"));
  await A(".lb-panel .lb-est").waitFor({ timeout: 10000 });
  await raw(150);
  await point(A(".lb-panel .lb-est"), null, 0);
  mark("h-photo");
  await hold(1500);
  await st("unpoint");
  // The rest of the chat (how urgent, the town, the name, the phone) goes by in a cut, to the enquiry received.
  await cut(async () => {
    const typed = ["חדרה", "דנה כהן", "054-1234567"];
    const done = () => app().evaluate(() => [...document.querySelectorAll(".lb-panel .lb-msg")].some((m) => /אישור בדרך/.test(m.textContent)));
    for (let guard = 0; guard < 40 && !(await done()); guard++) {
      const form = A(".lb-panel form.on input"), chip = A(".lb-panel .lb-chips button");
      if (typed.length && await form.isVisible().catch(() => false)) { await form.fill(typed.shift()); await form.press("Enter"); }
      else if (await chip.isVisible().catch(() => false)) await chip.click().catch(() => {});
      await raw(250);
    }
    if (!(await done())) throw new Error("the live chat did not reach the enquiry received");
  });
  await now("והפנייה נשמרת", 700);

  const photoUrl = "data:image/webp;base64," + fs.readFileSync(path.join(PH, "plumber-siphon.webp")).toString("base64");
  const svc = (T.ls_drafts.at(-1).content.services || []).find((s) => /סתימה/.test(s.name)) || { name: "סתימה בכיור, באסלה או בניקוז", price: "250 עד 450 ₪" };
  await feature(4);
  await st("phone", true, "אורן מים", "א", "העסק");
  await raw(250);
  await msg(`היי דנה, כאן אורן מים. קיבלנו את הפנייה שלכם בנושא ${svc.name}, ונחזור אליכם עד שעתיים בשעות העבודה. אם יש עוד פרטים או תמונה, אפשר לשלוח כאן.`);
  mark("h-reply");
  await hold(1100);
  await now("זה מה שהלקוח מקבל, מהמספר שלכם");
  await hold(1500);

  await feature(5);
  await st("phone", true, "אורן מים · פניות מהאתר", "א", "ההתראות שלכם");
  await raw(150);
  await msg(`פנייה חדשה מהאתר. שם: דנה כהן. טלפון: 054-1234567. נושא: ${svc.name}. פרטים: חדרה · מהתמונה: סיפון מתחת לכיור במטבח (${svc.price}). מקור: גוגל.`, { img: photoUrl, btns: ["טיפלתי"] });
  mark("h-wa");
  await now("וזה מה שאתם מקבלים");
  await hold(1500);
  await msg(`תזכורת: הפנייה של דנה כהן (054-1234567) מחכה כבר 30 דקות ועוד לא סומנה כטופלה.`, { btns: ["טיפלתי"], at: 30 });
  mark("h-remind");
  await now("עוד לא חזרתם? תזכורת");
  await hold(1100);
  await hitBtn("טיפלתי"); await raw(250);
  await msg("טיפלתי", { me: true, at: 31 });
  await raw(300);

  await feature(6);
  await msg("סומן כטופל: דנה כהן. לשלוח לדנה בקשה לכתוב ביקורת בגוגל? זו הודעה אחת, פעם אחת.", { btns: ["כן, לשלוח", "לא הפעם"], at: 31 });
  await hold(1200);
  await hitBtn("כן, לשלוח"); await raw(250);
  await msg("כן, לשלוח", { me: true, at: 31 });
  await raw(250);
  await msg("נשלח לדנה. תודה!", { at: 31 });
  await hold(1100);
  await st("phone", false);

  await cut(async () => {
    await goApp("/plumber/");
    await app().evaluate(() => { const s = document.querySelector("#live-ai"); scrollTo(0, s.getBoundingClientRect().top + scrollY - 40); });
    await raw(200); await zoomTo(A("#live-ai .wrap"), { max: 1.3, pad: 20 });
  });
  await feature(7);
  await tap(A("#live-ai .asks button"), "כמה עולה לפתוח סתימה במטבח?", { zoom: false, hold: 400 });
  await cut(async () => { await app().waitForFunction(() => /250 עד 450/.test((document.querySelector(".ab-panel .ab-body") || {}).textContent || ""), null, { timeout: 10000 }); await raw(200); await zoomTo(A(".ab-panel"), { max: 1.45, pad: 30 }); });
  mark("h-price");
  await hold(1200);
  await now("מהמחירון שלכם בלבד");
  await hold(1200);

  await cut(async () => { await goApp("/panel/#k=oren-mayim:film-sample-key-0123"); await app().addStyleTag({ content: "#worth{display:none!important}" }); await A("#list .lead").waitFor({ timeout: 10000 }); await wide(); });
  await feature(8);
  await hold(500);
  await zoomTo(A("#list .lead"), { max: 1.5, pad: 40 });
  await point(A("#list .lead .pic"), "הפנייה, עם התמונה", 0);
  mark("h-panel");
  await hold(1600);
  await st("unpoint");

  await feature(9);
  await cut(async () => { await app().evaluate(() => { document.querySelector("#sx").open = true; }); await raw(150); await zoomTo(A("#sx-tiles"), { max: 1.5, pad: 40 }); });
  await hold(1200);
  await zoomTo(A("#sx-days"), { max: 1.5, pad: 60 });
  await hold(800);

  await feature(10);
  await cut(async () => { await app().evaluate(() => { document.querySelector("#sx").open = false; document.querySelector("#links").open = true; }); await raw(150); await zoomTo(A("#links-list"), { max: 1.5, pad: 40 }); });
  await hold(1000);
  await tap(app().locator("#links-list button", { hasText: "QR" }).first(), "QR", { zoom: false, hold: 300 });
  await cut(async () => { await A("#qr-dlg[open] img").waitFor({ timeout: 8000 }); await zoomTo(A("#qr-dlg"), { max: 1.4, pad: 30 }); });
  await hold(1300);

  await feature(11);
  await st("phone", true, "אורן מים · פניות מהאתר", "א", "ההתראות שלכם");
  await raw(150);
  mark("h-report");
  await msg("הסיכום של ספטמבר: 486 כניסות לאתר ו-31 פניות. 9 מהן הגיעו מחוץ לשעות העבודה, ונשמרו בלוח. 28 סומנו כטופלו. רוב הפניות הגיעו דרך: גוגל. כל הפרטים בלוח הפניות שלכם.");
  await hold(1200);
  await now("ב־1 לכל חודש");
  await hold(1400);

  await feature(12);
  await msg("חירום", { me: true });
  await raw(500);
  const area = (T.ls_clients.at(-1) || {}).area || T.ls_drafts.at(-1).content.area || "";
  status = { state: "urgent", text: `זמינים עכשיו לקריאות דחופות${area ? " ב" + area : ""}. כתבו או התקשרו.` };
  await msg(`באתר כתוב עכשיו: ${status.text} פניות שייכנסו עכשיו יסומנו כדחופות. לסיום, כתבו ״אוטומטי״.`);
  await hold(1200);
  await st("phone", false);
  await cut(async () => { await app().evaluate(() => document.querySelector("#qr-dlg").close()); await goApp("/__live/"); await app().waitForFunction(() => { const e = document.querySelector("[data-avail]"); return e && !e.hidden && e.dataset.state === "urgent"; }, null, { timeout: 8000 }); await wide(); });
  await zoomTo(A("[data-avail]"), { max: 2.0, pad: 160 });
  await point(A("[data-avail]"), "מה שכתבתם, באתר", 0);
  await hold(1500);
  await wide();
  await point(A(".lb-launch"), "קריאה דחופה", 0);
  await hold(800);
  await st("unpoint");

  await feature(13);
  await cut(async () => { await A(".social").scrollIntoViewIfNeeded(); await raw(150); await zoomTo(A(".social"), { max: 1.8, pad: 60 }); });
  await point(A(".social-links"), "אינסטגרם, פייסבוק, טיקטוק", 0);
  await hold(1700);
  await st("unpoint");

  await feature(14);
  const svcPage = Object.keys(live()).find((f) => /^service-/.test(f));
  await cut(async () => { await goApp("/__live/" + svcPage); await wide(); });
  await hold(1000);
  await scrollApp(app(), 420, 700); await raw(200);
  await hold(1200);

  /* ---------- the end: the packages, and where to start ---------- */
  beat("end", "נציג AI. בלי התחייבות.", "big");
  await st("slides", []);
  await p.evaluate(() => window.stage.lines(`<div class="l mid">חבילה אחת. בלי התחייבות<span class="dot">.</span></div>
<div class="plans one">
  <div class="l plan rec"><h3>נציג AI</h3><div class="p">1,590 ₪ <small>הקמה</small></div><div class="m">+ 290 ₪ לחודש, מחיר השקה נעול</div><div class="w">האתר, הצ׳אט, המענה בוואטסאפ, הלוח והדוח</div></div>
</div>
<div class="l fine">המחירים סופיים · מבטלים מתי שרוצים</div>`, true));
  await st("full", true);
  await raw(80); await st("showN", ".l", 0); await raw(250); await st("showN", ".l", 1); await raw(250); await st("showN", ".l", 2);
  cue("חבילה אחת, בלי התחייבות. נציג AI: 1,590 ₪ הקמה, ועוד 290 ₪ לחודש, מחיר השקה נעול. המחירים סופיים. מבטלים מתי שרוצים.");
  await hold(3200);
  beat("cta", "לבנות את האתר שלי", "big");
  await p.evaluate(() => window.stage.lines(`<div class="l big">אף פנייה לא הולכת לאיבוד<span class="dot">.</span></div><div class="l cta">לבנות את האתר שלי</div><div class="l addr">service-pro-web.netlify.app/build</div><div class="l tagline">Easy Landing · אתרים שבונים עסקים</div>`, true));
  for (let i = 0; i < 4; i++) { await st("showN", ".l", i); await raw(250); }
  cue("אף פנייה לא הולכת לאיבוד. לבנות את האתר שלי: service-pro-web.netlify.app/build");
  await hold(2600);
  endT = clock();
  await cdp.send("Page.stopScreencast");
} catch (e) {
  // What the stage showed when it stopped, to see which page or selector changed.
  await p.screenshot({ path: path.join(os.tmpdir(), "process-video-failed.png") }).catch(() => {});
  console.log("stopped: see " + path.join(os.tmpdir(), "process-video-failed.png"));
  throw e;
} finally {
  await ctx.close(); await browser.close(); server.close();
}

/* ---------- the cut: still frames shortened, network waits removed ---------- */
// Frames come only when something changes: each one lasts until the next, and the last until the recording stopped.
const kept = (s, e) => { let k = e - s; for (const [a, b] of drops) k -= Math.max(0, Math.min(e, b) - Math.max(s, a)); return Math.max(0, k); };
const capOf = (s, e) => holds.some(([a, b]) => s < b - 0.05 && e > a + 0.05) ? HOLD_CAP : CAP;
const spans = frames.map((f, i) => {
  const s = f.t, e = i + 1 < frames.length ? frames[i + 1].t : Math.max(endT, f.t + 0.6);
  return { file: f.file, s, e, dur: Math.min(kept(s, e), capOf(s, e)) };
});
let o = 0;
for (const sp of spans) { sp.o = o; o += sp.dur; }
const total = o;
// Where a moment of the recording lands in the film.
const at = (t) => {
  let lo = 0, hi = spans.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (spans[mid].s <= t) lo = mid; else hi = mid - 1; }
  const sp = spans[lo];
  return t < sp.s ? 0 : +(sp.o + Math.min(sp.dur, kept(sp.s, Math.min(t, sp.e)))).toFixed(2);
};
const list = spans.filter((sp) => sp.dur >= 0.0005).map((sp) => `file '${sp.file}'\nduration ${sp.dur.toFixed(4)}`).join("\n") + `\nfile '${spans.at(-1).file}'\n`;
fs.writeFileSync(path.join(dir, "list.txt"), list);
// The silent master: scripts/process-voice.mjs lays the music (and later the narration) on it and writes the film the site plays.
const out = WIDE ? path.join(os.tmpdir(), "process-wide.mp4") : path.join(ROOT, "../scripts/process-voice/film.mp4");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
  "-vf", `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "28", "-tune", "animation", "-movflags", "+faststart", "-an", out]);
fs.rmSync(dir, { recursive: true, force: true });
const secs = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim());
// The beats (one per step and per feature: the narration's lines and the film page's chapters), the captions of the
// on-screen titles, the cuts for the music's accents, and named moments for the home page's loop.
const outBeats = beats.map((b, i) => ({ id: b.id, at: at(b.t), title: b.title })).map((b, i, a) => ({ ...b, len: +((a[i + 1] ? a[i + 1].at : secs) - b.at).toFixed(2) }));
const outCues = cues.map((c, i) => ({ from: at(c.t), to: i + 1 < cues.length ? at(cues[i + 1].t) : secs, text: c.text })).filter((c) => c.to - c.from > 0.2);
const meta = { length: +secs.toFixed(2), beats: outBeats, cues: outCues, hits: hits.map((h) => ({ t: at(h.t), k: h.k })), marks: Object.fromEntries(Object.entries(marks).map(([k, t]) => [k, at(t)])) };
fs.writeFileSync(out.replace(/\.mp4$/, ".json"), JSON.stringify(meta, null, 1) + "\n");
// The poster: the live site, the moment "what you get" starts.
if (!WIDE) execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(meta.marks.poster + 0.8), "-i", out, "-frames:v", "1", "-vf", "scale=1280:-2", "-c:v", "libwebp", "-quality", "78", path.join(ROOT, "shared/video/process/process-poster.webp")]);
console.log("beats: " + outBeats.map((b) => `${b.id}:${b.at.toFixed(1)}`).join(" "));
console.log(`${out} · ${secs.toFixed(1)} s (recorded ${(endT - frames[0].t).toFixed(1)} s) · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · ${frames.length} frames`);
