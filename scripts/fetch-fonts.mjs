// Downloads the fonts of every builder look (templates/looks.mjs) from Google Fonts once, so the sites serve them
// themselves: faster (no second host before the text shows) and nothing goes to Google when a page opens.
// Writes demos/shared/fonts/<look>.css (with relative URLs), the .woff2 files (Hebrew and Latin only) and
// fonts.json { look: { css, preload, faces } }, where preload is the body text's Hebrew file and faces the rules to inline.
// Run again after a look's fonts change: node scripts/fetch-fonts.mjs   The fonts are under the SIL Open Font License.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { LOOKS, LOOK_CSS } from "../demos/netlify/lib/templates/looks.mjs";

const OUT = path.resolve(new URL("../demos/shared/fonts", import.meta.url).pathname);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const KEEP = new Set(["hebrew", "latin"]);
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
const kept = new Set(["fonts.json"]);

for (const [id, look] of Object.entries(LOOKS)) {
  const res = await fetch(`https://fonts.googleapis.com/css2?${look.fonts}&display=swap`, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${id}: ${res.status}`);
  const css = await res.text();
  // Blocks look like: /* hebrew */ @font-face { font-family: 'X'; ... src: url(...) format('woff2'); unicode-range: ...; }
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)];
  let outCss = `/* ${id}: ${look.fonts.replace(/&/g, " ")} (SIL Open Font License), from scripts/fetch-fonts.mjs */\n`;
  let preload = null;
  for (const [, subset, face] of blocks) {
    if (!KEEP.has(subset)) continue;
    const url = /url\((https:[^)]+\.woff2)\)/.exec(face)[1];
    const family = /font-family:\s*'([^']+)'/.exec(face)[1];
    const weight = (/font-weight:\s*(\d+)/.exec(face) || [])[1] || "400";
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = `${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${subset}-${createHash("sha1").update(buf).digest("hex").slice(0, 8)}.woff2`;
    if (!fs.existsSync(path.join(OUT, file))) fs.writeFileSync(path.join(OUT, file), buf);
    kept.add(file);
    outCss += face.replace(url, file).replace(/\s+/g, " ").replace(/ ?([{};:]) ?/g, "$1") + "\n";
    // The body text's font (the look's --body), Hebrew, regular: the one file worth preloading.
    const bodyFamily = (/--body:\s*"([^"]+)"/.exec(LOOK_CSS[id] || "") || [])[1];
    if (subset === "hebrew" && weight === "400" && (!preload || family === bodyFamily)) preload = file;
  }
  fs.writeFileSync(path.join(OUT, `${id}.css`), outCss);
  kept.add(`${id}.css`);
  // faces: the same @font-face rules, written into the page itself (one less request before the text shows).
  manifest[id] = { css: `${id}.css`, preload, faces: outCss.split("\n").filter((l) => l.startsWith("@font-face")).join("") };
  console.log(id, blocks.length, "faces from Google,", outCss.split("\n").length - 2, "kept, preload", preload);
}
fs.writeFileSync(path.join(OUT, "fonts.json"), JSON.stringify(manifest, null, 2) + "\n");
for (const f of fs.readdirSync(OUT)) if (!kept.has(f)) fs.rmSync(path.join(OUT, f)); // a font no look uses any more
const size = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${OUT}: ${fs.readdirSync(OUT).length} files, ${(size / 1024).toFixed(0)} KB`);
