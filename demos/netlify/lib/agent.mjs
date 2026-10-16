// The WhatsApp assistant (0011_wa_agent.sql): when a customer writes back to the business's number after the
// automatic reply, Claude answers from the business's facts (ls_clients.chat_facts), within WhatsApp's 24 hours.
// It says it is a digital assistant, never invents a price, a time or an arrival, collects what the owner needs
// (address, when, what exactly) and hands the case to the owner: when something new and useful arrives, the owner
// gets the update through the owner alert template. Off unless כפיר turned it on (wa_agent), נציג AI only.
import Anthropic from "@anthropic-ai/sdk";
import { db, q, sendText, sendTemplate, firstName, clip, factsOf } from "./leads.mjs";

const MODEL = () => process.env.AGENT_MODEL || process.env.CHAT_MODEL || "claude-opus-5-5";
const DAILY = 8; // replies to one customer in 24 hours; after that the owner takes it from there
let client;

export const agentOn = (c) => c.package === "ai" && c.wa_agent === true && Boolean(String(c.chat_facts || "").trim());

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["reply", "notify_owner", "owner_note"],
  properties: {
    reply: { type: "string", description: "The WhatsApp answer to the customer, in Hebrew, at most 3 short sentences." },
    notify_owner: { type: "boolean", description: "True when the customer gave something new the owner should know now (address, a time, a detail, urgency, a request to be called), or when you can't answer." },
    owner_note: { type: "string", description: "One Hebrew sentence for the owner with the new information, or an empty string." },
  },
};

const system = (c, name) => `You answer customers on WhatsApp for "${c.name}", a small local business in Israel, after their enquiry reached the business. You are the business's digital assistant, an AI, and you say so if asked. The owner (a person) handles the work and calls back.
The customer's name: ${name || "unknown"}.

How to write:
- Hebrew only, short and warm, like a good professional on WhatsApp: at most 3 short sentences. Plural (אתם). No emoji in a row, no marketing words.
- Only facts written below. Never invent a price, a time, an arrival, availability or a promise. For "when will you come" or "how much exactly": the owner will confirm when he calls back.
- Your job: answer from the facts, and gather what the owner needs to come prepared: what exactly, where (town and street), how urgent, when is convenient. Ask one thing at a time, only what is still missing.
- Safety: if there is danger (water near electricity, sparks, burning smell, gas), tell them to keep away and, for fire or gas, call 102; for a medical emergency 101. Never tell them to repair anything themselves.
- If they ask to stop, or are angry, apologise briefly, say the owner will get back to them, and set notify_owner.
- Never ask for payment details, ID numbers or passwords.

Facts about the business:
${factsOf(c).slice(0, 5000)}`;

// The conversation with this customer, oldest first: what they wrote, our template reply, the assistant's answers.
async function history(c, lead) {
  const rows = await db("GET", `ls_messages?client_slug=eq.${q(c.slug)}&lead_id=eq.${q(lead.id)}&kind=in.(lead_ack,inbound,agent)&select=direction,kind,body,created_at&order=created_at.desc&limit=20`);
  const turns = rows.reverse().map((r) => {
    if (r.direction === "in") return { role: "user", content: clip(String((r.body && r.body.text) || ""), 1000) || "…" };
    if (r.kind === "lead_ack") return { role: "assistant", content: "(the automatic reply: we got your enquiry and will get back to you)" };
    return { role: "assistant", content: clip(String((r.body && r.body.text && r.body.text.body) || ""), 1000) || "…" };
  });
  // The API wants alternating turns starting with the customer: merge neighbours of the same side.
  const out = [];
  for (const t of turns) {
    if (out.length && out.at(-1).role === t.role) out.at(-1).content += "\n" + t.content;
    else out.push({ ...t });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export async function agentReply(c, lead) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const sent = await db("GET", `ls_messages?client_slug=eq.${q(c.slug)}&lead_id=eq.${q(lead.id)}&kind=eq.agent&created_at=gte.${q(since)}&select=id`);
  if (sent.length >= DAILY) return "limit";
  const messages = await history(c, lead);
  if (!messages.length || messages.at(-1).role !== "user") return "nothing";
  client = client || new Anthropic();
  const model = MODEL();
  const res = await client.beta.messages.create({
    model, max_tokens: 1000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    ...(model.startsWith("claude-opus") ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
    system: [{ type: "text", text: system(c, firstName(lead.name)), cache_control: { type: "ephemeral" } }],
    messages,
  });
  if (res.stop_reason === "refusal") return "refused";
  const out = JSON.parse(res.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
  const reply = clip(String(out.reply || "").trim(), 700);
  if (!reply) return "empty";
  const r = await sendText(c, lead.phone_intl, reply, { kind: "agent", leadId: lead.id });
  if (out.notify_owner && String(out.owner_note || "").trim() && c.owner_alerts) {
    await sendTemplate(c, c.owner_phone, c.tpl_owner_alert,
      [lead.name || "-", lead.phone || lead.phone_intl || "-", lead.service || "-", "עדכון בוואטסאפ: " + clip(String(out.owner_note), 300), "וואטסאפ"],
      { kind: "owner_alert", leadId: lead.id, buttonPayload: "done:" + lead.id });
  }
  return r;
}
