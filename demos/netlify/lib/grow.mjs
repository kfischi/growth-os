// Grow (formerly Meshulam): card payments and the receipt (קבלה, the business is an עוסק פטור) for each one, through the "light server" API.
//   GROW_USER_ID     the business's userId at Grow
//   GROW_PAGE_CODE   the payment page's pageCode (a regular page, with card token saving allowed)
//   GROW_API_KEY     optional, only for accounts Grow gave one
//   GROW_SANDBOX=1   Grow's test environment (sandbox.meshulam.co.il) instead of the real one
// Grow issues the invoice or receipt for every payment itself (turn on documents in the Grow account) and sends it
// to the payer; the invoice webhook (invoiceNotifyUrl) gives us its link too.
// Every call is server side, form data, never JSON (Grow blocks calls from a browser).
// The field names follow Grow's reference (https://grow-il.readme.io); scripts/grow-check.mjs tries them on the sandbox.
export const growOn = () => Boolean(process.env.GROW_USER_ID && process.env.GROW_PAGE_CODE);
const base = () => (process.env.GROW_SANDBOX === "1" ? "https://sandbox.meshulam.co.il" : "https://secure.meshulam.co.il") + "/api/light/server/1.0/";

// Grow refuses some characters in its fields: keep letters (Hebrew too), digits, spaces and simple punctuation.
const plain = (s, n) => String(s ?? "").replace(/[^\p{L}\p{N} .,\-()]/gu, " ").replace(/\s+/g, " ").trim().slice(0, n);

async function call(name, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries({ userId: process.env.GROW_USER_ID, pageCode: process.env.GROW_PAGE_CODE, ...(process.env.GROW_API_KEY ? { apiKey: process.env.GROW_API_KEY } : {}), ...fields })) {
    if (v !== undefined && v !== null && v !== "") form.append(k, String(v));
  }
  const res = await fetch(base() + name, { method: "POST", body: form, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { throw new Error(`grow ${name}: ${res.status} not json`); }
  if (Number(data.status) !== 1) { const e = new Error(`grow ${name}: ${(data.err && (data.err.message || data.err.id)) || "failed"}`); e.grow = data.err || null; throw e; }
  return data.data || {};
}

/**
 * A payment page for one checkout. Returns { url, processId, processToken }. The url is good for about 10 minutes,
 * so a new one is made for every click on "לתשלום".
 * fields: { sum, description, name, phone, email?, ref (our payment id), notifyUrl, invoiceNotifyUrl, successUrl, cancelUrl, saveToken }
 */
export async function createPayment(p) {
  const name = plain(p.name, 60);
  const data = await call("createPaymentProcess", {
    sum: Number(p.sum).toFixed(2), description: plain(p.description, 100), paymentNum: 1, maxPaymentNum: 1,
    successUrl: p.successUrl, cancelUrl: p.cancelUrl, notifyUrl: p.notifyUrl, invoiceNotifyUrl: p.invoiceNotifyUrl,
    saveCardToken: p.saveToken ? 1 : undefined,
    // Grow wants a first and a last name; with one word the payer fills the name in on Grow's page.
    "pageField[fullName]": name.includes(" ") ? name : undefined,
    "pageField[phone]": p.phone, "pageField[email]": p.email,
    cField1: p.ref,
  });
  if (!/^https:\/\//.test(data.url || "")) throw new Error("grow createPaymentProcess: no url");
  return { url: data.url, processId: String(data.processId || ""), processToken: String(data.processToken || "") };
}

/**
 * What Grow itself says about a checkout, never what a callback claims: { paid, sum, transactionId, asmachta, cardToken, cardSuffix }.
 * paid means a transaction with an approval number (asmachta).
 */
export async function processInfo(processId, processToken) {
  const data = await call("getPaymentProcessInfo", { processId, processToken });
  const tx = (Array.isArray(data.transactions) ? data.transactions : []).find((t) => t && t.asmachta) || null;
  return {
    paid: Boolean(tx), sum: tx ? Number(tx.sum ?? tx.paymentSum ?? data.sum) : 0,
    transactionId: tx ? String(tx.transactionId || tx.id || "") : "", asmachta: tx ? String(tx.asmachta) : "",
    cardToken: tx ? String(tx.cardToken || tx.token || data.cardToken || "") : "", cardSuffix: tx ? String(tx.cardSuffix || tx.cardSuffixNumber || "").slice(-4) : "",
  };
}

// Tells Grow the callback arrived. Grow repeats the callback (after 10, 20 and 30 minutes) until it gets this.
export const approve = (cb) => call("approveTransaction", {
  transactionId: cb.transactionId, transactionToken: cb.transactionToken, transactionTypeId: cb.transactionTypeId,
  paymentType: cb.paymentType, sum: cb.sum, firstPaymentSum: cb.firstPaymentSum, periodicalPaymentSum: cb.periodicalPaymentSum,
  paymentsNum: cb.paymentsNum, allPaymentsNum: cb.allPaymentsNum, paymentDate: cb.paymentDate, asmachta: cb.asmachta,
  description: cb.description, fullName: cb.fullName, payerPhone: cb.payerPhone, payerEmail: cb.payerEmail,
  cardSuffix: cb.cardSuffix, cardType: cb.cardType, cardTypeCode: cb.cardTypeCode, cardBrand: cb.cardBrand, cardBrandCode: cb.cardBrandCode,
  cardExp: cb.cardExp, processId: cb.processId, processToken: cb.processToken,
});

/** A monthly (or yearly) charge on the saved card. Returns { transactionId, asmachta }; throws when the card is refused. */
export async function chargeToken({ token, sum, description, ref }) {
  const data = await call("createTransactionWithToken", { cardToken: token, sum: Number(sum).toFixed(2), description: plain(description, 100), paymentType: 2, paymentNum: 1, cField1: ref });
  return { transactionId: String(data.transactionId || ""), asmachta: String(data.asmachta || "") };
}

/**
 * A Grow callback (form data, or JSON in tests) as one flat object: the fields under data[...] and the
 * custom fields under data[customFields][cField1]. Grow nests the same fields as an object when it sends JSON.
 */
export function readCallback(params) {
  const out = {};
  for (const [k, v] of params) {
    const parts = k.replace(/\]/g, "").split("[");
    const key = parts.at(-1);
    if (parts[0] === "data" || parts.length === 1) out[key] = String(v);
  }
  return out;
}
export function flatten(obj, into = {}) {
  for (const [k, v] of Object.entries(obj || {})) { if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, into); else into[k] = v == null ? "" : String(v); }
  return into;
}
