// The loop at the top of the home page: real moments cut from the process video (its silent master scripts/process-voice/film.mp4,
// recorded by scripts/process-video.mjs): the site, the AI chat, the builder's templates and colours, the questions,
// the draft filling up, photos, approving, and an enquiry arriving on WhatsApp. Only the browser window is kept, so
// it reads big. The captions are not burned in: the page shows them from CUES (written to hero-cues.json), synced to
// the video, so the Hebrew is real text. Run after recording the process video again.
// Run: node scripts/hero-video.mjs   Needs ffmpeg.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(new URL("../demos", import.meta.url).pathname);
const SRC = path.join(ROOT, "../scripts/process-voice/film.mp4"); // the silent master, before the narration stretches it
const OUT = path.join(ROOT, "shared/video/hero");
// The browser window on the process video's 1920x1080 stage (scripts/video-stage.html), address bar included.
const CROP = "1240:820:48:150";
const FADE = 0.4;
// [start in the process video (s), length (s), caption]
const CLIPS = [
  [19.5, 3.2, "אתר מקצועי לעסק שלכם"],
  [38.5, 3.2, "נציג AI שעונה ללקוחות"],
  [78.0, 3.6, "בוחרים תבנית"],
  [100.5, 3.2, "ובוחרים צבעים"],
  [128.5, 3.2, "עונים על כמה שאלות"],
  [156.0, 3.2, "והאתר מתמלא מול העיניים"],
  [172.8, 3.0, "מעלים תמונות"],
  [218.0, 2.8, "מאשרים, ואנחנו מעלים לאוויר"],
  [252.0, 4.4, "וכל פנייה מגיעה אליכם בוואטסאפ"],
];

fs.mkdirSync(OUT, { recursive: true });
// Each clip: cut, cropped, the same size and rate. Then a chain of short cross-fades.
const inputs = CLIPS.flatMap(([s, d]) => ["-ss", String(s), "-t", String(d), "-i", SRC]);
const parts = CLIPS.map((_, i) => `[${i}:v]crop=${CROP},scale=1240:820,fps=30,setsar=1,format=yuv420p,settb=AVTB[c${i}]`);
let last = "c0", offset = CLIPS[0][1];
const cues = [{ at: 0, text: CLIPS[0][2] }];
for (let i = 1; i < CLIPS.length; i++) {
  offset -= FADE;
  parts.push(`[${last}][c${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[x${i}]`);
  cues.push({ at: +(offset + FADE / 2).toFixed(2), text: CLIPS[i][2] });
  last = "x" + i; offset += CLIPS[i][1];
}
const mp4 = path.join(OUT, "hero.mp4"), webm = path.join(OUT, "hero.webm"), poster = path.join(OUT, "hero-poster.webp");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...inputs, "-filter_complex", parts.join(";"), "-map", `[${last}]`, "-pix_fmt", "yuv420p",
  "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "28", "-tune", "animation", "-movflags", "+faststart", "-an", mp4]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", mp4, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-row-mt", "1", "-an", webm]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", "1", "-i", mp4, "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", poster]);
fs.writeFileSync(path.join(OUT, "hero-cues.json"), JSON.stringify(cues, null, 2) + "\n");
const secs = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString().trim();
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(2);
console.log(`hero: ${Number(secs).toFixed(1)} s · mp4 ${mb(mp4)} MB · webm ${mb(webm)} MB · cues ${cues.map((c) => c.at).join(", ")}`);
