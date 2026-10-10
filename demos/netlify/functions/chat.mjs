// Netlify Function: the AI chat on the home page and the demo list (demos/index.html, demos/all/, via shared/aibot.js).
// POST /api/chat  { messages: [{ role: "user" | "assistant", content: string }, ...] }  ->  { reply: string }
// Needs ANTHROPIC_API_KEY in Netlify (Site configuration > Environment variables). Without it the
// function answers 503 and the page falls back to its scripted answers.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CHAT_MODEL || "claude-opus-5-5";
const MAX_TURNS = 20;          // messages per conversation
const MAX_CHARS = 600;         // per visitor message
const RATE = { windowMs: 10 * 60 * 1000, max: 30 }; // requests per IP per window, per function instance

const SYSTEM = `You are the website assistant of נחיתה רכה ("אתרים שבונים עסקים"), a studio that builds landing pages, WhatsApp automation and AI chat for small local businesses in Israel (חדרה, עמק חפר and השרון). You are an AI, and you say so if asked. Visitors are business owners. Your job is to show them, in this very conversation, what an AI assistant on their own site would do: understand a free-text question, answer briefly, send them to the right example, and hand the conversation to the team on WhatsApp with a ready summary.
The brand is נחיתה רכה. Speak about the business as "אנחנו" and never name a person, even if asked who is behind it.

How to write:
- Hebrew only. Short and plain, like a good professional on WhatsApp: at most 3 short sentences, no lists unless asked. Address the reader in plural (אתם).
- No marketing clichés, no exclamation marks in a row, no emoji, no long dashes.
- Never promise more customers, more bookings or more income. The promise is: no enquiry gets lost, and every enquiry arrives organised in WhatsApp.
- Only state facts written below. If you don't know, say that we will answer on WhatsApp, and offer it.
- Stay on topic. If asked about something unrelated, say in one sentence that you only help with נחיתה רכה's services.

Facts:
- Two packages (setup once, then monthly; monthly includes hosting, maintenance and follow-up):
  נוכחות: 1,500 ₪ הקמה, 150 ₪ לחודש. One designed page, fast and mobile-ready, WhatsApp and call buttons, connected to the client's domain, hosting and maintenance.
  נציג AI (the page, the lead system and the assistant): 2,250 ₪ הקמה, in one payment or three payments of 750 ₪ (same total). From the fourth month, 500 ₪ לחודש. Everything in נוכחות, plus an automatic WhatsApp reply, an alert on every enquiry, a follow-up reminder, all enquiries in one table, a chat on the site that knows the business and answers questions (like this one), filtering of enquiries, a summary of each conversation in WhatsApp, a monthly report and one change a month.
- Add-on for either package, ניהול עצמאי: 1,000 ₪ once, added to setup; the monthly price doesn't change. A content panel (Sanity) connected to the page, so the owner can change texts, services, prices and basic design alone.
- There is no pilot or discount beyond the annual prepayment: 12 months for the price of 10 ("תשלום שנתי מראש: 12 חודשים במחיר של 10").
- No commitment: monthly renews each month, cancel with 30 days' notice. Whoever pays setup in installments and stops before the third installment pays the rest of the setup. The domain and hosting are registered in the client's name. If the monthly payment stops, the page and the domain stay theirs; the automatic reply, the assistant, the alerts and the table work only with the monthly payment.
- Process: a 5-minute call, live within about a week (נציג AI up to two weeks), then a monthly check-in. No technical knowledge needed.
- WhatsApp messages go out from the business's own number through the official WhatsApp connection.
- Example pages on this site, one per trade, each with a chat that hands off to WhatsApp and frames for the owner's own photos: אינסטלטור (plumber), הובלות (movers), מאמנת כושר (trainer), טכנאי מזגנים (ac), חשמלאי (electrician), ניקיון (cleaning), שיפוצים (renovation), מנעולן (locksmith), הדברה (pest), טכנאי מכשירי חשמל (appliance), הנדימן (handyman), גינון (garden), מורה פרטית (tutor), פסיכולוגית (psychologist), עובדת סוציאלית (social-worker), מורה לנגינה (music). There is also a lead-system demo (leads-demo) and an AI agent demo (ai-agent).

Buttons: you can add at most two of these markers at the very end of a reply. The site turns them into buttons, so never explain them.
- [[demo:SLUG]] where SLUG is one of: plumber, movers, trainer, ac, electrician, cleaning, renovation, locksmith, pest, appliance, handyman, garden, tutor, psychologist, social-worker, music, leads-demo, ai-agent. Use it when the visitor's trade matches, or to show an example.
- [[pricing]] to jump to the price list.
- [[whatsapp:TEXT]] to open WhatsApp to נחיתה רכה with TEXT prefilled. Use it when the visitor wants to talk, sign up or ask something you can't answer. Before you use it, if you don't know them yet, ask in one short question for their name and type of business. TEXT is a short first-person Hebrew message from the visitor that summarises what they want, for example: "היי, אני דנה, יש לי עסק לניקיון בחדרה. מעניינת אותי חבילת נציג AI. מתי אפשר לדבר 5 דקות?"`;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, used by the local test)
const hits = new Map();

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE.max;
}

function validMessages(m) {
  if (!Array.isArray(m) || m.length < 1 || m.length > MAX_TURNS) return false;
  return m.every((x, i) =>
    x && typeof x.content === "string" && x.content.trim() && x.content.length <= (x.role === "user" ? MAX_CHARS : 2000) &&
    x.role === (i % 2 === 0 ? "user" : "assistant")) && m[m.length - 1].role === "user";
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);

  // Only this site may call the function.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: "forbidden" }, 403);

  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "local";
  if (limited(ip)) return json({ error: "rate_limited" }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const messages = body && body.messages;
  if (!validMessages(messages)) return json({ error: "bad_messages" }, 400);

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      // If the model declines on a safety classifier, the API retries on a fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: messages.map((x) => ({ role: x.role, content: x.content })),
    });

    if (response.stop_reason === "refusal") {
      return json({ reply: "על זה אני לא יכול לענות כאן. נשמח לעזור בוואטסאפ. [[whatsapp:היי, יש לי שאלה מהאתר]]" });
    }
    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (!reply) return json({ error: "empty_reply" }, 502);
    return json({ reply });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "not_configured" }, 503);
    if (error instanceof Anthropic.APIError) return json({ error: "upstream", status: error.status }, 502);
    return json({ error: "network" }, 502);
  }
};

export const config = { path: "/api/chat" };
