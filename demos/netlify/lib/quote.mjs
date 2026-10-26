// A price quote on WhatsApp (0021_quotes.sql). The owner answers an enquiry's alert (a swipe reply on WhatsApp) with
// a price: typed ("500, מחר בבוקר") or a voice note ("חמש מאות, מחר בבוקר", lib/voice.mjs). The owner sees what the
// customer will get and taps "לשלוח"; one template message (quote) goes to the customer from the business's number
// with "מאשרים" and "יש לי שאלה". Only the customer's own tap answers, once, within QUOTE_DAYS.
// The template, as it is submitted to Meta (Utility, Hebrew), with two quick-reply buttons "מאשרים" and "יש לי שאלה":
//   שלום {{1}}, כאן {{2}}. הצעת המחיר עבור {{3}}: {{4}}. {{5}}
//   ההצעה בתוקף ל-7 ימים. לאישור לחצו "מאשרים", ונחזור אליכם לתאם.
// ({{1}} is the first name, or "לכם" without one: "שלום לכם". {{5}} is the details, or NO_DETAILS when there are none: Meta refuses an empty parameter.)
import { db, q, clip, firstName, sendTemplate, sendText } from "./leads.mjs";

export const QUOTE_DAYS = 7;
export const NO_DETAILS = "פרטים נוספים בשיחה.";
export const quotesOn = (client) => !!(client && client.quotes && client.active !== false && client.package !== "presence");
const MIN = 20, MAX = 500_000;

export const priceText = (a, b) => (a === b ? `${a.toLocaleString("en-US")} ₪` : `${a.toLocaleString("en-US")} עד ${b.toLocaleString("en-US")} ₪`);

// "500" · "350-550" · "350 עד 550 ₪" · "₪500, מחר בבוקר" · "1,200 כולל חלקים". The first price, then what's left.
export function parseQuoteText(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const m = /(?:^|[\s(])₪? ?(\d{1,3}(?:,\d{3})+|\d{2,6}) ?(?:(?:-|–|עד) ?₪? ?(\d{1,3}(?:,\d{3})+|\d{2,6}))? ?(?:₪|ש"ח|ש״ח|שח|שקלים|שקל)?(?=$|[\s,.;:)!])/.exec(t);
  if (!m) return null;
  const a = Number(m[1].replace(/,/g, "")), b = m[2] ? Number(m[2].replace(/,/g, "")) : a;
  const quote = checkQuote(a, b, (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)));
  return quote;
}

// A price we would send: whole shekels, sensible, low to high; the details cleaned to one short line.
export function checkQuote(a, b, details) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < MIN || b > MAX || b < a) return null;
  const d = String(details || "").replace(/[<>]/g, " ").replace(/^[\s,.;:–-]+|[\s,;:–-]+$/g, "").replace(/\s+/g, " ").trim();
  return { price: priceText(a, b), details: d ? clip(d.replace(/[^.!?]$/, "$&."), 160) : "" };
}

// The enquiry the owner answered: the alert or the reminder their reply points at (m.context.id).
export async function leadForReply(client, m) {
  const ctx = m && m.context && m.context.id;
  if (!ctx) return null;
  const msg = (await db("GET", `ls_messages?wa_id=eq.${q(ctx)}&client_slug=eq.${q(client.slug)}&direction=eq.out&kind=in.(owner_alert,reminder)&select=lead_id&limit=1`))[0];
  if (!msg || !msg.lead_id) return null;
  return (await db("GET", `ls_leads?id=eq.${q(msg.lead_id)}&client_slug=eq.${q(client.slug)}&select=*`))[0] || null;
}

// The customer's message, as the template fills it, and what the owner reads before "לשלוח".
export const quoteMessage = (client, lead, quote) =>
  `שלום ${firstName(lead.name) || "לכם"}, כאן ${client.name}. הצעת המחיר עבור ${lead.service || "השירות"}: ${quote.price}. ${quote.details || NO_DETAILS}\n` +
  `ההצעה בתוקף ל-${QUOTE_DAYS} ימים. לאישור לחצו "מאשרים", ונחזור אליכם לתאם.`;
