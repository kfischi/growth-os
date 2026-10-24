// Netlify Function: a LIVE AI chat on a demo page, so a visitor can try the real נציג AI before buying.
// POST /api/demo-chat/<demo>  { messages } -> { reply, lead? }   Used by shared/aibot.js on demos/plumber/.
// Same model and rules as a paying site's chat (client-chat.mjs), but the facts are the fictional business's own,
// written below, and a name and phone left here go nowhere: the reply says so, and { lead: "demo" } comes back.
// Cost guard: only our own pages (an Origin header from this site), short messages, a short history,
// a per-IP limit and a daily cap per instance (DEMO_CHAT_DAILY, default 400 answers).
import Anthropic from "@anthropic-ai/sdk";
import { json, rateLimiter, clientIp } from "../lib/leads.mjs";

const MODEL = process.env.CHAT_MODEL || "claude-opus-5-5";
const MAX_TURNS = 11, MAX_CHARS = 300; // the model sees the last 11 messages; older ones are dropped
const limited = rateLimiter(15, 10 * 60 * 1000);
const client = new Anthropic({ timeout: 20000, maxRetries: 0 }); // under the page's own 30 s abort (aibot.js)

// What the fictional business "knows". Keep it in step with the demo page's own facts and prices.
const DEMOS = {
  plumber: {
    name: "אורן מים",
    owner: "אורן",
    facts: `אורן מים: אינסטלטור, עסק של איש אחד (אורן), 12 שנה בשטח.
אזור: חדרה, עמק חפר והשרון. יישובים: חדרה, עמק חפר, נתניה, פרדס חנה כרכור, אור עקיבא, קיסריה, בנימינה, כפר יונה. מחוץ לאזור: אורן יגיד אם מגיע.
זמינות: 24/7. חוזר לפניות תוך 15 דקות.
אחריות: 12 חודשים על העבודה.
מחירים (טווחים, המחיר הסופי אחרי אבחון, ומחיר סגור לפני שמתחילים):
- סתימה: 250 עד 450 ₪
- נזילה: 300 עד 650 ₪
- דוד: גוף חימום או טרמוסטט: 350 עד 600 ₪
- דוד: החלפה: 1,900 עד 2,800 ₪, כולל דוד חדש, פירוק ופינוי של הישן
- איתור נזילה: 650 עד 1,200 ₪
- התקנה או החלפה של כלים וברזים: לפי הצעת מחיר
- יציאה מיידית (מים על הרצפה): 100 ₪ נוספים. ערב או שבת: 150 ₪ נוספים.
לא עושים: עבודות חשמל, מזגנים, שיפוץ מלא של חדר רחצה (אפשר להפנות לבעל מקצוע מתאים, אבל אין שם להמליץ).
בנזילה פעילה: לסגור את הברז הראשי. אם המים קרובים לחשמל: להוריד קודם את המפסק בלוח, ולא לגעת במים ליד שקעים.`,
  },
};

const system = (d) => `You are the website assistant of "${d.name}", a small local business in Israel. This is a live demo on the site of Multi Landing, which builds such sites; the business is fictional, but answer exactly as you would on its real site. You are an AI, and you say so if asked.
Your job: answer visitors' questions briefly from the facts below, and when they want to be contacted, take their name and phone.

How to write:
- Hebrew only, short and plain, like a good professional on WhatsApp: at most 3 short sentences. Address the visitor in plural (אתם). Speak for the business ("אורן יחזור אליכם"), never as ${d.owner} himself.
- No marketing clichés, no emoji.
- Only state facts written below. Never invent prices, times, availability or promises. When the answer isn't in the facts, say plainly that you don't know and that ${d.owner} will answer when he calls back, and offer to take their name and phone.
- Never give safety instructions beyond the facts below. In an emergency, tell them to call 101 (מד״א), 100 (משטרה) or 102 (כיבוי).
- Stay on topic. If asked about something unrelated, say in one sentence that you answer only about the business.

Taking a lead:
- When the visitor wants a call back, a price for their case or a visit, ask for their name and phone in one short question, if you don't have them yet.
- Once you have a name and a phone, thank them, and say in one sentence that this is a demo so the details were not sent anywhere, and on a real site ${d.owner} would get them on WhatsApp with a summary. Then add at the very end, once:
  [[lead:NAME|PHONE|SERVICE|SUMMARY]]
  SERVICE is 2 to 4 Hebrew words. SUMMARY is one Hebrew sentence. No "|" or "]" inside the fields. Never explain the marker.

Facts about the business:
${d.facts}`;

// The page sends up to 19 messages, and an earlier one may be longer than allowed (it failed then and stays in
// the page's history). So: keep the last MAX_TURNS, clip the older ones, and reject only a new question that is
// too long. Returns the messages to send, or null.
function trimMessages(m) {
  if (!Array.isArray(m) || m.length < 1 || m.length > 40) return null;
  const last = m.slice(-MAX_TURNS);
  if (last[0] && last[0].role === "assistant") last.shift();
  const ok = last.length && last.every((x, i) => x && typeof x.content === "string" && x.content.trim() &&
    x.role === (i % 2 === 0 ? "user" : "assistant")) && last[last.length - 1].role === "user" && last[last.length - 1].content.length <= MAX_CHARS;
  return ok ? last.map((x) => ({ role: x.role, content: x.content.slice(0, x.role === "user" ? MAX_CHARS : 1500) })) : null;
}

// Only from a page on this same site: a browser always sends Origin on a cross-site POST, and a script without
// one gets nothing (this endpoint costs money per answer).
function ownOrigin(req) {
  const origin = req.headers.get("origin");
  try { return !!origin && new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

let day = "", answers = 0;
function overDailyCap() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; answers = 0; }
  return ++answers > (Number(process.env.DEMO_CHAT_DAILY) || 400);
}

const LEAD = /\[\[lead:([^|\]]*)\|([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]/;

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!ownOrigin(req)) return json({ error: "forbidden" }, 403);
  const d = DEMOS[context.params && context.params.demo];
  if (!d) return json({ error: "not_found" }, 404);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);
  if (limited(clientIp(req))) return json({ error: "rate_limited" }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const kept = trimMessages(body && body.messages);
  if (!kept) return json({ error: "bad_messages" }, 400);
  if (overDailyCap()) return json({ error: "busy" }, 429);
  const messages = kept.map((x) => ({ role: x.role, content: x.content.replace(/\[\[lead:[^\]]*\]\]/g, "") || "…" }));

  let reply;
  try {
    const response = await client.beta.messages.create({
      model: MODEL, max_tokens: 1000, output_config: { effort: "low" },
      ...(MODEL.startsWith("claude-opus") ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      system: [{ type: "text", text: system(d), cache_control: { type: "ephemeral" } }],
      messages,
    });
    if (response.stop_reason === "refusal") return json({ reply: "על זה אני לא יכול לענות כאן. אפשר לשאול על השירותים, המחירים והאזורים." });
    reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "not_configured" }, 503);
    return json({ error: "upstream" }, 502);
  }
  if (!reply) return json({ error: "empty_reply" }, 502);
  if (!LEAD.test(reply)) return json({ reply });
  return json({ reply: reply.replace(LEAD, "").trim(), lead: "demo" });
};

export const config = { path: "/api/demo-chat/:demo" };
