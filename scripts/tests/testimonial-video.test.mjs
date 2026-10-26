// The private testimonial page in a real browser: stars, "would you recommend", a recorded video converted on the
// phone (with its sound) and sent with the customer's OK. Against a fake Supabase; the page's POST is caught here.
// Run: node scripts/tests/testimonial-video.test.mjs  (from the repo root; needs Playwright with Chromium)
// The test browser can't decode or encode H.264, so the fixture is VP9 with Opus and the page encodes VP9
// (window.NR_VIDEO_CODEC); on a phone it is H.264 with AAC.
import assert from "node:assert/strict";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
Object.assign(process.env, { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_KEY: "sb_secret_test", LEADS_ADMIN_KEY: "admin-key-0123456789" });
const ROOT = new URL("../../demos/", import.meta.url).pathname, FIX = new URL("./fixtures/testimonial.webm", import.meta.url).pathname;
const LEAD = "11111111-2222-3333-4444-555555555555";
globalThis.fetch = async (url) => {
  const t = new URL(url).pathname.split("/").pop();
  const res = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
  if (t === "ls_leads") return res([{ id: LEAD, client_slug: "oren", name: "דנה כהן", testimonial: "sent" }]);
  if (t === "ls_clients") return res([{ slug: "oren", name: "אורן מים", active: true, testimonials: true, package: "ai" }]);
  return res([]);
};
const lib = await import(new URL("../../demos/netlify/lib/leads.mjs", import.meta.url).href);
const fn = (await import(new URL("../../demos/netlify/functions/testimonial.mjs", import.meta.url).href)).default;
const token = lib.testimonialLink(LEAD).split("/r/")[1];
const html = await (await fn(new Request("https://s/r/" + token), { params: { token } })).text();
let got = null;
const srv = http.createServer((q, r) => {
  if (q.url.startsWith("/r/")) { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return r.end(html); }
  if (q.url === "/api/testimonial") {
    const ch = []; q.on("data", (c) => ch.push(c));
    q.on("end", () => { got = { headers: q.headers, body: Buffer.concat(ch) }; r.writeHead(200, { "content-type": "application/json" }); r.end('{"ok":true,"site":"https://oren.co.il/"}'); });
    return;
  }
  const f = path.join(ROOT, q.url.split("?")[0]);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": f.endsWith(".mjs") ? "text/javascript" : "application/octet-stream" }); r.end(d); });
}).listen(0);
const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => { window.NR_VIDEO_CODEC = "vp9"; });
  await p.goto(`http://127.0.0.1:${srv.address().port}/r/${token}`);
  await p.click("label[for=s5]"); await p.check("input[name=rec][value=yes]");
  await p.setInputFiles("#cam", FIX);
  await p.waitForSelector("#vbox:not([hidden])");
  await p.click("#go");
  assert.equal(await p.textContent("#err"), "כדי שהסרטון יופיע באתר, צריך לסמן את האישור.", "no video without the customer's OK");
  assert.equal(got, null);
  await p.check("#consent"); await p.click("#go");
  await p.waitForSelector(".done", { timeout: 120000 });
  assert.deepEqual(errs, []);
  const fields = JSON.parse(decodeURIComponent(got.headers["x-fields"]));
  assert.deepEqual({ ...fields, token: undefined }, { token: undefined, name: "דנה", text: "", stars: 5, recommend: true, consent: true });
  assert.equal(got.headers["content-type"], "application/octet-stream");
  const cut = Number(got.headers["x-poster-length"]), movie = got.body.subarray(cut), poster = got.body.subarray(0, cut);
  assert.equal(movie.toString("latin1", 4, 8), "ftyp", "an MP4"); assert.equal(poster.toString("latin1", 8, 12), "WEBP", "a WebP first frame");
  assert.equal(got.headers["x-video-size"], "360x640");
  assert.ok(movie.includes(Buffer.from("Opus")) || movie.includes(Buffer.from("mp4a")), "the sound is kept");
  console.log("testimonial video ok:", movie.length, "bytes");
} finally { await b.close(); srv.close(); }
