// The site builder page in a real browser (phone and desktop): start, chat, the draft filling up, a photo,
// approval, and coming back later. The page talks to the real functions, which run here against builder-fakes.mjs.
// Run: node scripts/tests/builder-page.test.mjs   (needs Playwright, see CLAUDE.md > Checks)
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { T, ai } from "./builder-fakes.mjs";
import { SAMPLE } from "./builder-sample.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(new URL("../../demos", import.meta.url).pathname);
const F = new URL("../../demos/netlify/functions/", import.meta.url).href;
const builder = (await import(F + "builder.mjs")).default;
const draft = (await import(F + "draft.mjs")).default;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
const PORT = 8791, BASE = `http://localhost:${PORT}`;

// Photos live in the fake storage; the draft points at https://x.supabase.co/..., which the browser gets from here.
const { storage } = await import("./builder-fakes.mjs");

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

const fill = { reply: "עדכנו את כל הפרטים. תסתכלו על האתר מצד שמאל.", set: Object.entries(SAMPLE).filter(([k]) => !["services", "towns", "whatsapp"].includes(k)).map(([field, value]) => ({ field, value: String(value) })), services: SAMPLE.services, towns: SAMPLE.towns };

// A 14-second portrait video, as a phone would make (VP8: the test browser can decode it).
let clip = null;
try {
  clip = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "builder-")), "phone.webm");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=720x1280:rate=30", "-t", "14", "-c:v", "libvpx", "-b:v", "1M", clip]);
} catch { clip = null; console.log("no ffmpeg: the video step is skipped"); }

