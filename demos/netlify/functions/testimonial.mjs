// Netlify Function: a customer writes a testimonial for the business's site (0010_testimonials.sql).
//   GET  /r/<lead>.<signature>   the private form, from the link in the testimonial_request message
//   POST /api/testimonial        { token, name, text, stars?, recommend? }  -> { ok, site }
//                                or, with a video (0023_testimonial_video.sql): the first frame then the MP4 as one
//                                body (application/octet-stream), x-poster-length, x-video-size "WxH", and the fields
//                                above as JSON in x-fields. The video goes up on the site with the rest.
// Only a link the system sent works, and only once per enquiry. What is written shows on the site at once
// (/api/testimonials/<slug>); the owner gets it on WhatsApp with "להסתיר", and can hide it in the panel too.
import { json, configured, db, q, getClient, rateLimiter, clientIp, testimonialOn, testimonialToken, checkTestimonial, sendButtons, sendTemplate, firstName, siteUrl, clip } from "../lib/leads.mjs";
import { uploadMedia, deletePhotos, photoType, isMp4 } from "../lib/builder.mjs";
import { randomBytes } from "node:crypto";

export const MAX_TST_VIDEO = 4_700_000; // about 30 seconds at 720 pixels with sound; the bucket takes 5 MB a file

const limited = rateLimiter(20, 10 * 60 * 1000);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const ERR = {
  name: "כתבו שם, לפחות שתי אותיות.", short: "כמה מילים נוספות, בבקשה.", long: "עד 400 תווים.", stars: "דירוג בין 1 ל-5.",
  contact: "בלי קישורים, מיילים או מספרי טלפון. ההמלצה מופיעה באתר כמו שהיא.",
  video: "לא הצלחנו לקבל את הסרטון. נסו לצלם שוב, קצר יותר.", consent: "כדי שהסרטון יופיע באתר, צריך לסמן את האישור.",
};

// The enquiry behind a link, with its business, while the invitation is open.
async function invitation(token) {
  const id = testimonialToken(token);
  if (!id) return null;
  const lead = (await db("GET", `ls_leads?id=eq.${q(id)}&select=id,client_slug,name,testimonial`))[0];
  if (!lead) return null;
  const client = await getClient(lead.client_slug);
  if (!client || !client.active || !testimonialOn(client)) return null;
  return { lead, client };
}

