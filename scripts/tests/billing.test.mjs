// Payment through Grow, the address, the automatic publish and the monthly charge (lib/billing.mjs, lib/grow.mjs,
// functions/grow-webhook.mjs), end to end against fakes: Grow, plus Supabase, GitHub, Netlify and WhatsApp (builder-fakes.mjs).
// Run: node scripts/tests/billing.test.mjs  (from the repo root; needs demos/node_modules for @anthropic-ai/sdk)
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SAMPLE } from "./builder-sample.mjs";
import { T, ai, gh, DEF, nl, sentWa } from "./builder-fakes.mjs";

Object.assign(process.env, { GROW_USER_ID: "u-test", GROW_PAGE_CODE: "pc-test", GROW_SANDBOX: "1", NETLIFY_TOKEN: "nf-test", SITES_DOMAIN: "sites.example.co.il", BILLING_YEAR: "1" }); // the year ahead is off on the site; on here to test it

/* ---------------- a fake Grow ---------------- */
const grow = { calls: [], processes: new Map(), refuse: false, n: 0 };
const fakeFetch = globalThis.fetch;
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url);
  if (u.host === "secure.meshulam.co.il") throw new Error("tests must use the sandbox");
  if (u.host !== "sandbox.meshulam.co.il") return fakeFetch(url, opt);
  assert.ok(opt.body instanceof FormData, "Grow gets form data, never JSON"); assert.ok(opt.signal, "grow call has a timeout");
  const f = Object.fromEntries(opt.body.entries()), name = u.pathname.split("/").pop();
  assert.equal(f.userId, "u-test"); assert.equal(f.pageCode, "pc-test");
  grow.calls.push([name, f]);
  const ok = (data) => new Response(JSON.stringify({ status: 1, err: "", data }));
  if (name === "createPaymentProcess") {
    const id = String(++grow.n);
    grow.processes.set(id, { token: "tok" + id, sum: Number(f.sum), ref: f.cField1, paid: false });
    return ok({ url: "https://sandbox.meshulam.co.il/pay/" + id, processId: id, processToken: "tok" + id });
  }
  if (name === "getPaymentProcessInfo") {
    const p = grow.processes.get(f.processId); assert.ok(p && p.token === f.processToken, "asks about our own checkout");
    return ok({ transactions: p.paid ? [{ transactionId: "tx" + f.processId, asmachta: "A" + f.processId, sum: p.paidSum ?? p.sum, cardToken: "card-" + f.processId, cardSuffix: "4580" }] : [] });
  }
  if (name === "approveTransaction") return ok({});
  if (name === "createTransactionWithToken") {
    if (grow.refuse) return new Response(JSON.stringify({ status: 0, err: { id: 3, message: "declined" }, data: null }));
    return ok({ transactionId: "ttx" + grow.calls.length, asmachta: "T" + grow.calls.length });
  }
  throw new Error("unexpected grow " + name);
};

const F = new URL("../../demos/netlify/functions/", import.meta.url).href;
const builder = (await import(F + "builder.mjs")).default;
const webhook = (await import(F + "grow-webhook.mjs")).default;
const L = await import(new URL("../../demos/netlify/lib/billing.mjs", import.meta.url).href);
const ORIGIN = "https://service-pro-web.netlify.app";

