// Records the loop at the top of the home page (demos/index.html, the hero): the plumber template, rendered by the
// builder, in a phone and a browser. It changes template and colours by itself, and an enquiry comes in on WhatsApp.
// The stage is scripts/hero-stage.html. The last frame matches the first, so the loop has no jump.
// Run: node scripts/hero-video.mjs [out-dir]   (default demos/shared/video/hero). Needs Playwright and ffmpeg.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { SAMPLE } from "./tests/builder-sample.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(new URL("../demos", import.meta.url).pathname);
const STAGE = fs.readFileSync(new URL("./hero-stage.html", import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "shared/video/hero"));
const P = await import(new URL("../demos/netlify/lib/templates/plumber.mjs", import.meta.url).href);
const W = 1200, H = 1000, PORT = 8798;

// Template, then colours, then template again, and back to where it started.
const STEPS = [
  ["blueprint-blue", null], ["blueprint-night", "pal"], ["certificate-green", "look"], ["certificate-plum", "pal"],
  ["van-red", "look"], ["van-teal", "pal"], ["blueprint-blue", "look"],
];
const VARIANTS = [...new Set(STEPS.map(([v]) => v))];
const PHOTOS = { portrait: "/shared/photos/plumber-portrait.webp", work1: "/shared/photos/plumber-leak.webp", work2: "/shared/photos/plumber-drain.webp", work3: "/shared/photos/plumber-siphon.webp" };
const page = (v) => { const [look, palette] = v.split("-"); return P.render({ ...SAMPLE, look, palette }, { mode: "site", assets: "/shared/", photos: PHOTOS })["index.html"]; };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  let m;
  if (u.pathname === "/__stage") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(STAGE); }
  if ((m = /^\/__v\/([a-z]+-[a-z]+)\.html$/.exec(u.pathname))) { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(page(m[1])); }
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
}).listen(PORT);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "he-IL" });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("page error:", e.message));
await p.route(/\/api\//, (r) => r.abort());
await p.goto(`http://localhost:${PORT}/__stage`);
const looks = Object.entries(P.LOOKS).map(([id, l]) => ({ id, label: l.label, palettes: Object.entries(l.palettes).map(([pid, x]) => ({ id: pid, c: l.dark ? x.hero : x.accent })) }));
await p.evaluate((d) => window.hero.setup(d), { variants: VARIANTS, looks });
await p.waitForLoadState("networkidle");
await p.waitForFunction(() => [...document.querySelectorAll("iframe")].every((f) => f.contentDocument && f.contentDocument.readyState === "complete"));
await p.evaluate(async () => { await document.fonts.ready; for (const f of document.querySelectorAll("iframe")) await f.contentDocument.fonts.ready; });
// Hide the chat button inside the frames: it would cover the phone's site, and the loop is about the design.
await p.evaluate(() => document.querySelectorAll("iframe").forEach((f) => { const s = f.contentDocument.createElement("style"); s.textContent = ".lb-launch{display:none!important}"; f.contentDocument.head.append(s); }));
await p.evaluate((v) => window.hero.show(v), STEPS[0][0]);
await p.waitForTimeout(1200);

const wait = (ms) => p.waitForTimeout(ms);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hero-"));
const frames = [];
const cdp = await ctx.newCDPSession(p);
cdp.on("Page.screencastFrame", async (f) => {
  const file = path.join(dir, String(frames.length).padStart(6, "0") + ".jpg");
  fs.writeFileSync(file, Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch { /* closing */ }
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
const t0 = Date.now() / 1000;

// The loop: about 12 seconds.
await wait(1100);
for (const [v, kind] of STEPS.slice(1)) {
  const pt = await p.evaluate(([v, k]) => window.hero.target(v, k), [v, kind]);
  await wait(650);
  await p.evaluate((pt) => window.hero.click(pt), pt);
  await p.evaluate((v) => window.hero.show(v), v);
  await wait(kind === "look" ? 1350 : 950);
}
await p.evaluate(() => window.hero.rest());
await wait(500);
await p.evaluate(() => window.hero.notif(true));
await wait(2300);
await p.evaluate(() => window.hero.notif(false));
await wait(900);
const tEnd = Date.now() / 1000;
await cdp.send("Page.stopScreencast");
await ctx.close(); await browser.close(); server.close();

// Frames come only when something changes: each one lasts until the next, the last until the end.
const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, ((frames[i + 1] || { t: tEnd }).t - f.t)).toFixed(3)}`).join("\n") + `\nfile '${frames.at(-1).file}'\n`;
fs.writeFileSync(path.join(dir, "list.txt"), list);
fs.mkdirSync(OUT, { recursive: true });
const mp4 = path.join(OUT, "hero.mp4"), webm = path.join(OUT, "hero.webm"), poster = path.join(OUT, "hero-poster.webp");
const vf = `fps=30,scale=960:800:flags=lanczos,format=yuv420p`;
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-vf", vf,
  "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "27", "-tune", "animation", "-movflags", "+faststart", "-an", mp4]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", mp4, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-an", webm]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", mp4, "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", poster]);
fs.rmSync(dir, { recursive: true, force: true });
const secs = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString().trim();
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(2);
console.log(`hero: ${Number(secs).toFixed(1)} s (recorded ${(tEnd - t0).toFixed(1)}) · mp4 ${mb(mp4)} MB · webm ${mb(webm)} MB · ${frames.length} frames`);
