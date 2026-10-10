// Netlify Function: the AI chat on a paying business's own site (נציג AI package). POST /api/chat/<client-slug>
// Body and answer as in chat.mjs: { messages } -> { reply, lead? }. The page uses shared/aibot.js with
// endpoint "https://<this site>/api/chat/<slug>". What the assistant knows comes from ls_clients.chat_facts.
// When a visitor leaves a name and a phone, the model adds a [[lead:...]] marker. The marker is removed
// here, the lead goes through the same flow as a form (stored, WhatsApp reply, owner alert with the summary).
import Anthropic from "@anthropic-ai/sdk";
import { json, configured, getClient, processLead, corsHeaders, rateLimiter, clientIp } from "../lib/leads.mjs";

const MODEL = process.env.CHAT_MODEL || "claude-opus-5-5";
const MAX_TURNS = 20, MAX_CHARS = 600;
const limited = rateLimiter(30, 10 * 60 * 1000);
const client = new Anthropic();

const system = (c) => `You are the website assistant of "${c.name}", a small local business in Israel. You are an AI, and you say so if asked.
Your job: answer visitors' questions briefly from the facts below, and when they want to be contacted, take their name and phone so the business calls them back.

How to write:
- Hebrew only, short and plain, like a good professional on WhatsApp: at most 3 short sentences. Address the visitor in plural (אתם).
- No marketing clichés, no emoji, no exclamation marks in a row.
- Only state facts written below. Never invent prices, times, availability or promises. If you don't know, say the business will answer when they call back.
- Never give medical, legal or safety instructions beyond the facts below. In an emergency, tell them to call 101 (מד״א), 100 (משטרה) or 102 (כיבוי).
- Stay on topic.

Taking a lead:
- When the visitor wants a call back, a price for their case or a visit, ask for their name and phone in one short question, if you don't have them yet.
- Once you have a name and a phone, thank them in one sentence, say the business got the details and will get back to them, and add at the very end, once:
  [[lead:NAME|PHONE|SERVICE|SUMMARY]]
  SERVICE is 2 to 4 Hebrew words. SUMMARY is one Hebrew sentence with what they need, where and when. No "|" or "]" inside the fields. Never explain the marker.

Facts about the business:
${c.chat_facts || "(none yet: say the business will answer every question when they call back)"}`;

function validMessages(m) {
  if (!Array.isArray(m) || m.length < 1 || m.length > MAX_TURNS) return false;
  return m.every((x, i) => x && typeof x.content === "string" && x.content.trim() &&
    x.content.length <= (x.role === "user" ? MAX_CHARS : 2000) && x.role === (i % 2 === 0 ? "user" : "assistant")) && m[m.length - 1].role === "user";
}

const LEAD = /\[\[lead:([^|\]]*)\|([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]/;

export default async (req, context) => {
  if (!configured() || !process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503, corsHeaders(req, null) || {});
  let c;
  try { c = await getClient(context.params && context.params.client); } catch { return json({ error: "db" }, 502); }
  const cors = corsHeaders(req, c);
  if (cors === null) return json({ error: "forbidden" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
  if (!c || !c.active || c.package !== "ai") return json({ error: "not_configured" }, 503, cors);
  if (limited(clientIp(req))) return json({ error: "rate_limited" }, 429, cors);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, cors); }
  if (!validMessages(body && body.messages)) return json({ error: "bad_messages" }, 400, cors);
  // Earlier replies came back from the browser; a marker in them is never acted on twice.
  const messages = body.messages.map((x) => ({ role: x.role, content: x.content.replace(/\[\[lead:[^\]]*\]\]/g, "") || "…" }));

  let reply;
  try {
    const response = await client.beta.messages.create({
      model: MODEL, max_tokens: 2000, output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      system: [{ type: "text", text: system(c), cache_control: { type: "ephemeral" } }],
      messages,
    });
    if (response.stop_reason === "refusal") return json({ reply: "על זה אני לא יכול לענות כאן. השאירו שם וטלפון, ונחזור אליכם." }, 200, cors);
    reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429, cors);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "not_configured" }, 503, cors);
    return json({ error: "upstream" }, 502, cors);
  }
  if (!reply) return json({ error: "empty_reply" }, 502, cors);

  const m = LEAD.exec(reply);
  if (!m) return json({ reply }, 200, cors);
  reply = reply.replace(LEAD, "").trim();
  const [, name, phone, service, summary] = m.map((s) => (s || "").trim());
  try {
    const result = await processLead(c, { name, phone, service, message: summary, source: body.source, campaign: body.campaign, page: body.page, referrer: body.referrer }, "chat");
    if (!result.ok && result.error === "bad_phone") return json({ reply: "המספר לא נראה תקין. אפשר לכתוב אותו שוב?" }, 200, cors);
    if (result.ok) return json({ reply, lead: true }, 200, cors);
  } catch (e) {
    console.error("client-chat lead", e.message);
  }
  // Not confirmed (not stored, or the owner wasn't alerted): hand the visitor a WhatsApp button with the
  // summary, so the enquiry reaches the business anyway.
  return json({ reply: `כדי לוודא שהפרטים מגיעים, שלחו אותם גם בוואטסאפ בלחיצה כאן. [[whatsapp:היי, אני ${name}. ${summary}]]`, lead: false }, 200, cors);
};

export const config = { path: "/api/chat/:client" };
