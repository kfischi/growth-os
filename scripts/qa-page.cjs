#!/usr/bin/env node
// QA for static pages under demos/ or clients/.
//
// Serves a directory over HTTP, opens a page at desktop and mobile widths and
// reports: horizontal overflow, JS errors, console errors, broken local links
// and images, missing <title>/lang/dir/viewport. Saves screenshots.
//
// Usage:
//   node scripts/qa-page.cjs <dir> [page-path] [--out <screenshot-dir>]
//   node scripts/qa-page.cjs demos
//   node scripts/qa-page.cjs demos leads-demo/ --out /tmp/qa
//
// Needs Playwright with a Chromium build. If it is not installed:
//   npm i -D playwright && npx playwright install chromium
// Exit code 1 when any check fails.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? args[outIdx + 1] : path.join(require("node:os").tmpdir(), "qa-page");
if (outIdx >= 0) args.splice(outIdx, 2);
const [rootArg, pageArg = ""] = args;
if (!rootArg) {
  console.error("Usage: node scripts/qa-page.cjs <dir> [page-path] [--out <dir>]");
  process.exit(2);
}
const root = path.resolve(rootArg);
fs.mkdirSync(outDir, { recursive: true });

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, urlPath);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404).end("not found"); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const VIEWPORTS = [
  ["desktop", { width: 1280, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const target = new URL(pageArg, base).href;
  const browser = await chromium.launch();
  const failures = [];

  for (const [label, viewport] of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const fail = (msg) => failures.push(`[${label}] ${msg}`);
    page.on("pageerror", (e) => fail(`JS error: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") fail(`console error: ${m.text()}`); });
    page.on("response", (r) => {
      if (r.url().startsWith(base) && r.status() >= 400) fail(`HTTP ${r.status()}: ${r.url().slice(base.length - 1)}`);
    });

    // The Netlify Functions (/api/...) don't run on this static server: answer them with an empty 204,
    // as the visit counter does in production, so only the page itself is checked.
    await page.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
    await page.goto(target, { waitUntil: "networkidle" });

    const meta = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      title: document.title.trim(),
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      viewport: !!document.querySelector('meta[name="viewport"]'),
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
      localLinks: [...document.querySelectorAll("a[href]")]
        .map((a) => a.href)
        .filter((h) => h.startsWith(location.origin) && !h.includes("#")),
    }));

    if (meta.overflow) fail("horizontal overflow (page scrolls sideways)");
    if (!meta.title) fail("missing <title>");
    if (!meta.viewport) fail("missing viewport meta");
    if (label === "desktop" && (meta.lang !== "he" || meta.dir !== "rtl")) {
      console.log(`note: <html lang="${meta.lang}" dir="${meta.dir}"> (expected he/rtl for Hebrew pages)`);
    }
    meta.brokenImages.forEach((src) => fail(`broken image: ${src}`));
    if (label === "desktop") {
      for (const href of new Set(meta.localLinks)) {
        const r = await page.request.get(href);
        if (r.status() >= 400) fail(`broken link (${r.status()}): ${href.slice(base.length - 1)}`);
      }
    }

    const shot = path.join(outDir, `${label}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`${label}: screenshot ${shot}`);
    await page.close();
  }

  await browser.close();
  server.close();

  if (failures.length) {
    console.log(`\nFAIL (${failures.length})`);
    failures.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("\nPASS: no overflow, no JS/console errors, no broken local links or images");
})();
