// Writes the plumber template, filled with the sample content, as a finished site and as a draft, into <dir>,
// so check-all.sh can run qa-page and the Hebrew lint on what the builder really produces.
// Run: node scripts/tests/builder-render.mjs <dir>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as P from "../../demos/netlify/lib/templates/plumber.mjs";
import { SAMPLE } from "./builder-sample.mjs";

const out = process.argv[2];
if (!out) { console.error("usage: node scripts/tests/builder-render.mjs <dir>"); process.exit(1); }
const repo = path.resolve(new URL("../..", import.meta.url).pathname);
fs.mkdirSync(path.join(out, "assets/photos"), { recursive: true });
for (const f of ["leadbot.js", "leadform.js"]) fs.copyFileSync(path.join(repo, "clients/sample-plumber/assets", f), path.join(out, "assets", f));
const photos = { portrait: "plumber-portrait.webp", work1: "plumber-siphon.webp", work2: "plumber-leak.webp", work3: "plumber-drain.webp" };
for (const f of Object.values(photos)) fs.copyFileSync(path.join(repo, "clients/sample-plumber/assets/photos", f), path.join(out, "assets/photos", f));
const site = P.render(SAMPLE, { mode: "site", leads: "https://service-pro-web.netlify.app/api/lead/sample-plumber", photos: Object.fromEntries(Object.entries(photos).map(([k, f]) => [k, "assets/photos/" + f])) });
for (const [name, html] of Object.entries(site)) fs.writeFileSync(path.join(out, name), html);
for (const [name, body] of Object.entries(P.STATIC_FILES)) fs.writeFileSync(path.join(out, name), body);
// The same site with a short video at the top, when ffmpeg is here to make one (VP9 in MP4: the test browser can't play H.264).
try {
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=480x600:rate=24", "-t", "3", "-an", "-c:v", "libvpx-vp9", "-b:v", "300k", path.join(out, "assets/hero.mp4")]);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=480x600", "-frames:v", "1", path.join(out, "assets/hero-poster.jpg")]);
  const withVideo = P.render({ ...SAMPLE, video_title: "פתיחת סתימה במטבח" }, { mode: "site", photos: {}, video: { src: "assets/hero.mp4", poster: "assets/hero-poster.jpg" } });
  fs.writeFileSync(path.join(out, "video.html"), withVideo["index.html"]);
} catch (e) { console.log("no ffmpeg: skipped the video page"); }
// A site with only what is required: no photos, no prices, no optional facts.
const bare = { ...P.emptyContent(), ...Object.fromEntries(Object.entries(SAMPLE).filter(([k]) => P.FIELDS[k] && P.FIELDS[k].required)), services: SAMPLE.services.map((s) => ({ name: s.name, detail: "", time: "", price: "" })), towns: ["חדרה"] };
fs.writeFileSync(path.join(out, "bare.html"), P.render(bare, { mode: "site" })["index.html"]);
// A draft at the very start: almost everything empty.
fs.writeFileSync(path.join(out, "draft.html"), P.render({ ...P.emptyContent(), owner_name: "אורן לוי", whatsapp: "0526359513" }, { mode: "draft", assets: "assets/" })["index.html"]);
console.log("rendered into " + out);
