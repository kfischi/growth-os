// The builder page after approval, in a real browser (phone and desktop): picking the address, paying on Grow's
// page, coming back, the site going live by itself, the owner's domain records, the panel link, the subscription
// and "נתקעתם?". The functions run here against builder-fakes.mjs and a fake Grow.
// Run: node scripts/tests/billing-page.test.mjs   (needs Playwright, see CLAUDE.md > Checks)
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { T, ai, DEF } from "./builder-fakes.mjs";
import { SAMPLE } from "./builder-sample.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
Object.assign(process.env, { GROW_USER_ID: "u-test", GROW_PAGE_CODE: "pc-test", GROW_SANDBOX: "1", NETLIFY_TOKEN: "nf-test", SITES_DOMAIN: "sites.example.co.il", BILLING_YEAR: "1" }); // the year ahead is off on the site; on here to test its page

const grow = { processes: new Map(), n: 0 };
const fakeFetch = globalThis.fetch;
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url);
  if (u.host !== "sandbox.meshulam.co.il") return fakeFetch(url, opt);
  const f = Object.fromEntries(opt.body.entries()), name = u.pathname.split("/").pop();
  const ok = (data) => new Response(JSON.stringify({ status: 1, data }));
  if (name === "createPaymentProcess") { const id = String(++grow.n); grow.processes.set(id, { sum: Number(f.sum), paid: false, back: f.successUrl }); return ok({ url: "https://sandbox.meshulam.co.il/pay/" + id, processId: id, processToken: "t" + id }); }
  if (name === "getPaymentProcessInfo") { const p = grow.processes.get(f.processId); return ok({ transactions: p.paid ? [{ transactionId: "tx" + f.processId, asmachta: "A1", sum: p.sum, cardToken: "card", cardSuffix: "4580" }] : [] }); }
  return ok({});
};

const ROOT = path.resolve(new URL("../../demos", import.meta.url).pathname);
const F = new URL("../../demos/netlify/functions/", import.meta.url).href;
const builder = (await import(F + "builder.mjs")).default;
const draftFn = (await import(F + "draft.mjs")).default;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png" };
const PORT = 8792, BASE = `http://localhost:${PORT}`;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const send = async (r) => { res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); };
  const request = () => new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
  let m;
  if ((m = /^\/api\/builder\/([\w-]+)$/.exec(url.pathname))) return send(await builder(request(), { params: { action: m[1] } }));
  if ((m = /^\/draft\/([\w-]+)$/.exec(url.pathname))) return send(await draftFn(request(), { params: { id: m[1] } }));
  const file = path.join(ROOT, decodeURIComponent(url.pathname).replace(/\/$/, "/index.html"));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(b); });
}).listen(PORT);