export const quotePreview = (client, lead, quote) =>
  `ככה זה יגיע ל${firstName(lead.name) || "לקוח"}:\n\n${quoteMessage(client, lead, quote)}\n[מאשרים] [יש לי שאלה]\n\nלשלוח?`;

const mobile = (lead) => /^9725\d{8}$/.test(lead.phone_intl || "");

// Sends it and records it on the enquiry. Returns the answer for the owner.
export async function sendQuote(client, lead, quote) {
  if (!mobile(lead)) return "המספר שהושאר בפנייה אינו נייד, אז אי אפשר לשלוח אליו הצעה בוואטסאפ. כדאי להתקשר.";
  const r = await sendTemplate(client, lead.phone_intl, client.tpl_quote,
    [firstName(lead.name) || "לכם", client.name, clip(lead.service || "השירות", 60), quote.price, quote.details || NO_DETAILS],
    { kind: "quote", leadId: lead.id, buttonPayloads: ["qok:" + lead.id, "qask:" + lead.id] });
  await db("PATCH", `ls_leads?id=eq.${q(lead.id)}`, { quote_price: quote.price, quote_details: quote.details || null, quote_status: r === "sent" ? "sent" : "failed",
    quote_sent_at: new Date().toISOString(), quote_answered_at: null });
  return r === "sent" ? `נשלח ל${firstName(lead.name) || "לקוח"}: ${quote.price}. אם ההצעה תאושר, תקבלו הודעה כאן, והפנייה תסומן "נסגר".`
    : "לא הצלחנו לשלוח את ההצעה הפעם. כדאי לשלוח אותה ללקוח ישירות, או לנסות שוב בעוד כמה דקות.";
}

// The customer tapped "מאשרים" or "יש לי שאלה". Once, from the customer's own number, within QUOTE_DAYS.
export async function quoteAnswer(client, from, kind, leadId, now = new Date()) {
  const lead = (await db("GET", `ls_leads?id=eq.${q(leadId)}&client_slug=eq.${q(client.slug)}&phone_intl=eq.${q(from)}&select=*`))[0];
  if (!lead) return;
  const reply = (t) => sendText(client, from, t, { kind: "quote", leadId: lead.id });
  if (lead.quote_status !== "sent") return void (await reply("קיבלנו, ונחזור אליכם."));
  const late = now - new Date(lead.quote_sent_at) > QUOTE_DAYS * 86_400_000;
  const status = kind === "ok" && !late ? "accepted" : "question";
  const [won] = await db("PATCH", `ls_leads?id=eq.${q(lead.id)}&quote_status=eq.sent`,
    { quote_status: status, quote_answered_at: now.toISOString(), ...(status === "accepted" ? { status: "won", handled_at: lead.handled_at || now.toISOString() } : {}) }, "return=representation");
  if (!won) return;
  const note = status === "accepted" ? `הצעת המחיר אושרה: ${lead.quote_price}. כדאי להתקשר ולתאם.`
    : late ? `אישור להצעת המחיר (${lead.quote_price}) הגיע אחרי יותר מ-${QUOTE_DAYS} ימים. כדאי להתקשר.` : `יש שאלה על הצעת המחיר (${lead.quote_price}). כדאי להתקשר.`;
  await sendTemplate(client, client.owner_phone, client.tpl_owner_alert, [lead.name || "-", lead.phone || lead.phone_intl, lead.service || "-", note, "הצעת מחיר"],
    { kind: "owner_alert", leadId: lead.id, buttonPayload: "done:" + lead.id });
  await reply(status === "accepted" ? "תודה! ההצעה אושרה, ונחזור אליכם לתאם." : late ? `ההצעה הייתה בתוקף ל-${QUOTE_DAYS} ימים, אז נחזור אליכם עם מחיר עדכני.`
    : "נחזור אליכם. אפשר גם לכתוב כאן את השאלה.");
}
