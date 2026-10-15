// Payment, the monthly charge and the automatic publish (0017_billing.sql). Card payments through Grow (lib/grow.mjs).
// The owner approves the site and picks its address in the builder, pays the setup on Grow's page (and the year,
// for the annual plan), and the card is saved as a Grow token. Grow's callback, checked against Grow itself,
// marks the draft paid, and the site is published at once at the address the owner picked; their own domain is
// added too, and the hourly check makes it the main address once its DNS points here. From then on the monthly
// (or yearly) payment is charged on the token by the daily run (functions/billing.mjs). A refused card is tried
// again after 3 days, the owner sees "לעדכן כרטיס" in the builder, and after 4 refusals the lead system pauses
// (the page stays). Cancelling: 30 days' notice, then no more charges. כפיר gets a WhatsApp alert at every step
// that needs him, and never for one that went well by itself, except a new paid site.
import { db, q, clip, israeliPhone } from "./leads.mjs";
import { growOn, createPayment, processInfo, chargeToken } from "./grow.mjs";
import { getDraft, saveDraft, alertKfir, publishDraft, PublishError, slugFree, hostFor } from "./builder.mjs";
import { hostingOn, cleanDomain, addDomain, dnsSteps } from "./hosting.mjs";

// Keep in step with #plans in demos/index.html, the approval dialog in demos/build/index.html and the chats' prompts.
export const PRICES = { presence: { setup: 1500, month: 150 }, ai: { setup: 1900, month: 390 } };
export const CYCLES = ["month", "year"];
const YEAR_MONTHS = 10; // the annual prepayment: 12 months for the price of 10
export const NOTICE_DAYS = 30;
export const RETRY_DAYS = 3, MAX_FAILS = 4;
const PKG_HE = { presence: "נוכחות", ai: "נציג AI" };

// The prices are before VAT; Grow charges them with VAT (VAT_RATE, default 18%), and its invoice shows both.
export const vatRate = () => { const v = Number(process.env.VAT_RATE); return Number.isFinite(v) && v >= 0 && v < 1 ? v : 0.18; };
export const withVat = (n) => Math.round(n * (1 + vatRate()) * 100) / 100;
const netPeriod = (pkg, cycle) => PRICES[pkg].month * (cycle === "year" ? YEAR_MONTHS : 1);
export const periodSum = (pkg, cycle) => withVat(netPeriod(pkg, cycle));
export const checkoutSum = (pkg, cycle) => withVat(PRICES[pkg].setup + (cycle === "year" ? netPeriod(pkg, "year") : 0));
export function addPeriod(date, cycle) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + (cycle === "year" ? 12 : 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); // Jan 31 + a month = Feb 28
  return d;
}
const iso = (d) => new Date(d).toISOString();
const DAY = 86_400_000;
// Grow wants a plain Israeli mobile: 0521234567.
const localPhone = (d) => { const p = israeliPhone(d.content.whatsapp) || (d.owner_phone && { intl: d.owner_phone }); return p ? "0" + p.intl.slice(3) : undefined; };
const site = () => process.env.BUILDER_SITE_URL || "https://service-pro-web.netlify.app";

export const billingOf = async (draftId) => (await db("GET", `ls_billing?draft_id=eq.${q(draftId)}&select=*`))[0] || null;
const paymentsOf = (draftId) => db("GET", `ls_payments?draft_id=eq.${q(draftId)}&status=eq.paid&select=kind,sum,paid_at,invoice_url,invoice_number&order=paid_at.desc&limit=24`);

/* ---------------- the address ---------------- */

/**
 * The owner's pick: a free address with us (slug), and optionally their own domain to connect after payment.
 * Returns the draft patch, or { error }.
 */
export async function chooseAddress(d, { slug, domain }) {
  slug = String(slug || "").toLowerCase().trim();
  if (!(await slugFree(slug, d.id))) return { error: "slug_taken" };
  let own = null;
  if (domain) {
    own = cleanDomain(domain);
    if (!own) return { error: "bad_domain" };
    if ((await db("GET", `ls_drafts?domain=eq.${q(own)}&id=neq.${q(d.id)}&select=id`)).length) return { error: "domain_taken" };
  }
  return { patch: { slug_wish: slug, domain_wish: own } };
}

