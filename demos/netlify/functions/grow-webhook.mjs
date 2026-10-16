// Netlify Function: Grow's server callbacks (lib/grow.mjs, lib/billing.mjs).
//   POST /api/grow-webhook                 a checkout's result (notifyUrl)
//   POST /api/grow-webhook?type=invoice    the invoice Grow issued for it (invoiceNotifyUrl): its number and link
// The callback is public, so its word is never taken: the payment is settled only after getPaymentProcessInfo,
// asked by us, says it is paid with the expected sum. Then approveTransaction tells Grow we have it (else Grow
// repeats the callback), and the site is published while Grow already has its answer.
import { json, configured, db, q, clip } from "../lib/leads.mjs";
import { growOn, readCallback, flatten, approve, processInfo } from "../lib/grow.mjs";
import { settle, autoPublish } from "../lib/billing.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function fields(req) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) return flatten(await req.json().catch(() => ({})));
  if (type.includes("multipart/form-data")) return readCallback((await req.formData()).entries());
  return readCallback(new URLSearchParams(await req.text()).entries());
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configured() || !growOn()) return json({ error: "not_configured" }, 503);
  const type = new URL(req.url).searchParams.get("type");
  let cb;
  try { cb = await fields(req); } catch { return json({ error: "bad_body" }, 400); }
  const ref = cb.cField1;
  if (!UUID.test(ref || "")) return json({ error: "unknown" }, 200); // not ours: answer, so Grow stops repeating it
  const [pay] = await db("GET", `ls_payments?id=eq.${q(ref)}&select=*`);
  if (!pay) return json({ error: "unknown" }, 200);

  if (type === "invoice") {
    const url = /^https:\/\//.test(cb.invoiceUrl || cb.documentUrl || "") ? cb.invoiceUrl || cb.documentUrl : null;
    if (url) await db("PATCH", `ls_payments?id=eq.${q(pay.id)}`, { invoice_url: clip(url, 500), invoice_number: clip(cb.invoiceNumber || cb.documentNumber, 40) || null });
    return json({ ok: true });
  }

  // The callback must be about this payment's own checkout.
  if (cb.processId && pay.process_id && String(cb.processId) !== String(pay.process_id)) return json({ error: "mismatch" }, 200);
  let out;
  try { out = await settle(pay, await processInfo(pay.process_id, pay.process_token)); }
  catch (e) { console.error("grow settle", pay.id, e.message); return json({ error: "retry" }, 502); } // Grow tries again
  if (out.paid || out.already) {
    try { await approve(cb); } catch (e) { console.error("grow approve", pay.id, e.message); }
  }
  if (out.draft) {
    const job = autoPublish(out.draft).catch((e) => console.error("auto publish", e.message));
    if (context && typeof context.waitUntil === "function") context.waitUntil(job); else await job;
  }
  return json({ ok: true, paid: Boolean(out.paid || out.already) });
};

export const config = { path: "/api/grow-webhook" };