const b = await chromium.launch();
let bad = 0;
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  // The test browser has no H.264 encoder (Chrome and Safari do), so the same conversion runs with VP9.
  await ctx.addInitScript(() => { window.NR_VIDEO_CODEC = "vp9"; });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (msg) => { if (msg.type() === "error" && !/Failed to load resource/.test(msg.text())) errs.push(msg.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/builder\//, (r) => {
    const key = new URL(r.request().url()).pathname.replace("/storage/v1/object/public/builder/", "");
    const buf = storage.get(key);
    return buf ? r.fulfill({ status: 200, contentType: key.endsWith(".jpg") ? "image/jpeg" : key.endsWith(".mp4") ? "video/mp4" : "image/webp", body: buf }) : r.fulfill({ status: 404 });
  });
  const check = async (what, fn) => { try { await fn(); } catch (e) { bad++; console.log(`FAIL ${w}px ${what}: ${e.message.split("\n")[0]}`); } };
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

  await p.goto(`${BASE}/build/`);
  await check("start screen", async () => { assert.ok(await p.isVisible("#startForm")); assert.equal(await overflow(), false); });
  await p.fill("#fName", "אורן לוי"); await p.fill("#fPhone", "052-6359513");
  await p.click("#startForm button[type=submit]");
  await check("consent is required", async () => { assert.match(await p.textContent("#startErr"), /ההסכמה/); });
  await p.check("#fConsent"); await p.click("#startForm button[type=submit]");
  await p.waitForSelector("#work:not([hidden])");
  await check("greeting and link", async () => {
    assert.match(await p.textContent("#log"), /היי אורן, נבנה יחד/);
    assert.match(await p.evaluate(() => location.hash), /^#d=[0-9a-f-]{36}:/);
    assert.equal(await overflow(), false);
  });

  ai.queue.push(fill);
  await p.fill("#msg", "אורן מים, אינסטלציה בחדרה והשרון. הנה כל הפרטים");
  await p.click("#send");
  await p.waitForFunction(() => document.querySelectorAll("#log .msg.them").length >= 2, null, { timeout: 8000 });
  await check("the chat fills the draft", async () => {
    assert.match(await p.textContent("#log"), /עדכנו את כל הפרטים/);
    assert.equal(await p.textContent("#progCount"), "10 מתוך 10");
    assert.equal(await p.isEnabled("#approveBox .btn"), true);
    if (w < 860) await p.click("#tabSite");
    const frame = p.frameLocator("#frame");
    await frame.locator(".logo span").waitFor();
    assert.equal(await frame.locator(".logo span").textContent(), "אורן מים");
    assert.equal(await frame.locator(".ribbon").count(), 1);
    if (w < 860) await p.click("#tabChat");
  });

  await check("a photo, resized in the browser", async () => {
    await p.evaluate(() => { document.querySelector("#photos").open = true; });
    await p.setInputFiles("#slots .slot:nth-child(1) input", path.join(ROOT, "shared/photos/plumber-portrait.webp"));
    assert.match(await p.textContent("#log"), /סמנו קודם/);
    await p.check("#rights");
    await p.setInputFiles("#slots .slot:nth-child(1) input", path.join(ROOT, "shared/photos/plumber-portrait.webp"));
    await p.waitForSelector("#slots .slot:nth-child(1) img", { timeout: 8000 });
    const loaded = await p.$eval("#slots .slot:nth-child(1) img", (i) => new Promise((r) => (i.complete ? r(i.naturalWidth) : (i.onload = () => r(i.naturalWidth)))));
    assert.ok(loaded > 0, "the uploaded photo shows");
  });

  if (clip) await check("a short video, cut and converted in the browser", async () => {
    await p.setInputFiles("#vid .pick input", clip);
    await p.waitForSelector("#videoDlg[open]");
    await p.waitForFunction(() => !document.querySelector("#vPick").hidden, null, { timeout: 8000 });
    assert.equal(await p.$eval("#vStart", (i) => i.max), "4", "14 seconds: the clip can start up to second 4");
    await p.$eval("#vStart", (i) => { i.value = "2"; i.dispatchEvent(new Event("input")); });
    await p.click("#vGo");
    await p.waitForSelector("#vid video", { timeout: 60000 });
    const d = T.ls_drafts.at(-1);
    const { storage: st } = await import("./builder-fakes.mjs");
    const movie = st.get(d.video.path);
    assert.equal(movie.toString("ascii", 4, 8), "ftyp", "an MP4 was uploaded");
    assert.ok(movie.length < 4_500_000, "small enough");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clip-")); fs.writeFileSync(path.join(dir, "c.mp4"), movie);
    const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", path.join(dir, "c.mp4")]).toString());
    assert.equal(probe.streams.length, 1, "video only, no sound"); assert.equal(probe.streams[0].width, 720); assert.equal(probe.streams[0].height, 1280);
    assert.ok(Math.abs(Number(probe.format.duration) - 10) < 0.5, "10 seconds, got " + probe.format.duration);
    assert.ok(["jpg", "webp"].includes(d.video.poster.ext));
    if (w < 860) await p.click("#tabSite");
    await p.frameLocator("#frame").locator(".reel video").waitFor({ timeout: 8000 });
    if (w < 860) await p.click("#tabChat");
  });

  await check("approve", async () => {
    await p.click("#approveBox .btn");
    await p.waitForSelector("#approveDlg[open]");
    await p.click("input[name=plan][value=three]");
    await p.click("#approveGo");
    await p.waitForFunction(() => /השלב הבא: תשלום/.test(document.querySelector("#approveBox").textContent));
    assert.equal(await p.isVisible("#compose"), false, "the chat is locked after approval");
    const d = T.ls_drafts.at(-1); assert.equal(d.status, "client_approved"); assert.equal(d.plan, "three");
  });

  await check("coming back later", async () => {
    await p.goto(`${BASE}/build/`); // no hash: from this browser's storage
    await p.waitForSelector("#work:not([hidden])");
    assert.match(await p.textContent("#approveBox"), /השלב הבא: תשלום/);
    assert.match(await p.evaluate(() => location.hash), /^#d=/);
    assert.equal(await overflow(), false);
  });
  await p.screenshot({ path: `/tmp/qa-page/builder-${w}.png`, fullPage: false }).catch(() => {});
  if (errs.length) console.log("errors:", errs.join(" | ").slice(0, 1500));
  await check("no errors", async () => assert.deepEqual(errs, []));
  await ctx.close();
}
await b.close(); server.close();
if (bad) { console.log(`${bad} builder page checks failed`); process.exit(1); }
console.log("builder page: all checks passed (390 and 1280 px)");