/* ---------------- checkout ---------------- */

/**
 * A Grow payment page for the draft: the setup (and the year, on the annual plan), or, after a refused monthly
 * charge, the amount due with a new card. Returns { url } to send the owner to.
 */
export async function checkout(d, { cycle, origin }) {
  if (!growOn()) return { error: "not_configured" };
  const b = await billingOf(d.id);
  let kind, sum, description;
  if (b && ["failed", "suspended"].includes(b.state)) {
    kind = "card"; sum = b.amount; description = `Easy Landing - ${PKG_HE[b.package]} - ${b.cycle === "year" ? "שנה" : "חודש"}`;
  } else {
    if (d.status !== "client_approved" || d.paid_at) return { error: "locked" };
    if (!d.slug_wish) return { error: "no_address" };
    if (!CYCLES.includes(cycle)) return { error: "bad_cycle" };
    kind = "setup"; sum = checkoutSum(d.package, cycle);
    description = `Easy Landing - ${PKG_HE[d.package]} - הקמה${cycle === "year" ? " ושנה מראש" : ""}`;
  }
  const [row] = await db("POST", "ls_payments", { draft_id: d.id, kind, cycle: kind === "card" ? b.cycle : cycle, package: kind === "card" ? b.package : d.package, sum, status: "pending" }, "return=representation");
  const back = `${origin || site()}/build/`;
  let page;
  try {
    page = await createPayment({
      sum, description, name: d.owner_name || d.content.owner_name, phone: localPhone(d), ref: row.id, saveToken: true,
      notifyUrl: `${site()}/api/grow-webhook`, invoiceNotifyUrl: `${site()}/api/grow-webhook?type=invoice`,
      successUrl: back + "?pay=ok", cancelUrl: back + "?pay=cancel",
    });
  } catch (e) {
    console.error("grow checkout", e.message);
    await db("PATCH", `ls_payments?id=eq.${q(row.id)}`, { status: "failed", error: clip(e.message, 300) });
    return { error: "pay_failed" };
  }
  await db("PATCH", `ls_payments?id=eq.${q(row.id)}`, { process_id: page.processId, process_token: page.processToken });
  return { url: page.url };
}

/**
 * A checkout Grow says is paid (processInfo, never the callback's own word). Idempotent: Grow calls more than once,
 * and the return page and the daily run may check the same payment too. Returns the draft to publish, if any.
 */
export async function settle(pay, info, now = new Date()) {
  if (pay.status === "paid") return { already: true };
  if (!info.paid) return { paid: false };
  if (info.sum && info.sum + 0.01 < Number(pay.sum)) {
    await alertKfirById(pay.draft_id, `תשלום בסכום חסר: ${info.sum} ₪ במקום ${pay.sum} ₪. אסמכתא ${info.asmachta}`);
    return { paid: false, short: true };
  }
  // Only the first to flip it from pending goes on: two callbacks at once settle it once.
  const hit = await db("PATCH", `ls_payments?id=eq.${q(pay.id)}&status=eq.pending`, { status: "paid", paid_at: iso(now), transaction_id: info.transactionId || null, asmachta: info.asmachta || null }, "return=representation");
  if (!hit.length) return { already: true };
  const d = await getDraft(pay.draft_id);
  if (!d) return { paid: true };
  const token = info.cardToken ? { card_token: info.cardToken, card_suffix: info.cardSuffix || null } : {};

  if (pay.kind === "card") {
    const b = await billingOf(d.id);
    const wasOff = b.state === "suspended";
    await db("PATCH", `ls_billing?draft_id=eq.${q(d.id)}`, { ...token, state: "active", fails: 0, due_since: null, next_charge_at: iso(addPeriod(b.due_since || b.next_charge_at, b.cycle)), updated_at: iso(now) });
    if (wasOff && d.package === "ai" && d.published_slug) await db("PATCH", `ls_clients?slug=eq.${q(d.published_slug)}`, { active: true });
    await alertKfir(d, wasOff ? "הכרטיס עודכן והתשלום עבר. מערכת הלידים חזרה לפעול" : "הכרטיס עודכן והתשלום החודשי עבר");
    return { paid: true };
  }

  // The setup: the subscription starts now, the first monthly (or the next year) one period from today.
  await db("POST", "ls_billing", {
    draft_id: d.id, package: pay.package, cycle: pay.cycle, amount: periodSum(pay.package, pay.cycle), ...token,
    state: "active", fails: 0, next_charge_at: iso(addPeriod(now, pay.cycle)),
  }, "resolution=merge-duplicates");
  if (!info.cardToken) await alertKfir(d, "התשלום עבר, אבל Grow לא החזירו אסימון כרטיס: החיוב החודשי לא יוכל לרוץ לבד");
  const paid = await saveDraft(d, { status: "paid", paid_at: iso(now), plan: "full" });
  return { paid: true, draft: paid };
}