const SHOTS = process.env.SHOTS_DIR || "";
const b = await chromium.launch();
let bad = 0, n = 0;
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const KEY = "k".repeat(31) + (++n);
  const D = { ...DEF.ls_drafts(), content: { ...SAMPLE, trade_id: "plumber" }, key_hash: createHash("sha256").update(KEY).digest("hex"), owner_name: "אורן לוי", owner_phone: "972526359513", status: "client_approved", package: "ai", plan: "full", approved_at: new Date().toISOString() };
  T.ls_drafts.push(D);
  const slug = n === 1 ? "oren-mayim" : "oren-mayim-2";
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (msg) => { if (msg.type() === "error" && !/Failed to load resource/.test(msg.text())) errs.push(msg.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // Grow's page: the owner pays, and Grow sends them back to the success address (its callback never comes here).
  await p.route(/^https:\/\/sandbox\.meshulam\.co\.il\/pay\/(\d+)/, (r) => {
    const g = grow.processes.get(/pay\/(\d+)/.exec(r.request().url())[1]); g.paid = true;
    r.fulfill({ status: 302, headers: { location: g.back } });
  });
  const check = async (name, fn) => { try { await fn(); } catch (e) { bad++; console.log(`FAIL ${w}px ${name}: ${e.message.split("\n")[0]}`); } };

  await p.goto(`${BASE}/build/#d=${D.id}:${KEY}`);
  await check("the next steps", async () => {
    await p.waitForFunction(() => /1\. כתובת לאתר/.test(document.querySelector("#approveBox").textContent));
    assert.equal(await p.isDisabled("text=לתשלום מאובטח"), true, "an address first");
    assert.match(await p.textContent("#approveBox"), /2,490 ₪ הקמה, ואחר כך 290 ₪ בחודש\./); assert.doesNotMatch(await p.textContent("#approveBox"), /מע״מ/, "final prices, no VAT");
    assert.match(await p.textContent("#approveBox"), /לתשלום היום: 2,490 ₪/);
    assert.match(await p.textContent("#approveBox"), /5,390 ₪: ההקמה ו-12 חודשים במחיר 10/);
  });
  await check("address", async () => {
    ai.queue.push({ names: [slug, "oren-plumber" + n] });
    await p.click("text=לבחור כתובת");
    await p.waitForSelector("#addrDlg[open] #addrList input[name=addr]");
    assert.match(await p.textContent("#addrList"), new RegExp(slug + "\\.sites\\.example\\.co\\.il"));
    assert.equal(await p.textContent("#addrSuffix"), ".sites.example.co.il");
    await p.check("#addrHas"); await p.fill("#addrDomain", "Oren-Mayim" + n + ".co.il");
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/address-${w}.png` });
    await p.click("#addrGo");
    await p.waitForFunction(() => !document.querySelector("#addrDlg").open);
    assert.equal(D.slug_wish, slug); assert.equal(D.domain_wish, "oren-mayim" + n + ".co.il");
    assert.match(await p.textContent("#approveBox"), new RegExp("הכתובת: " + slug + "\\.sites"));
    assert.equal(await p.isDisabled("text=לתשלום מאובטח"), true, "the terms first");
    await p.check("#termsOk");
    assert.equal(await p.isEnabled("text=לתשלום מאובטח"), true);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/pay-${w}.png` });
  });
  await check("pay and go live", async () => {
    await p.check("#approveBox input[name=cycle][value=year]");
    assert.match(await p.textContent("#approveBox"), /לתשלום היום: 5,390 ₪/);
    await p.click("text=לתשלום מאובטח");
    await p.waitForURL(/\/build\/#d=/);
    await p.waitForFunction(() => /האתר באוויר/.test(document.querySelector("#approveBox").textContent), null, { timeout: 30000 });
    assert.equal(D.status, "published"); assert.equal(D.published_slug, slug);
    assert.equal(new URL(p.url()).search, "", "?pay=ok is cleaned from the address");
    const box = await p.textContent("#approveBox");
    assert.match(box, /מחברים את הדומיין שלכם/); assert.match(box, /עד 48 שעות/);
    assert.equal(await p.locator(".dns tbody tr").count(), 2);
    assert.match(box, /הפאנל שלכם/); assert.match(box, /שנתי, 2,900 ₪ לשנה · כרטיס שמסתיים ב-4580/);
    assert.match(await p.textContent("#log"), /התשלום התקבל/);
    // nothing wider than the screen
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
    assert.match(box, /להביא את הלקוחות הראשונים/); assert.match(box, /פרופיל עסק בגוגל/);
    assert.match(box, /פתחתי אתר לעסק: אינסטלציה/);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/live-${w}.png`, fullPage: true });
  });
  await check("panel saved", async () => {
    await p.click("text=שמרתי את הקישור");
    await p.waitForFunction(() => !/הפאנל שלכם/.test(document.querySelector("#approveBox").textContent));
    assert.equal(D.panel_once, null);
  });
  await check("help", async () => {
    await p.click("text=נתקעתם? כתבו לנו");
    await p.fill("#helpMsg", "איך מחברים את הדומיין?");
    await p.click("#helpGo");
    await p.waitForFunction(() => /קיבלנו. נחזור אליכם/.test(document.querySelector("#log").textContent));
    assert.match(T.ls_leads.at(-1).service, /בקשת עזרה מהבונה: איך מחברים/);
  });
  await check("cancel", async () => {
    p.once("dialog", (d) => d.accept());
    await p.click("text=ביטול המנוי");
    await p.waitForFunction(() => /ביטלתם את המנוי/.test(document.querySelector("#approveBox").textContent));
    await p.click("text=להמשיך את המנוי");
    await p.waitForFunction(() => /החיוב הבא/.test(document.querySelector("#approveBox").textContent));
  });
  await check("update the card", async () => {
    // a refused charge: the owner updates the card on a live site, with no terms tick on the page
    T.ls_billing.find((x) => x.draft_id === D.id).state = "failed";
    await p.reload();
    await p.waitForSelector("text=לעדכן כרטיס");
    await p.click("text=לעדכן כרטיס");
    await p.waitForURL(/\/build\/#d=/);
    const pay = T.ls_payments.filter((x) => x.draft_id === D.id).at(-1);
    assert.equal(pay.kind, "card", "a Grow page for the new card");
    await p.waitForFunction(() => /החיוב הבא/.test(document.querySelector("#approveBox").textContent), null, { timeout: 30000 });
  });
  if (errs.length) { bad++; console.log(`FAIL ${w}px console: ${errs.join(" | ")}`); }
  await ctx.close();
}
// Without Grow: a payment link or one on WhatsApp. The terms tick is shown and recorded too, and nothing promises
// the site goes live by itself.
delete process.env.GROW_PAGE_CODE;
{
  const KEY = "m".repeat(32);
  const D = { ...DEF.ls_drafts(), content: { ...SAMPLE, trade_id: "plumber" }, key_hash: createHash("sha256").update(KEY).digest("hex"), owner_name: "אורן לוי", owner_phone: "972526359513", status: "client_approved", package: "ai", plan: "full", approved_at: new Date().toISOString() };
  T.ls_drafts.push(D);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  try {
    await p.goto(`${BASE}/build/#d=${D.id}:${KEY}`);
    await p.waitForFunction(() => /תשלום ההקמה/.test(document.querySelector("#approveBox").textContent));
    const box = await p.textContent("#approveBox");
    assert.match(box, /נשלח לכם בוואטסאפ קישור לתשלום/); assert.match(box, /מבטלים מתי שרוצים, בהודעה בוואטסאפ/);
    assert.doesNotMatch(box + (await p.textContent("#approveDlg")), /לבד/, "no automatic publish promised");
    await p.check("#termsOk");
    await p.waitForFunction(() => true); for (let i = 0; i < 20 && !D.terms_at; i++) await new Promise((x) => setTimeout(x, 200));
    assert.ok(D.terms_at, "the terms are recorded without Grow");
  } catch (e) { bad++; console.log(`FAIL manual mode: ${e.message.split("\n")[0]}`); }
  await ctx.close();
}
await b.close(); server.close();
if (bad) { console.log(`billing page: ${bad} failed`); process.exit(1); }
console.log("billing page: all checks passed (390 and 1280 px)");
