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
for (const f of ["leadbot.js", "leadform.js", "a11y.js"]) fs.copyFileSync(path.join(repo, "clients/sample-plumber/assets", f), path.join(out, "assets", f));
fs.cpSync(path.join(repo, "demos/shared/fonts"), path.join(out, "assets/fonts"), { recursive: true }); // the drafts load their fonts from here
const photos = { portrait: "plumber-portrait.webp", work1: "plumber-siphon.webp", work2: "plumber-leak.webp", work3: "plumber-drain.webp", before: "plumber-leak.webp", after: "plumber-siphon.webp" };
for (const f of Object.values(photos)) fs.copyFileSync(path.join(repo, "clients/sample-plumber/assets/photos", f), path.join(out, "assets/photos", f));
// Two areas with the owner's own words: each gets a page (area.html below is the first, for qa-page).
const regions = [
  { name: "חדרה", towns: ["חדרה"], response: "20 דק׳", note: "אני גר בחדרה ומגיע לרוב הקריאות בעיר תוך 20 דקות. בבניינים הישנים כאן החלפתי עשרות דודים וצנרת." },
  { name: "עמק חפר", towns: ["עמק חפר", "כפר יונה"], response: "", note: "בעמק חפר אני עובד בעיקר במושבים: הרבה בתים פרטיים, צנרת חיצונית ודודי שמש על הגג." },
];
// The owner's profiles: a row of icon links in the contact section and on the service and area pages.
const social = { instagram: "https://www.instagram.com/oren.mayim/", facebook: "https://www.facebook.com/OrenMayim", tiktok: "https://www.tiktok.com/@oren.mayim", youtube: "https://www.youtube.com/@OrenMayim" };
const site = P.render({ ...SAMPLE, regions, social, ba_title: "החלפת סיפון מתחת לכיור, חדרה" }, { mode: "site", leads: "https://service-pro-web.netlify.app/api/lead/sample-plumber", photos: Object.fromEntries(Object.entries(photos).map(([k, f]) => [k, "assets/photos/" + f])) });
for (const [name, html] of Object.entries(site)) fs.writeFileSync(path.join(out, name), html);
fs.writeFileSync(path.join(out, "area.html"), site[P.areaPage("חדרה")]);
for (const [name, body] of Object.entries(P.STATIC_FILES)) fs.writeFileSync(path.join(out, name), body);
// The same site with a short video at the top, when ffmpeg is here to make one (VP9 in MP4: the test browser can't play H.264).
try {
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=480x600:rate=24", "-t", "3", "-an", "-c:v", "libvpx-vp9", "-b:v", "300k", path.join(out, "assets/hero.mp4")]);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=480x600", "-frames:v", "1", path.join(out, "assets/hero-poster.jpg")]);
  const withVideo = P.render({ ...SAMPLE, video_title: "פתיחת סתימה במטבח" }, { mode: "site", photos: {}, video: { src: "assets/hero.mp4", poster: "assets/hero-poster.jpg" } });
  fs.writeFileSync(path.join(out, "video.html"), withVideo["index.html"]);
} catch (e) { console.log("no ffmpeg: skipped the video page"); }
// Full media: a photo at the top, the portrait, six work photos, before and after, and five short videos of the work
// (full.html). The page must not get heavier on load: the videos' files load only when they play.
try {
  fs.mkdirSync(path.join(out, "assets/videos"), { recursive: true });
  const clips = [];
  for (let i = 1; i <= 5; i++) {
    const src = `assets/videos/c${i}.mp4`, poster = `assets/videos/c${i}-poster.webp`;
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `testsrc=size=360x640:rate=24`, "-t", "3", "-an", "-c:v", "libvpx-vp9", "-b:v", "300k", path.join(out, src)]);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=360x640", "-frames:v", "1", "-c:v", "libwebp", path.join(out, poster)]);
    clips.push({ src, poster, title: ["פתיחת סתימה במטבח", "החלפת ברז", "", "איתור נזילה במצלמה", "ניקוי מרזב"][i - 1], w: 360, h: 640 });
  }
  const extra = { hero: "plumber-leak.webp", work4: "plumber-drain.webp", work5: "plumber-siphon.webp", work6: "plumber-portrait.webp" };
  const all = { ...photos, ...extra };
  const sizes = Object.fromEntries(Object.keys(all).map((k) => [k, [640, 640]]));
  const titles = { work1_title: "החלפת סיפון", work2_title: "תיקון נזילה", work3_title: "פתיחת ניקוז", work4_title: "צנרת חדשה", work5_title: "ברז למטבח", work6_title: "בדיקת לחץ" };
  const full = P.render({ ...SAMPLE, ...titles, hero_media: "photo", ba_title: "החלפת סיפון מתחת לכיור, חדרה" }, { mode: "site", leads: "https://service-pro-web.netlify.app/api/lead/sample-plumber",
    photos: Object.fromEntries(Object.entries(all).map(([k, f]) => [k, "assets/photos/" + f])), sizes, clips });
  fs.writeFileSync(path.join(out, "full.html"), full["index.html"]);
} catch (e) { console.log("no ffmpeg: skipped the full media page"); }
// A site with only what is required: no photos, no prices, no optional facts.
const bare = { ...P.emptyContent(), ...Object.fromEntries(Object.entries(SAMPLE).filter(([k]) => P.FIELDS[k] && P.FIELDS[k].required)), services: SAMPLE.services.map((s) => ({ name: s.name, detail: "", time: "", price: "" })), towns: ["חדרה"] };
fs.writeFileSync(path.join(out, "bare.html"), P.render(bare, { mode: "site" })["index.html"]);
// A draft at the very start: almost everything empty.
fs.cpSync(path.join(repo, "demos/shared/photos"), path.join(out, "shared/photos"), { recursive: true }); // drafts show sample photos from /shared/photos/
fs.writeFileSync(path.join(out, "draft.html"), P.render({ ...P.emptyContent(), owner_name: "אורן לוי", whatsapp: "0526359513" }, { mode: "draft", assets: "assets/" })["index.html"]);
// A draft with only the "before" photo: the frame shows, with the missing half marked.
fs.writeFileSync(path.join(out, "draft-ba.html"), P.render({ ...SAMPLE }, { mode: "draft", assets: "assets/", photos: { before: "assets/photos/plumber-leak.webp" } })["index.html"]);
// Every trade's site, with the trade's own sample services, headline and intro (trade-<id>/, all pages), and its draft.
import("../../demos/netlify/lib/templates/trades/index.mjs").then(async ({ TRADES }) => {
  const { whenText } = await import("../../demos/netlify/lib/templates/plumber-guide.mjs");
  for (const T of Object.values(TRADES)) {
    const g = T.guide, when = whenText(g.response[1]);
    const c = { ...P.emptyContent(T.id), business_name: "עסק לדוגמה", owner_name: "דנה כהן", area: "חדרה והסביבה", response_time: g.response[1], hours: g.hours[1],
      whatsapp: "0526359513", headline_1: g.headlines[0].headline_1, headline_2: (g.headlines[0].headline_2 || "").replace("{when}", when),
      intro: g.intros[0].intro.replace("{when}", when), services: g.services.slice(0, 5), towns: ["חדרה", "נתניה", "כפר יונה"], social: { instagram: social.instagram } };
    const dir = path.join(out, `trade-${T.id}`);
    fs.mkdirSync(dir, { recursive: true }); fs.cpSync(path.join(out, "assets"), path.join(dir, "assets"), { recursive: true });
    for (const [name, html] of Object.entries(P.render(c, { mode: "site", leads: null, photos: {} }))) fs.writeFileSync(path.join(dir, name), html);
    fs.writeFileSync(path.join(dir, "draft.html"), P.render(c, { mode: "draft", assets: "assets/" })["index.html"]);
    fs.cpSync(path.join(repo, "demos/shared/photos"), path.join(dir, "shared/photos"), { recursive: true }); // a draft shows the trade's sample photos from /shared/photos/
  }
  console.log("rendered into " + out);
});
