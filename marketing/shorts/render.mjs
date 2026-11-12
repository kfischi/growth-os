// Renders a short from marketing/shorts/<name>/index.html to an MP4: the page draws each frame through
// window.render(t), Chromium captures it, ffmpeg encodes H.264 (yuv420p, faststart), no sound.
//   node marketing/shorts/render.mjs pain-stick            the whole short, 1080x1920 at 30 fps
//   node marketing/shorts/render.mjs pain-stick --stills    first, middle and last frames and each scene change as PNG
// Output: marketing/shorts/<name>/<name>.mp4 (a new file each time it changes nothing else).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright"); // the machine's own Playwright, as in scripts/process-video.mjs

const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || "pain-stick", stills = process.argv.includes("--stills");
const dir = join(here, name), FPS = 30;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(dir, "index.html")).href);
await page.evaluate(async () => { await document.fonts.ready; await window.ready; }); // fonts, and videos where the short has them
const duration = await page.evaluate(() => window.DURATION);
const shot = async (t) => { await page.evaluate((x) => window.render(x), t); return page.screenshot({ type: "png" }); }; // render may be async (a video seek)

if (stills) {
  const out = join(dir, "stills"); mkdirSync(out, { recursive: true });
  const { writeFileSync } = await import("node:fs");
  for (const t of [...Array(Math.floor(duration)).keys()].map((i) => i + 0.5).concat(duration - 1 / FPS)) writeFileSync(join(out, `t${t.toFixed(2)}.png`), await shot(t));
  console.log("stills in", out);
} else {
  const file = join(dir, `${name}.mp4`);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), file], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.round(duration * FPS);
  for (let i = 0; i < frames; i++) {
    const png = await shot(i / FPS);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c ? j(new Error("ffmpeg " + c)) : r())));
  console.log(file, frames, "frames");
}
await browser.close();
