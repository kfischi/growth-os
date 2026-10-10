// Records a demo page in use, on a phone screen: the page, a scroll, the chat from the first tap to the
// WhatsApp summary, and the phone mockup with the visitor's own lead. For the home page and for outreach.
// Run: node scripts/demo-video.cjs <out-dir> plumber movers electrician
// Needs Playwright and ffmpeg. Frames come from Chrome's own screencast (sharp), not from a screen recorder.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "../demos");
const [OUT, ...DEMOS] = process.argv.slice(2);
if (!OUT || !DEMOS.length) { console.error("usage: node scripts/demo-video.cjs <out-dir> <demo> [demo ...]"); process.exit(1); }
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".mp4": "video/mp4", ".webm": "video/webm" };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
}).listen(8796);

// What a visitor types, by the kind of question.
const answer = (type, placeholder) => type === "tel" ? "052-7384916" : /ישוב|עיר|חדרה|כתובת|מאיפה/.test(placeholder || "") ? "חדרה" : /שם/.test(placeholder || "") ? "דנה כהן" : "חדרה";

// A soft ring where the finger taps, so the viewer sees what was pressed.
const TAP = `(() => {
  const s = document.createElement("style");
  s.textContent = ".__tap{position:fixed;z-index:2147483647;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.95);box-shadow:0 0 0 2px rgba(0,0,0,.25);pointer-events:none;animation:__tap .55s ease-out forwards}@keyframes __tap{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.25);opacity:0}}";
  document.head.appendChild(s);
  window.__tap = (x, y) => { const d = document.createElement("div"); d.className = "__tap"; d.style.left = x + "px"; d.style.top = y + "px"; document.body.appendChild(d); setTimeout(() => d.remove(), 700); };
})()`;

// The running explanation: one short line at the top, above the chat, in the studio's voice to a business owner.
const CAPTION = `(() => {
  const s = document.createElement("style");
  s.textContent = "@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;700&display=swap');" +
    ".__cap{position:fixed;z-index:2147483646;top:18px;left:50%;transform:translate(-50%,-8px);width:calc(100% - 28px);max-width:362px;box-sizing:border-box;" +
    "padding:12px 16px;border-radius:14px;background:rgba(29,27,46,.9);color:#fff;font:700 17px/1.35 Rubik,system-ui,sans-serif;text-align:center;direction:rtl;" +
    "box-shadow:0 14px 30px -12px rgba(0,0,0,.55);opacity:0;transition:opacity .35s,transform .35s;pointer-events:none}" +
    ".__cap.on{opacity:1;transform:translate(-50%,0)}.__cap small{display:block;font-weight:500;font-size:13px;color:#c9c3dc;margin-top:2px}";
  document.head.appendChild(s);
  const d = document.createElement("div"); d.className = "__cap"; document.body.appendChild(d);
  window.__cap = (t, sub) => new Promise((done) => {
    if (d.dataset.t === t) return done();
    d.classList.remove("on");
    setTimeout(() => { d.dataset.t = t; d.textContent = t; if (sub) { const m = document.createElement("small"); m.textContent = sub; d.appendChild(m); } d.classList.add("on"); done(); }, d.dataset.t ? 320 : 0);
  });
})()`;
const cap = (p, t, sub) => p.evaluate(([t, sub]) => window.__cap(t, sub), [t, sub || ""]);

async function tap(p, el) {
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  await p.evaluate(([x, y]) => window.__tap(x, y), [b.x + b.width / 2, b.y + b.height / 2]);
  await p.waitForTimeout(260);
  await el.click();
}