const page = (title, body) => new Response(`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${h(title)}</title>
<style>
  :root { --ink: #1d1b2e; --soft: #5d5a72; --line: #dcd8e8; --bg: #f6f5fb; --accent: #0f7a6c; --err: #9b2c2c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 400 17px/1.6 system-ui, "Segoe UI", Arial, sans-serif; }
  main { max-width: 520px; margin: 0 auto; padding: 32px 16px 56px; }
  h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 6px; }
  p { margin: 0 0 18px; color: var(--soft); }
  form { display: grid; gap: 14px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; }
  label { display: grid; gap: 6px; font-weight: 600; }
  input, textarea { font: inherit; border: 1.5px solid var(--line); border-radius: 10px; padding: 10px 12px; background: #fff; color: var(--ink); width: 100%; }
  textarea { min-height: 140px; resize: vertical; }
  input:focus-visible, textarea:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 6px; }
  legend { font-weight: 600; padding: 0; margin-bottom: 6px; }
  .stars { display: flex; gap: 6px; flex-direction: row-reverse; justify-content: flex-end; }
  .stars input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .stars label { font-size: 30px; line-height: 1; color: #c9c4d6; cursor: pointer; font-weight: 400; }
  .stars input:checked ~ label, .stars label:hover, .stars label:hover ~ label { color: var(--accent); }
  .stars input:focus-visible + label { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  .note { font-size: .9rem; color: var(--soft); margin: 0; }
  button { font: 700 17px system-ui, sans-serif; border: 0; border-radius: 999px; padding: 14px 20px; background: var(--accent); color: #fff; cursor: pointer; }
  button[disabled] { opacity: .6; }
  .err { color: var(--err); font-weight: 600; margin: 0; min-height: 1.2em; }
  .done { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 22px 18px; }
  .done a { color: var(--accent); font-weight: 700; }
  .yn { display: flex; gap: 18px; } .yn label { display: flex; align-items: center; gap: 6px; font-weight: 400; min-height: 44px; min-width: 64px; cursor: pointer; }
  .yn input, .ok input { width: auto; }
  .vid { display: grid; gap: 8px; }
  .pick { position: relative; justify-self: start; display: inline-flex; align-items: center; min-height: 48px; padding: 0 18px; border-radius: 999px; border: 1.5px solid var(--accent); color: var(--accent); font-weight: 700; cursor: pointer; }
  .pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .pick:focus-within { outline: 3px solid var(--accent); outline-offset: 2px; }
  video { width: 100%; max-height: 60vh; border-radius: 12px; background: #000; }
  .ok { display: flex; align-items: flex-start; gap: 8px; font-weight: 400; }
  button.ghost { background: transparent; color: var(--soft); border: 1.5px solid var(--line); justify-self: start; padding: 10px 16px; }
</style>
</head>
<body><main>${body}</main></body>
</html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" } });

const closed = () => page("הקישור כבר לא פעיל", `<h1>הקישור כבר לא פעיל</h1><p>כבר כתבתם המלצה מהקישור הזה, או שהוא לא תקין. תודה!</p>`);

export default async (req, context) => {
  if (!configured()) return json({ error: "not_configured" }, 503);
  const ip = clientIp(req);

  if (req.method === "GET") {
    const inv = await invitation(context.params && context.params.token).catch(() => null);
    if (!inv || inv.lead.testimonial !== "sent") return closed();
    const { lead, client } = inv;
    return page(`המלצה ל${client.name}`, `
<h1>איך היה עם ${h(client.name)}?</h1>
<p>כמה מילים, או סרטון קצר מהטלפון. ההמלצה תופיע באתר של העסק עם השם שתכתבו כאן.</p>
<form id="f" novalidate>
  <fieldset><legend>איך היה השירות? (לא חובה)</legend>
    <div class="stars">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="stars" id="s${n}" value="${n}"><label for="s${n}" aria-label="${n} מתוך 5">★</label>`).join("")}</div>
  </fieldset>
  <fieldset><legend>הייתם ממליצים על ${h(client.name)} לחברים?</legend>
    <div class="yn"><label><input type="radio" name="rec" value="yes"> כן</label><label><input type="radio" name="rec" value="no"> לא</label></div>
  </fieldset>
  <label>מה תרצו לכתוב?<textarea id="text" maxlength="400" placeholder="למשל: הגיע תוך שעה, פתח את הסתימה בלי לשבור כלום, ומחיר כמו שסיכמנו."></textarea></label>
  <div class="vid">
    <label class="pick" id="pick">לצלם המלצה בווידאו<input id="cam" type="file" accept="video/*" capture="user"></label>
    <p class="note">עד 30 שניות. אפשר גם לבחור סרטון מהגלריה.</p>
    <div id="vbox" hidden>
      <video id="prev" controls playsinline preload="metadata" aria-label="הסרטון שצילמתם"></video>
      <label class="ok"><input type="checkbox" id="consent"> מאשרים שהסרטון, עם השם שבחרתם, יופיע באתר של העסק.</label>
      <button type="button" class="ghost" id="drop">להוריד את הסרטון</button>
    </div>
  </div>
  <label>השם שיופיע<input id="name" maxlength="30" required value="${h(firstName(lead.name))}" autocomplete="given-name"></label>
  <p class="note">בלי קישורים, מיילים או מספרי טלפון.</p>
  <p class="err" id="err" role="alert"></p>
  <p class="note" id="busy" aria-live="polite"></p>
  <button id="go" type="submit">לפרסם את ההמלצה</button>
</form>
<script type="module">
  const $ = (id) => document.getElementById(id);
  const f = $("f"), err = $("err"), go = $("go"), TOKEN = ${JSON.stringify(context.params.token).replace(/</g, "\\u003c")};
  let file = null, url = null;
  $("cam").addEventListener("change", () => {
    file = $("cam").files[0] || null; $("cam").value = "";
    if (!file) return;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(file); $("prev").src = url; $("vbox").hidden = false; $("pick").firstChild.textContent = "לצלם שוב";
  });
  $("drop").addEventListener("click", () => { file = null; $("vbox").hidden = true; $("prev").removeAttribute("src"); $("consent").checked = false; $("pick").firstChild.textContent = "לצלם המלצה בווידאו"; });

  // Up to 30 seconds, at most 720 pixels on the short side, H.264 with the sound.
  async function makeVideo(onProgress) {
    const MB = await import("/shared/vendor/mediabunny-1.61.3.min.mjs");
    const input = new MB.Input({ source: new MB.BlobSource(file), formats: MB.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("video");
    const duration = await input.computeDuration();
    const w0 = track.displayWidth, h0 = track.displayHeight, k = Math.min(1, 720 / Math.min(w0, h0));
    const width = Math.round(w0 * k / 2) * 2, height = Math.round(h0 * k / 2) * 2;
    const codec = window.NR_VIDEO_CODEC || "avc";
    // The sound matters in a testimonial: AAC where the phone can make it, else Opus; without either, picture only.
    const audio = (await MB.canEncodeAudio("aac")) ? "aac" : (await MB.canEncodeAudio("opus")) ? "opus" : null;
    for (const bitrate of [1_000_000, 600_000]) {
      const output = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: "in-memory" }), target: new MB.BufferTarget() });
      const conversion = await MB.Conversion.init({ input, output, showWarnings: false,
        video: { codec, width, height, fit: "fill", frameRate: 30, quality: new MB.Quality({ bitrate }), forceTranscode: true, allowTransformationMetadata: false },
        audio: audio ? { codec: audio, bitrate: 64_000, forceTranscode: true } : { discard: true },
        trim: { start: 0, end: Math.min(duration, 30) } });
      if (!conversion.isValid) continue;
      conversion.onProgress = onProgress;
      await conversion.execute();
      const movie = new Blob([output.target.buffer], { type: "video/mp4" });
      if (movie.size <= ${MAX_TST_VIDEO - 300_000}) return { movie, poster: await frame(movie), width, height };
    }
    throw new Error("video");
  }
  function frame(movie) {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto";
      const u = URL.createObjectURL(movie); v.src = u;
      v.onerror = () => { URL.revokeObjectURL(u); reject(new Error("video")); };
      v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
      v.onseeked = () => {
        const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); URL.revokeObjectURL(u);
        c.toBlob((b) => (b && b.type === "image/webp" ? resolve(b) : c.toBlob((j) => (j ? resolve(j) : reject(new Error("video"))), "image/jpeg", 0.8)), "image/webp", 0.75);
      };
    });
  }

  f.addEventListener("submit", async (e) => {
    e.preventDefault(); err.textContent = "";
    if (file && !$("consent").checked) { err.textContent = "כדי שהסרטון יופיע באתר, צריך לסמן את האישור."; return; }
    go.disabled = true;
    const s = f.querySelector("input[name=stars]:checked"), rec = f.querySelector("input[name=rec]:checked");
    const fields = { token: TOKEN, name: $("name").value, text: $("text").value, stars: s ? Number(s.value) : null, recommend: rec ? rec.value === "yes" : null };
    try {
      let r;
      if (file) {
        if (!("VideoEncoder" in window)) throw Object.assign(new Error("old"), { say: "הדפדפן הזה לא יודע להכין את הסרטון. כתבו כמה מילים, או נסו בדפדפן אחר." });
        $("busy").textContent = "מכינים את הסרטון…";
        const v = await makeVideo((p) => { $("busy").textContent = "מכינים את הסרטון… " + Math.round(p * 100) + "%"; });
        $("busy").textContent = "מעלים את הסרטון…";
        r = await fetch("/api/testimonial", { method: "POST", body: new Blob([v.poster, v.movie]), headers: { "content-type": "application/octet-stream",
          "x-poster-length": String(v.poster.size), "x-video-size": v.width + "x" + v.height, "x-fields": encodeURIComponent(JSON.stringify({ ...fields, consent: true })) } });
      } else {
        r = await fetch("/api/testimonial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(fields) });
      }
      const d = await r.json();
      if (r.ok && d.ok) {
        document.querySelector("main").innerHTML = '<div class="done"><h1>תודה!</h1><p>ההמלצה שלכם כבר באתר.</p>' + (d.site ? '<p><a href="' + d.site.replace(/"/g, "") + '#testimonials">לראות אותה באתר</a></p>' : "") + "</div>";
        return;
      }
      err.textContent = d.message || "לא הצלחנו לשמור. נסו שוב.";
    } catch (x) { err.textContent = x.say || (x.message === "video" ? "לא הצלחנו להכין את הסרטון. נסו לצלם שוב, קצר יותר." : "לא הצלחנו לשמור. בדקו את החיבור ונסו שוב."); }
    $("busy").textContent = ""; go.disabled = false;
  });
</script>`);
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (limited(ip)) return json({ error: "rate_limited", message: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." }, 429);
  const withVideo = (req.headers.get("content-type") || "").startsWith("application/octet-stream");
  let body, movie, poster, size;
  if (withVideo) {
    if (Number(req.headers.get("content-length") || 0) > MAX_TST_VIDEO) return json({ error: "video", message: ERR.video }, 413);
    try { body = JSON.parse(decodeURIComponent(req.headers.get("x-fields") || "")); } catch { return json({ error: "bad_json" }, 400); }
    const all = Buffer.from(await req.arrayBuffer()), cut = Number(req.headers.get("x-poster-length"));
    if (all.length > MAX_TST_VIDEO || !(cut > 0 && cut < all.length)) return json({ error: "video", message: ERR.video }, 413);
    poster = all.subarray(0, cut); movie = all.subarray(cut);
    const m = /^(\d{2,4})x(\d{2,4})$/.exec(req.headers.get("x-video-size") || "");
    if (!isMp4(movie) || !photoType(poster)) return json({ error: "video", message: ERR.video }, 415);
    if (!body || body.consent !== true) return json({ error: "consent", message: ERR.consent }, 422);
    size = m ? { w: Number(m[1]), h: Number(m[2]) } : {};
  } else body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "bad_json" }, 400);
  const inv = await invitation(body.token);
  if (!inv) return json({ error: "closed", message: "הקישור כבר לא פעיל." }, 410);
  const chk = checkTestimonial(body, { withVideo });
  if (chk.error) return json({ error: chk.error, message: ERR[chk.error] }, 422);
  const { lead, client } = inv;
  if (inv.lead.testimonial !== "sent") return json({ error: "closed", message: "כבר כתבתם המלצה מהקישור הזה. תודה!" }, 410);
  // The video first, at a name nobody can guess, then the row that points at it.
  let video = null;
  if (withVideo) {
    const base = `testimonials/${client.slug}/${randomBytes(9).toString("hex")}`, pext = photoType(poster);
    try { video = { path: await uploadMedia(base + ".mp4", movie, "mp4"), poster: await uploadMedia(base + "." + pext, poster, pext), ...size }; }
    catch (e) { console.error("testimonial video", e.message); return json({ error: "video", message: ERR.video }, 502); }
  }
  // Store it first, so a failure never closes the link with the text lost. lead_id is unique: a second press is refused.
  let t;
  try { [t] = await db("POST", "ls_testimonials", { client_slug: client.slug, lead_id: lead.id, ...chk.row, ...(video ? { video } : {}) }, "return=representation"); }
  catch (e) { if (video) await deletePhotos([video.path, video.poster]); return json({ error: "closed", message: "כבר כתבתם המלצה מהקישור הזה. תודה!" }, 410); }
  // Then close the invitation. If it was already closed (a second press that got past the unique check), take it back.
  const shut = await db("PATCH", `ls_leads?id=eq.${q(lead.id)}&testimonial=eq.sent`, { testimonial: "done" }, "return=representation");
  if (!shut.length) {
    await db("DELETE", `ls_testimonials?id=eq.${q(t.id)}`).catch(() => {});
    if (video) await deletePhotos([video.path, video.poster]);
    return json({ error: "closed", message: "כבר כתבתם המלצה מהקישור הזה. תודה!" }, 410);
  }
  // The owner sees it right away, and can take it off the site with one tap. Buttons work only within 24 hours of the
  // owner's last message to the number; otherwise the owner alert template carries it, and the panel hides it.
  const stars = (chk.row.stars ? " " + "★".repeat(chk.row.stars) : "") + (video ? ", עם סרטון" : "") + (chk.row.recommend === true ? ", וממליצים עליכם" : chk.row.recommend === false ? ", ולא היו ממליצים" : "");
  const r = await sendButtons(client, client.owner_phone, `המלצה חדשה עלתה לאתר${stars}:\n"${clip(chk.row.body || "(סרטון בלי טקסט)", 400)}"\n${chk.row.name}`,
    [{ id: "hidetst:" + t.id, title: "להסתיר" }], { kind: "owner_reply", leadId: lead.id }).catch(() => "failed");
  if (r !== "sent" && client.owner_alerts) {
    await sendTemplate(client, client.owner_phone, client.tpl_owner_alert,
      [chk.row.name || "-", "-", "המלצה לאתר", { text: `המלצה חדשה עלתה לאתר${stars}: "${clip(chk.row.body || "(סרטון בלי טקסט)", 300)}". להסתרה: בלוח הפניות.`, max: 480 }, "אתר"],
      { kind: "owner_alert", leadId: lead.id }).catch(() => {});
  }
  return json({ ok: true, site: siteUrl(client) });
};

export const config = { path: ["/r/:token", "/api/testimonial"] };