async function alertKfirById(id, what) { const d = await getDraft(id); if (d) await alertKfir(d, what); }

// The callback and the return page both end here: ask Grow about the checkout, settle it, publish.
export async function confirmPayment(pay, now = new Date()) {
  if (!pay.process_id) return { paid: false };
  const info = await processInfo(pay.process_id, pay.process_token);
  const out = await settle(pay, info, now);
  if (out.draft) out.published = await autoPublish(out.draft);
  return out;
}

/* ---------------- the automatic publish ---------------- */

/**
 * A paid draft goes live by itself at the address the owner picked. A failure leaves it paid with the reason in
 * publish_error; the 15-minute run tries again (3 times), then כפיר gets it in /build/admin/.
 */
export async function autoPublish(d) {
  if (d.status !== "paid" || !d.slug_wish || (d.publish_tries || 0) >= 3) return { state: "skipped" };
  let slug = d.published_slug || d.slug_wish;
  try {
    let out;
    try { out = await publishDraft(d, slug); }
    catch (e) {
      // Taken since the owner picked it (a business made by hand): the same name with a short tail.
      if (!(e instanceof PublishError) || e.code !== "slug_taken" || d.published_slug) throw e;
      slug = `${d.slug_wish.slice(0, 33)}-${d.id.slice(0, 4)}`;
      out = await publishDraft(await getDraft(d.id), slug);
    }
    let saved = out.draft;
    if (d.domain_wish && hostingOn() && saved.site_id && !saved.domain) {
      try {
        await addDomain(saved.site_id, d.domain_wish);
        saved = await saveDraft(saved, { domain: d.domain_wish, domain_state: "waiting", domain_since: new Date().toISOString() });
      } catch (e) { console.error("auto domain", e.message); await alertKfir(saved, `האתר באוויר, אבל לא הצלחנו להוסיף את הדומיין ${d.domain_wish}. להוסיף מהניהול`); }
    }
    const where = out.hosting.state === "live" ? out.hosting.url : "ממתין להעלאה";
    await alertKfir(saved, `אתר חדש שולם ופורסם לבד: ${where}${out.leads.panel ? ". קישור הפאנל בניהול" : ""}`);
    if (out.leads.panel) await saveDraft(saved, { panel_once: out.leads.panel }).catch(() => null);
    return { state: out.hosting.state === "failed" ? "hosting_failed" : "live", slug };
  } catch (e) {
    const code = e instanceof PublishError ? e.code : "server";
    console.error("auto publish", d.id, code, e.message);
    const fresh = await getDraft(d.id);
    const tries = (fresh.publish_tries || 0) + 1;
    await saveDraft(fresh, { publish_error: clip(code === "server" ? e.message : code, 200), publish_tries: tries });
    if (tries === 1 || tries >= 3) await alertKfir(fresh, `שולם, אבל הפרסום האוטומטי נכשל (${code})${tries >= 3 ? ". לפרסם מהניהול" : ". ננסה שוב בעוד רבע שעה"}`);
    return { state: "failed", code };
  }
}

/* ---------------- what the owner sees ---------------- */

