// The loop at the top of the home page: real moments cut from the explainer film, recorded with the camera kept wide
// (WIDE=1 node scripts/process-video.mjs): a tour of trades, then what the נציג AI package does (the chat, the photo's
// first look, the customer's WhatsApp reply, the owner's alert and reminder, the price answer, the panel, the monthly
// report), then the build in the chat and the site live. Only the browser
// window is kept, so it reads big. Each clip starts at a moment the recorder names (its "marks", in the .json next to
// the recording), so the loop follows the film when it is recorded again. The captions are not burned in: the page
// shows them from the cues (written to hero-cues.json, and to data-cues on the home page's hero figure), synced to the
// video, so the Hebrew is real text.
// Run: node scripts/hero-video.mjs [recording.mp4]   Needs ffmpeg.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(new URL("../demos", import.meta.url).pathname);
// The same film recorded with the camera kept wide (WIDE=1 node scripts/process-video.mjs), so no clip loses the page's sides.
const SRC = process.argv[2] || path.join(os.tmpdir(), "process-wide.mp4");
const { marks } = JSON.parse(fs.readFileSync(SRC.replace(/\.mp4$/, ".json"), "utf8"));
const OUT = path.join(ROOT, "shared/video/hero");
// The browser window on the process video's 1920x1080 stage (scripts/video-stage.html), address bar included.
const CROP = "1240:820:48:150";
const FADE = 0.4;
// [the recorder's mark, seconds after it, length (s), caption]
const CLIPS = [
  ["h-trades", 0.4, 5.0, "אתר לכל עסק קטן: ספר, מורה לנהיגה, גנן, חשמלאי"],
  // What the נציג AI package does, one thing a clip, in the hero's own voice (singular, like its headline).
  ["h-chat", 0.0, 3.2, "נציג AI עונה ללקוחות, גם כשאתה באמצע עבודה"],
  ["h-photo", -0.4, 3.2, "לקוח שולח תמונה ומקבל הערכת מחיר"],
  ["h-reply", -0.8, 3.4, "ומקבל מיד אישור בוואטסאפ, מהמספר שלך"],
  ["h-wa", -1.4, 3.8, "ואתה מקבל התראה עם כל הפרטים"],
  ["h-remind", -0.2, 3.0, "לא חזרת אליו? מגיעה תזכורת"],
  ["h-price", -0.6, 3.2, "שאלה על מחיר? עונה מהמחירון שלך"],
  ["h-panel", -0.2, 3.0, "כל הפניות בלוח אחד"],
  ["h-report", 0.0, 3.0, "ובכל חודש, סיכום בוואטסאפ"],
  ["h-look", -0.6, 3.0, "ואת האתר בונים בצ׳אט, בלי מעצב"],
  ["h-live", -0.2, 2.8, "משלמים רק כשהאתר מוכן"],
].map(([m, d, len, text]) => { if (marks[m] == null) throw new Error("no mark " + m + " in the recording"); return [+(marks[m] + d).toFixed(2), len, text]; });

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
// The same cues, as the home page's hero figure carries them (data-cues on figure.reel in demos/index.html).
console.log("data-cues: [" + cues.map((c) => `{&quot;at&quot;: ${c.at}, &quot;text&quot;: &quot;${c.text}&quot;}`).join(", ") + "]");