async function smoothScroll(p, to, ms = 1400) {
  await p.evaluate(([to, ms]) => new Promise((done) => {
    const from = scrollY, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, from + (to - from) * e); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [to, ms]);
}

async function record(browser, demo) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "he-IL" });
  const p = await ctx.newPage();
  await p.route(/wa\.me|\/api\//, (r) => r.abort());
  await p.goto(`http://localhost:8796/${demo}/`, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: ".demo,.ps-ui-btn{display:none!important}" }); // the demo ribbon and the edit button aren't part of the business's site
  await p.evaluate(TAP);
  await p.evaluate(CAPTION);
  await p.evaluate(async () => { await document.fonts.ready; document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }); });
  await p.waitForTimeout(800);

  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "rec-"));
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const file = path.join(dir, String(frames.length).padStart(5, "0") + ".jpg");
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch { /* closing */ }
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });

  // 1. The page: hold on the top, scroll down a little, back up.
  await p.waitForTimeout(400);
  await cap(p, "ככה נראה האתר שלכם בטלפון", "דמו של עסק בדוי");
  await p.waitForTimeout(2200);
  await cap(p, "השירותים, המחירים והאזורים שלכם");
  await smoothScroll(p, 900, 1800); await p.waitForTimeout(1300);
  await smoothScroll(p, 0, 1300); await p.waitForTimeout(500);
  await cap(p, "לקוח לוחץ ופותח קריאה בצ׳אט");
  await p.waitForTimeout(1300);

  // 2. The chat, from the first button on the page.
  const open = (await p.$("[data-open-bot]:visible")) || (await p.$(".lb-launch"));
  await tap(p, open);
  let steps = 0;
  while (steps < 14) {
    await p.waitForTimeout(1500);
    if (await p.$(".lb-panel .lb-wa")) break;
    const chip = await p.$(".lb-panel .lb-chips button:visible");
    const input = await p.$(".lb-panel form input:visible");
    if (chip) { await cap(p, "שאלה אחת בכל פעם, ועונים בלחיצה"); await p.waitForTimeout(500); await tap(p, chip); }
    else if (input) {
      const type = await input.getAttribute("type"), ph = await input.getAttribute("placeholder");
      await cap(p, type === "tel" ? "משאיר טלפון, והמספר נבדק" : /שם/.test(ph || "") ? "משאיר שם, בלי טופס ארוך" : "כותב איפה הוא, במילה אחת");
      await tap(p, input);
      await input.type(answer(type, ph), { delay: 95 });
      await p.waitForTimeout(350);
      const send = await p.$(".lb-panel form button:visible");
      if (send) await tap(p, send); else await input.press("Enter");
    }
    steps++;
  }
  await cap(p, "הכול מסוכם, ונשלח אליכם בוואטסאפ", "אף פנייה לא הולכת לאיבוד");
  await p.waitForTimeout(1200);
  const wa = await p.$(".lb-panel .lb-wa");
  if (wa) { const b = await wa.boundingBox(); await p.evaluate(([x, y]) => window.__tap(x, y), [b.x + b.width / 2, b.y + b.height / 2]); }
  await p.waitForTimeout(2600);

  // 3. The phone mockup with the visitor's own lead, where the page has one.
  const phone = await p.$(".phone, .ph-phone, [data-phone]");
  if (phone) {
    const close = await p.$(".lb-launch"); if (close) await tap(p, close);
    await p.waitForTimeout(500);
    const y = await phone.evaluate((e) => e.getBoundingClientRect().top + scrollY - 120);
    await cap(p, "והפנייה אצלכם, מסודרת", "שם, טלפון ומה צריך, בהודעה אחת");
    await smoothScroll(p, y, 1600); await p.waitForTimeout(3200);
  }
  await cdp.send("Page.stopScreencast");
  await ctx.close();

  // Frames come only when something changes: each one lasts until the next.
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, ((frames[i + 1] || { t: f.t + 0.6 }).t - f.t)).toFixed(3)}`).join("\n") + `\nfile '${frames.at(-1).file}'\n`;
  fs.writeFileSync(path.join(dir, "list.txt"), list);
  const out = path.join(OUT, `${demo}-demo.mp4`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
    "-vf", "fps=30,scale=780:1688:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "22", "-movflags", "+faststart", "-an", out]);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", out, "-frames:v", "1", "-vf", "scale=390:-2", "-c:v", "libwebp", "-quality", "75", path.join(OUT, `${demo}-demo-poster.webp`)]);
  fs.rmSync(dir, { recursive: true, force: true });
  const secs = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim();
  console.log(`${demo}: ${out} · ${Number(secs).toFixed(1)} s · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · chat steps ${steps}${phone ? " · phone mockup" : ""}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try { for (const d of DEMOS) await record(browser, d); }
  finally { await browser.close(); server.close(); }
})();