export async function billingView(d) {
  const b = await billingOf(d.id);
  const payments = d.paid_at || b ? await paymentsOf(d.id) : [];
  return {
    on: growOn(),
    address: d.slug_wish ? { slug: d.slug_wish, host: hostFor(d.slug_wish), domain: d.domain_wish || null } : null,
    // Before VAT, as the site shows them, and what is charged today with VAT for each plan.
    prices: d.package ? { setup: PRICES[d.package].setup, month: PRICES[d.package].month, year: netPeriod(d.package, "year"), vat: vatRate(), today: { month: checkoutSum(d.package, "month"), year: checkoutSum(d.package, "year") } } : null,
    sub: b ? { state: b.state, cycle: b.cycle, amount: b.amount, next: b.next_charge_at, end: b.end_at || null, card: b.card_suffix || null } : null,
    invoices: payments.filter((p) => p.invoice_url).map((p) => ({ url: p.invoice_url, number: p.invoice_number, sum: Number(p.sum), date: p.paid_at })),
    publishing: d.status === "paid" ? (d.publish_error && (d.publish_tries || 0) >= 3 ? "stuck" : "working") : null,
    // The owner's own domain after publishing: the two records for their registrar while it waits.
    domain: d.domain ? { name: d.domain, state: d.domain_state || "none", dns: d.domain_state === "waiting" && d.site_netlify ? dnsSteps(d.domain, { netlifyHost: d.site_netlify }) : null } : null,
    // The owner's panel link, shown until they say they saved it (only its key's hash stays in ls_clients).
    panel: d.panel_once || null,
  };
}

/* ---------------- cancelling ---------------- */

export async function cancel(d, now = new Date()) {
  const b = await billingOf(d.id);
  if (!b || !["active", "failed"].includes(b.state)) return { error: "no_subscription" };
  // 30 days' notice; a year paid ahead runs to its end.
  const end = new Date(Math.max(now.getTime() + NOTICE_DAYS * DAY, b.cycle === "year" ? new Date(b.next_charge_at).getTime() : 0));
  await db("PATCH", `ls_billing?draft_id=eq.${q(d.id)}`, { state: "cancelling", end_at: iso(end), updated_at: iso(now) });
  await alertKfir(d, `בעל העסק ביטל את המנוי. הוא פעיל עד ${end.toISOString().slice(0, 10)}`);
  return { end: iso(end) };
}

export async function resume(d, now = new Date()) {
  const b = await billingOf(d.id);
  if (!b || b.state !== "cancelling") return { error: "no_subscription" };
  await db("PATCH", `ls_billing?draft_id=eq.${q(d.id)}`, { state: "active", end_at: null, updated_at: iso(now) });
  await alertKfir(d, "בעל העסק חזר בו מהביטול. המנוי ממשיך");
  return { ok: true };
}

/* ---------------- the daily run (functions/billing.mjs) and the 15-minute one ---------------- */

async function pauseLeads(d) { if (d.package === "ai" && d.published_slug) await db("PATCH", `ls_clients?slug=eq.${q(d.published_slug)}`, { active: false }); }