const KEY = "k".repeat(32);
const draft = (extra = {}) => {
  const d = { ...DEF.ls_drafts(), content: { ...SAMPLE, trade_id: "plumber" }, key_hash: createHash("sha256").update(KEY).digest("hex"), owner_name: "אורן לוי", owner_phone: "972526359513", status: "client_approved", package: "ai", plan: "full", approved_at: new Date().toISOString(), ...extra };
  T.ls_drafts.push(d); return d;
};
const req = (d, action, { method = "POST", body, ip = "9.9.9.9" } = {}) => builder(new Request(`${ORIGIN}/api/builder/${action}`, {
  method, body: body !== undefined ? JSON.stringify(body) : undefined,
  headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip, "x-draft": d.id + ":" + KEY },
}), { params: { action } });
const J = async (r) => ({ ...(await r.json()), status: r.status });
const hook = (fields, query = "") => webhook(new Request(`${ORIGIN}/api/grow-webhook${query}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() }), { params: {} });
const callback = (pay, extra = {}) => ({ status: "1", "data[processId]": pay.process_id, "data[processToken]": pay.process_token, "data[transactionId]": "tx" + pay.process_id, "data[asmachta]": "A" + pay.process_id, "data[sum]": String(pay.sum), "data[customFields][cField1]": pay.id, ...extra });

/* ---------------- the address ---------------- */
const D = draft();
draft({ status: "published", published_slug: "taken-one" });
ai.queue.push({ names: ["oren-mayim", "Oren Plumber!", "kfir", "taken-one", "oren--x"] });
let r = await J(await req(D, "address", { method: "GET" }));
assert.equal(r.status, 200, JSON.stringify(r));
const slugs = r.suggestions.map((x) => x.slug);
assert.deepEqual(slugs.slice(0, 2), ["oren-mayim", "oren-plumber"], "the model's names, cleaned");
assert.ok(!slugs.includes("kfir") && !slugs.includes("taken-one"), "never a reserved or taken name");
assert.ok(slugs.includes("plumber"), "the trade as a backup");
assert.equal(r.suggestions[0].host, "oren-mayim.sites.example.co.il");
assert.ok(slugs.length <= 5);

r = await J(await req(D, "address", { body: { slug: "taken-one", rev: D.rev } })); assert.equal(r.error, "slug_taken");
r = await J(await req(D, "address", { body: { slug: "Oren Mayim", rev: D.rev } })); assert.equal(r.error, "slug_taken", "an invalid name is refused too");
r = await J(await req(D, "address", { body: { slug: "oren-mayim", domain: "not a domain", rev: D.rev } })); assert.equal(r.error, "bad_domain");
r = await J(await req(D, "address", { body: { slug: "oren-mayim", domain: "https://www.Oren-Mayim.co.il/", rev: D.rev } }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(D.slug_wish, "oren-mayim"); assert.equal(D.domain_wish, "oren-mayim.co.il");
assert.deepEqual(r.billing.address, { slug: "oren-mayim", host: "oren-mayim.sites.example.co.il", domain: "oren-mayim.co.il" });
assert.deepEqual(r.billing.prices, { setup: 1900, month: 390, year: 3900, vat: 0.18, today: { month: 2242, year: 6844 } }, "before VAT as on the site, and today's total with VAT");
// another draft can't take the same name while this one holds it
const other = draft();
r = await J(await req(other, "address", { body: { slug: "oren-mayim", rev: other.rev } })); assert.equal(r.error, "slug_taken");

/* ---------------- checkout ---------------- */
r = await J(await req(D, "pay", { body: { cycle: "month" } })); assert.equal(r.error, "terms", "the terms are accepted before paying"); assert.ok(!D.terms_at);
r = await J(await req(other, "pay", { body: { cycle: "month", terms: true } })); assert.equal(r.error, "no_address", "an address first");
r = await J(await req(D, "pay", { body: { cycle: "weekly", terms: true } })); assert.equal(r.error, "bad_cycle");
delete process.env.BILLING_YEAR;
r = await J(await req(D, "pay", { body: { cycle: "year", terms: true } })); assert.equal(r.error, "bad_cycle", "monthly only by default");
process.env.BILLING_YEAR = "1";
r = await J(await req(D, "pay", { body: { cycle: "year", terms: true } }));
assert.equal(r.status, 200, JSON.stringify(r)); assert.match(r.url, /^https:\/\/sandbox\.meshulam\.co\.il\/pay\//); assert.ok(D.terms_at, "when the terms were accepted");
let [name, f] = grow.calls.at(-1);
assert.equal(name, "createPaymentProcess");
assert.equal(f.sum, "6844.00", "the setup and 10 months for the year, with VAT"); assert.equal(f.saveCardToken, "1"); assert.equal(f.paymentNum, "1");
assert.equal(f["pageField[fullName]"], "אורן לוי"); assert.equal(f["pageField[phone]"], "0526359513");
assert.equal(f.notifyUrl, ORIGIN + "/api/grow-webhook"); assert.equal(f.invoiceNotifyUrl, ORIGIN + "/api/grow-webhook?type=invoice");
assert.equal(f.successUrl, ORIGIN + "/build/?pay=ok"); assert.ok(!JSON.stringify(f).includes(KEY), "the draft's key never goes to Grow");
assert.match(f.description, /^Easy Landing - נציג AI - הקמה ושנה מראש$/);
let pay = T.ls_payments.at(-1);
assert.equal(f.cField1, pay.id); assert.equal(pay.status, "pending"); assert.equal(pay.sum, 6844); assert.equal(pay.cycle, "year"); assert.equal(pay.process_id, "1");

/* ---------------- the callback is never taken at its word ---------------- */
r = await J(await hook(callback(pay)));
assert.equal(r.paid, false, "Grow says it isn't paid: nothing changes " + JSON.stringify(r)); assert.equal(D.status, "client_approved"); assert.equal(pay.status, "pending");
assert.ok(!grow.calls.some(([n]) => n === "approveTransaction"));
r = await J(await hook(callback(pay, { "data[processId]": "999" }))); assert.equal(r.error, "mismatch");
r = await J(await hook({ status: "1", "data[customFields][cField1]": "not-ours" })); assert.equal(r.error, "unknown"); assert.equal(r.status, 200);
// a short payment is not a payment
grow.processes.get("1").paid = true; grow.processes.get("1").paidSum = 100;
const leadsBefore = T.ls_leads.length;
r = await J(await hook(callback(pay))); assert.equal(r.paid, false); assert.equal(pay.status, "pending");
assert.match(T.ls_leads.at(-1).service, /תשלום בסכום חסר/); assert.ok(T.ls_leads.length > leadsBefore);
delete grow.processes.get("1").paidSum;

/* ---------------- paid: published by itself ---------------- */
r = await J(await hook(callback(pay)));
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.paid, true);
assert.equal(pay.status, "paid"); assert.equal(pay.asmachta, "A1"); assert.equal(pay.transaction_id, "tx1");
assert.ok(grow.calls.some(([n, x]) => n === "approveTransaction" && x.transactionId === "tx1"), "Grow is told we have it");
assert.equal(D.status, "published", "published without כפיר"); assert.equal(D.published_slug, "oren-mayim");
assert.ok(gh.files.has("clients/oren-mayim/index.html"), "the site is in the repo");
assert.equal(D.site_sub, "oren-mayim.sites.example.co.il"); assert.equal(D.site_host, "oren-mayim.sites.example.co.il");
assert.equal(D.domain, "oren-mayim.co.il"); assert.equal(D.domain_state, "waiting", "their own domain is added, waiting for its DNS");
const site = [...nl.sites.values()].find((s) => s.id === D.site_id); assert.ok(site.domain_aliases.includes("oren-mayim.co.il"));
assert.ok(T.ls_clients.some((c) => c.slug === "oren-mayim" && c.active), "the lead system row");
assert.match(D.panel_once, /\/panel\/#k=oren-mayim:/, "the owner's panel link waits for them");
assert.match(T.ls_leads.at(-1).service, /אתר חדש שולם ופורסם לבד: https:\/\/oren-mayim\.sites\.example\.co\.il\//);
let B = T.ls_billing.find((b) => b.draft_id === D.id);
assert.equal(B.cycle, "year"); assert.equal(B.amount, 4602, "10 months with VAT"); assert.equal(B.card_token, "card-1"); assert.equal(B.card_suffix, "4580"); assert.equal(B.state, "active");
const nextYear = new Date(pay.paid_at); nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
assert.equal(new Date(B.next_charge_at).toISOString().slice(0, 10), nextYear.toISOString().slice(0, 10), "the next charge in a year");
// Grow calls again: settled once
const commits = gh.calls.filter(([m, p]) => m === "POST" && p === "/git/commits").length;
r = await J(await hook(callback(pay))); assert.equal(r.paid, true);
assert.equal(gh.calls.filter(([m, p]) => m === "POST" && p === "/git/commits").length, commits, "no second publish");
assert.equal(T.ls_billing.filter((b) => b.draft_id === D.id).length, 1);

// the invoice
r = await J(await hook({ "data[customFields][cField1]": pay.id, "data[invoiceNumber]": "40021", "data[invoiceUrl]": "https://sandbox.meshulam.co.il/doc/40021.pdf" }, "?type=invoice"));
assert.equal(r.ok, true); assert.equal(pay.invoice_number, "40021");

/* ---------------- what the owner sees ---------------- */
r = await J(await req(D, "state", { method: "GET" }));
assert.equal(r.state.status, "published");
assert.deepEqual(r.billing.invoices, [{ url: "https://sandbox.meshulam.co.il/doc/40021.pdf", number: "40021", sum: 6844, date: pay.paid_at }]);
assert.equal(r.billing.sub.state, "active"); assert.equal(r.billing.sub.card, "4580");
assert.equal(r.billing.domain.state, "waiting"); assert.deepEqual(r.billing.domain.dns.map((x) => x.type), ["A", "CNAME"]);
assert.ok(!JSON.stringify(r.billing).includes("card-1"), "the card token never goes to the page");
assert.match(r.billing.panel, /panel/);
// The launch kit: a tagged link per channel (made once), and texts from the owner's own facts.
const L1 = r.billing.launch;
assert.equal(L1.tracked, true); assert.equal(T.ls_links.filter((l) => l.client_slug === "oren-mayim").length, 7, "3 channels and the 4 networks (none given: all four)");
assert.deepEqual(L1.social.map((x) => x.id), ["instagram", "facebook", "tiktok", "youtube"]);
assert.ok(L1.social.every((x) => /^https:\/\/oren-mayim\.sites\.example\.co\.il\/\?s=[a-z0-9]{4}$/.test(x.link) && x.how), "a tagged link and where to paste it");
assert.equal(new Set([L1.gbp.link, ...L1.social.map((x) => x.link)]).size, 5, "each network its own link");
assert.ok(T.ls_links.some((l) => l.client_slug === "oren-mayim" && l.label === "ביו באינסטגרם"));
assert.match(L1.gbp.link, /^https:\/\/oren-mayim\.sites\.example\.co\.il\/\?s=[a-z0-9]{4}$/);
assert.notEqual(L1.gbp.link, L1.status.link, "each channel its own link");
assert.match(L1.status.text, /^פתחתי אתר לעסק: אינסטלציה בחדרה, עמק חפר והשרון\. אפשר לראות שם מחירים, לשלוח תמונה ולפנות בכל שעה, ואני חוזר תוך 15 דק׳\.\n/);
assert.match(L1.groups.text, /^היי לכולם, אני אורן, אינסטלציה ב.+, 12 שנה בתחום\./);
assert.ok(L1.gbp.steps.some((x) => /^אזור שירות: /.test(x)));
r = await J(await req(D, "state", { method: "GET" }));
assert.equal(T.ls_links.filter((l) => l.client_slug === "oren-mayim").length, 7, "the links are made once");
assert.equal(r.billing.launch.gbp.link, L1.gbp.link);
r = await J(await req(D, "panel-seen", { body: {} })); assert.equal(r.billing.panel, null); assert.equal(D.panel_once, null);
// "check now": the DNS isn't there yet
r = await J(await req(D, "domain-check", { body: {} })); assert.ok(["waiting", "live"].includes(r.domain));
// help from any step
r = await J(await req(D, "help", { body: { message: "לא מבין איך מחברים את הדומיין" } }));
assert.equal(r.sent, true); assert.match(T.ls_leads.at(-1).service, /^בקשת עזרה מהבונה: לא מבין/);
r = await J(await req(D, "help", { body: { message: "" } })); assert.equal(r.error, "empty");

/* ---------------- the monthly charge ---------------- */
// switch this subscription to monthly to exercise the run
Object.assign(B, { cycle: "month", amount: 390, next_charge_at: "2027-01-31T08:00:00.000Z" });
let now = new Date("2027-01-31T09:00:00Z");
let out = await L.runBilling(now);
assert.equal(out.charged, 1); [name, f] = grow.calls.at(-1);
assert.equal(name, "createTransactionWithToken"); assert.equal(f.cardToken, "card-1"); assert.equal(f.sum, "390.00");
assert.equal(new Date(B.next_charge_at).toISOString().slice(0, 10), "2027-02-28", "Jan 31 + a month is Feb 28");
assert.equal(T.ls_payments.at(-1).kind, "month"); assert.equal(T.ls_payments.at(-1).status, "paid");
out = await L.runBilling(now); assert.equal(out.charged, 0, "nothing due twice the same day");

// refused: tried again after 3 days, the owner sees "update card", and after 4 refusals the lead system pauses
grow.refuse = true; now = new Date("2027-02-28T09:00:00Z");
const alerts0 = T.ls_leads.length;
out = await L.runBilling(now); assert.equal(out.failed, 1); assert.equal(B.state, "failed"); assert.equal(B.fails, 1);
assert.match(T.ls_leads.at(-1).service, /החיוב החודשי \(390 ₪\) לא עבר/); assert.equal(T.ls_leads.length, alerts0 + 1);
assert.equal(new Date(B.next_charge_at).toISOString().slice(0, 10), "2027-03-03");
for (const day of ["2027-03-03", "2027-03-06"]) { out = await L.runBilling(new Date(day + "T09:00:00Z")); assert.equal(out.failed, 1); }
assert.equal(B.fails, 3); assert.equal(T.ls_leads.length, alerts0 + 1, "one alert for the first refusal, not every retry");
out = await L.runBilling(new Date("2027-03-09T09:00:00Z")); assert.equal(out.suspended, 1); assert.equal(B.state, "suspended");
assert.equal(T.ls_clients.find((c) => c.slug === "oren-mayim").active, false, "the lead system pauses; the page stays");
r = await J(await req(D, "state", { method: "GET" })); assert.equal(r.billing.sub.state, "suspended");
// the owner updates the card: the amount due, then everything is back
grow.refuse = false;
r = await J(await req(D, "pay", { body: { terms: true } })); assert.equal(r.status, 200, JSON.stringify(r));
[name, f] = grow.calls.at(-1); assert.equal(f.sum, "390.00"); assert.equal(f.saveCardToken, "1");
pay = T.ls_payments.at(-1); assert.equal(pay.kind, "card");
grow.processes.get(pay.process_id).paid = true;
// the callback never comes: the 15-minute run asks Grow itself
pay.created_at = new Date(Date.now() - 20 * 60 * 1000).toISOString();
out = await L.runPending();
assert.equal(out.settled, 1); assert.equal(pay.status, "paid");
assert.equal(B.state, "active"); assert.equal(B.fails, 0); assert.equal(B.card_token, "card-" + pay.process_id, "the new card");
assert.equal(new Date(B.next_charge_at).toISOString().slice(0, 10), "2027-03-28");
assert.equal(T.ls_clients.find((c) => c.slug === "oren-mayim").active, true, "the lead system is back");

/* ---------------- cancelling ---------------- */
r = await J(await req(D, "cancel", { body: {} }));
assert.equal(r.billing.sub.state, "cancelling"); assert.equal(B.end_at, new Date(B.next_charge_at).toISOString(), "runs to the end of what was paid");
r = await J(await req(D, "resume", { body: {} })); assert.equal(B.state, "active"); assert.equal(B.end_at, null);
await J(await req(D, "cancel", { body: {} }));
const end = new Date(B.end_at);
// the next charge falls on the end: it is never made
const paysBefore = T.ls_payments.length;
out = await L.runBilling(new Date(end.getTime() + 2 * 86_400_000));
assert.equal(out.ended, 1); assert.equal(B.state, "ended"); assert.equal(T.ls_payments.length, paysBefore, "no charge after cancelling");
assert.equal(T.ls_clients.find((c) => c.slug === "oren-mayim").active, false);
r = await J(await req(D, "cancel", { body: {} })); assert.equal(r.error, "no_subscription");

/* ---------------- a failed publish is tried again ---------------- */
const E = draft();
await J(await req(E, "address", { body: { slug: "second-site", rev: E.rev } }));
r = await J(await req(E, "pay", { body: { cycle: "month", terms: true } }));
pay = T.ls_payments.at(-1); assert.equal(pay.sum, 2242, "monthly: the setup today, with VAT");
grow.processes.get(pay.process_id).paid = true;
const token = process.env.GITHUB_TOKEN; delete process.env.GITHUB_TOKEN; // the repo is down
r = await J(await hook(callback(pay)));
assert.equal(r.paid, true); assert.equal(E.status, "paid"); assert.equal(E.publish_error, "not_configured"); assert.equal(E.publish_tries, 1);
assert.match(T.ls_leads.at(-1).service, /שולם, אבל הפרסום האוטומטי נכשל/);
r = await J(await req(E, "state", { method: "GET" })); assert.equal(r.billing.publishing, "working");
process.env.GITHUB_TOKEN = token;
E.paid_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();
out = await L.runPending(); assert.equal(out.published, 1); assert.equal(E.status, "published"); assert.equal(E.publish_error, null);
B = T.ls_billing.find((b) => b.draft_id === E.id); assert.equal(B.cycle, "month"); assert.equal(B.amount, 460.2);

/* ---------------- without Grow ---------------- */
delete process.env.GROW_PAGE_CODE;
r = await J(await hook(callback(pay))); assert.equal(r.status, 503);
const G = draft();
r = await J(await req(G, "state", { method: "GET" })); assert.equal(r.billing.on, false, "the page falls back to payment on WhatsApp");
process.env.GROW_PAGE_CODE = "pc-test";

assert.ok(sentWa.length > 0);
console.log("all billing tests passed");
