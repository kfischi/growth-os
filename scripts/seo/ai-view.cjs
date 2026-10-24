#!/usr/bin/env node
// What an AI assistant's crawler sees of the public site: for every page in demos/sitemap.xml, its title,
// description, canonical, robots line, structured data types, and its text as plain HTML (most AI crawlers,
// GPTBot, ClaudeBot and PerplexityBot among them, read the HTML and do not run scripts). With --rendered it also
// loads each page in a browser and lists the text that appears only after the scripts run, which those crawlers
// miss. Writes one Markdown file per page and summary.md to the output folder, plus llms.txt and robots.txt.
// Usage: node scripts/seo/ai-view.cjs <out-dir> [--rendered]   (--rendered needs Playwright: NODE_PATH=/opt/node-tools/node_modules)
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "../../demos");
const [out, ...flags] = process.argv.slice(2);
if (!out) { console.error("usage: node scripts/seo/ai-view.cjs <out-dir> [--rendered]"); process.exit(2); }
const rendered = flags.includes("--rendered");
fs.mkdirSync(out, { recursive: true });

const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const meta = (html, re) => { const m = html.match(re); return m ? decode(m[1]).trim() : ""; };

// The page as a crawler without scripts reads it: headings marked, everything else as lines of text.
function plainText(html) {
  let s = html.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<h([1-3])\b[^>]*>/gi, (_, n) => "\n" + "#".repeat(+n) + " ").replace(/<\/h[1-3]>/gi, "\n");
  s = s.replace(/<(br|\/p|\/li|\/div|\/section|\/summary|\/details|\/tr|\/dt|\/dd)\b[^>]*>/gi, "\n").replace(/<li\b[^>]*>/gi, "\n- ");
  s = decode(s.replace(/<[^>]+>/g, " "));
  return s.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

function jsonLdTypes(html) {
  const types = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x["@type"]) types.push([].concat(x["@type"]).join("/")); Object.values(x).forEach(walk); } };
      walk(JSON.parse(m[1]));
    } catch { types.push("(invalid JSON-LD)"); }
  }
  return [...new Set(types)];
}

const fileOf = (p) => path.join(ROOT, p.endsWith("/") ? p + "index.html" : p);
const slugOf = (p) => (p.replace(/^\/|\/$/g, "").replace(/\//g, "__") || "home");

async function renderedTexts() {
  const { chromium } = require("playwright");
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".mp4": "video/mp4", ".vtt": "text/vtt" };
  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) { res.statusCode = 503; return res.end("{}"); }
    let f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0])); if (f.endsWith(path.sep) || f.endsWith("/")) f = path.join(f, "index.html");
    if (!f.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", types[path.extname(f)] || "application/octet-stream"); res.end(d); });
  });
  await new Promise((r) => server.listen(0, r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const texts = {};
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: "load" }).catch(() => {});
    await page.waitForTimeout(600);
    texts[p] = await page.evaluate(() => document.body.innerText).catch(() => "");
  }
  await browser.close(); server.close();
  return texts;
}

(async () => {
  const live = rendered ? await renderedTexts() : {};
  const rows = [];
  for (const p of pages) {
    const f = fileOf(p);
    if (!fs.existsSync(f)) { rows.push(`| ${p} | missing file | | | |`); continue; }
    const html = fs.readFileSync(f, "utf8");
    const title = meta(html, /<title>([\s\S]*?)<\/title>/i);
    const desc = meta(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
    const canon = meta(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
    const robots = meta(html, /<meta\s+name="robots"\s+content="([^"]*)"/i);
    const ld = jsonLdTypes(html);
    const text = plainText(html);
    let onlyJs = "";
    if (rendered) {
      // Compared without spaces: "לוואטסאפ ." in the plain text and "לוואטסאפ." on screen are the same line.
      const key = (l) => l.replace(/^[#\- ]+/, "").replace(/\s+/g, "");
      const flat = text.split("\n").map(key).join("\n");
      const extra = String(live[p] || "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length > 2 && !flat.includes(key(l)));
      onlyJs = `\n## Only after scripts run (${extra.length} lines; crawlers without scripts miss these)\n\n${extra.slice(0, 120).join("\n") || "(none)"}\n`;
      rows.push(`| ${p} | ${title.length} | ${desc.length} | ${ld.join(", ") || "none"} | ${text.split(/\s+/).length} | ${extra.length} |`);
    } else rows.push(`| ${p} | ${title.length} | ${desc.length} | ${ld.join(", ") || "none"} | ${text.split(/\s+/).length} |`);
    fs.writeFileSync(path.join(out, slugOf(p) + ".md"),
      `# ${p}\n\n- title: ${title}\n- description: ${desc}\n- canonical: ${canon || "(none)"}\n- robots: ${robots || "(none: indexable)"}\n- structured data: ${ld.join(", ") || "none"}\n\n## Text without scripts\n\n${text}\n${onlyJs}`);
  }
  for (const f of ["llms.txt", "robots.txt"]) if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(out, f));
  const head = rendered ? "| page | title chars | description chars | structured data | words | lines only with scripts |\n|---|---|---|---|---|---|" : "| page | title chars | description chars | structured data | words |\n|---|---|---|---|---|";
  fs.writeFileSync(path.join(out, "summary.md"), `# What an AI crawler sees (${pages.length} pages from sitemap.xml)\n\n${head}\n${rows.join("\n")}\n`);
  console.log(`wrote ${pages.length} pages to ${out}`);
})();