/** Every subscription due today: one charge on the saved card. Also ends the cancelled ones whose notice is over. */
export async function runBilling(now = new Date(), charge = chargeToken) {
  const out = { charged: 0, failed: 0, ended: 0, suspended: 0 };
  if (!growOn()) return out;
  for (const b of await db("GET", `ls_billing?state=eq.cancelling&end_at=lte.${q(iso(now))}&select=*&limit=200`)) {
    await db("PATCH", `ls_billing?draft_id=eq.${q(b.draft_id)}`, { state: "ended", updated_at: iso(now) });
    const d = await getDraft(b.draft_id);
    if (d) { await pauseLeads(d); await alertKfir(d, "המנוי הסתיים אחרי ההודעה של 30 יום. האתר נשאר, המערכת כבויה"); }
    out.ended++;
  }
  const due = await db("GET", `ls_billing?state=in.(active,failed,cancelling)&next_charge_at=lte.${q(iso(now))}&select=*&order=next_charge_at.asc&limit=200`);
  for (const b of due) {
    if (b.state === "cancelling" && new Date(b.next_charge_at) >= new Date(b.end_at)) continue;
    const d = await getDraft(b.draft_id);
    if (!d) continue;
    if (!b.card_token) { await db("PATCH", `ls_billing?draft_id=eq.${q(b.draft_id)}`, { state: "failed", next_charge_at: iso(now.getTime() + RETRY_DAYS * DAY), updated_at: iso(now) }); continue; }
    const [row] = await db("POST", "ls_payments", { draft_id: d.id, kind: b.cycle, cycle: b.cycle, package: b.package, sum: b.amount, status: "pending" }, "return=representation");
    try {
      const r = await charge({ token: b.card_token, sum: b.amount, description: `Easy Landing - ${PKG_HE[b.package]} - ${b.cycle === "year" ? "שנה" : "חודש"}`, ref: row.id });
      await db("PATCH", `ls_payments?id=eq.${q(row.id)}`, { status: "paid", paid_at: iso(now), transaction_id: r.transactionId || null, asmachta: r.asmachta || null });
      await db("PATCH", `ls_billing?draft_id=eq.${q(b.draft_id)}`, { state: b.state === "cancelling" ? "cancelling" : "active", fails: 0, due_since: null, next_charge_at: iso(addPeriod(b.due_since || b.next_charge_at, b.cycle)), updated_at: iso(now) });
      out.charged++;
    } catch (e) {
      const fails = (b.fails || 0) + 1;
      // The period that is due keeps its start, so a late payment doesn't move the billing day.
      const dueSince = b.due_since || b.next_charge_at;
      await db("PATCH", `ls_payments?id=eq.${q(row.id)}`, { status: "failed", error: clip(e.message, 300) });
      if (fails >= MAX_FAILS) {
        await db("PATCH", `ls_billing?draft_id=eq.${q(b.draft_id)}`, { state: "suspended", fails, due_since: dueSince, updated_at: iso(now) });
        await pauseLeads(d);
        await alertKfir(d, `החיוב החודשי נכשל ${fails} פעמים. מערכת הלידים הושהתה, האתר נשאר. בעל העסק רואה "לעדכן כרטיס" בבונה`);
        out.suspended++;
      } else {
        await db("PATCH", `ls_billing?draft_id=eq.${q(b.draft_id)}`, { state: "failed", fails, due_since: dueSince, next_charge_at: iso(now.getTime() + RETRY_DAYS * DAY), updated_at: iso(now) });
        if (fails === 1) await alertKfir(d, `החיוב החודשי (${b.amount} ₪) לא עבר. ננסה שוב בעוד ${RETRY_DAYS} ימים, ובעל העסק רואה "לעדכן כרטיס" בבונה`);
        out.failed++;
      }
    }
  }
  return out;
}

/**
 * Every 15 minutes (reminders.mjs): a checkout whose callback never came is asked about (Grow's own answer), and a
 * paid draft whose automatic publish failed is tried again. Checkouts nobody paid within a day are closed.
 */
export async function runPending(now = new Date()) {
  const out = { checked: 0, settled: 0, published: 0, expired: 0 };
  if (!growOn()) return out;
  const since = iso(now.getTime() - DAY), quiet = iso(now.getTime() - 10 * 60 * 1000);
  for (const p of await db("GET", `ls_payments?status=eq.pending&created_at=lte.${q(quiet)}&select=*&order=created_at.desc&limit=50`)) {
    if (!p.process_id) continue;
    out.checked++;
    try {
      const r = await confirmPayment(p, now);
      if (r.paid && !r.already) out.settled++;
      else if (!r.paid && new Date(p.created_at) < new Date(since)) { await db("PATCH", `ls_payments?id=eq.${q(p.id)}&status=eq.pending`, { status: "expired" }); out.expired++; }
    } catch (e) { console.error("pending payment", p.id, e.message); }
  }
  // Paid more than 5 minutes ago and still not live: the publish right after the payment failed or never ran
  // (also a payment כפיר marked by hand, for a bank transfer).
  for (const d of await db("GET", `ls_drafts?status=eq.paid&paid_at=lte.${q(iso(now.getTime() - 5 * 60 * 1000))}&select=*&limit=20`)) {
    if (!d.slug_wish || (d.publish_tries || 0) >= 3) continue;
    const r = await autoPublish(d);
    if (r.state === "live") out.published++;
  }
  return out;
}
