// Netlify Function: a first look at the customer's photo. POST /api/estimate
//   { slug?, trade, prices?: { "<service>": "<range>" }, issue?, image: "data:image/jpeg;base64,..." }
//   -> { seen, service, range, urgent, advice }   (service and range are null when the photo doesn't tell)
// Claude looks at the photo and matches it to one service of the business's own price list. It never invents a
// price: the range is copied from the list. For a paying business (slug) the list comes from ls_clients.chat_facts
// and the one sent by the page is ignored; the demos send their own sample list. The photo is not stored here.
import Anthropic from "@anthropic-ai/sdk";
import { json, configured, getClient, corsHeaders, rateLimiter, clientIp } from "../lib/leads.mjs";

const MODEL = process.env.ESTIMATE_MODEL || process.env.CHAT_MODEL || "claude-opus-5-5";
const MAX_IMAGE = 1_400_000; // a data URL of the chat's shrunk JPEG (under 900 KB) fits well under this
const limited = rateLimiter(8, 10 * 60 * 1000);
const client = new Anthropic();

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["seen", "service", "urgent", "advice"],
  properties: {
    seen: { type: "string", description: "What the photo shows, in one short Hebrew sentence, plain words." },
    service: { type: ["string", "null"], description: "The exact name of one service from the list that fits, or null if the photo doesn't show enough or nothing fits." },
    urgent: { type: "boolean", description: "True only for water near electricity, a burst pipe, sparks or burning, gas, or a door that can't be locked." },
    advice: { type: "string", description: "One short Hebrew sentence: what to do until the business arrives, or an empty string. Safety first; never a repair instruction." },
  },
};

const system = (trade, list) => `You look at a photo a customer sent to a small ${trade || "home services"} business in Israel, before the business calls them back.
Answer in Hebrew, short and plain, plural (אתם). You are giving a first look, not a diagnosis.
- "seen": what is visible, in one sentence. If the photo is unclear, dark, or unrelated, say so.
- "service": one name copied exactly from the list below, or null. Never a name that isn't on the list.
- "urgent" and "advice": as described. If there is danger (water near electricity, sparks, gas smell, a burst pipe), the advice is to stop, keep away and, for fire or gas, call 102. Never tell them to repair anything themselves.
Never mention a price: the page shows the range from the list itself.

The business's services and price ranges:
${list}`;

// The list of a paying business: the "services" lines of its chat facts. A demo sends { name: range }.
function priceList(c, prices) {
  if (c) return String(c.chat_facts || "").slice(0, 3000);
  return Object.entries(prices || {}).slice(0, 20).map(([n, r]) => `- ${String(n).slice(0, 60)}: ${String(r || "לפי הצעת מחיר").slice(0, 40)}`).join("\n");
}
// The range for the matched service, read from the same list, so it is always the business's own words.
function rangeOf(c, prices, service) {
  if (!service) return null;
  if (!c) return Object.hasOwn(prices || {}, service) ? String(prices[service] || "") || null : null;
  const line = String(c.chat_facts || "").split("\n").find((l) => l.includes(service));
  const m = line && /(\d[\d,]*\s*(?:עד|-|–)\s*\d[\d,]*\s*₪)/.exec(line);
  return m ? m[1] : null;
}

export default async (req, context) => {
  // Our own pages, or a client's site (its domain is in allowed_origins): checked again once the client is known.
  let c = null, cors = corsHeaders(req, null) || {};
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503, cors);
  if (limited(clientIp(req))) return json({ error: "rate_limited" }, 429, cors);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.image !== "string" || body.image.length > MAX_IMAGE) return json({ error: "bad_image" }, 400, cors);
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(body.image);
  if (!m) return json({ error: "bad_image" }, 400, cors);

  if (body.slug) {
    if (!configured() || !/^[a-z0-9-]{2,40}$/.test(body.slug)) return json({ error: "not_found" }, 404, cors);
    c = await getClient(body.slug).catch(() => null);
    if (!c || !c.active) return json({ error: "not_found" }, 404, cors);
    const allowed = corsHeaders(req, c);
    if (!allowed) return json({ error: "forbidden" }, 403);
    cors = allowed;
  }
  if (!c && corsHeaders(req, null) === null) return json({ error: "forbidden" }, 403); // the demo list only from our pages
  const prices = c ? null : (body.prices && typeof body.prices === "object" ? body.prices : {});
  const list = priceList(c, prices);
  if (!list.trim()) return json({ error: "no_prices" }, 422, cors);
  const trade = String(c ? c.name : body.trade || "").slice(0, 60);
  const issue = String(body.issue || "").slice(0, 80);

  try {
    const res = await client.beta.messages.create({
      model: MODEL, max_tokens: 800,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      ...(MODEL.startsWith("claude-opus") ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      system: [{ type: "text", text: system(trade, list) }],
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/" + m[1], data: m[2] } },
        { type: "text", text: issue ? `The customer picked: ${issue}.` : "The customer didn't say what the problem is." },
      ] }],
    });
    if (res.stop_reason === "refusal") return json({ error: "refused" }, 422, cors);
    const out = JSON.parse(res.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
    const service = typeof out.service === "string" && out.service.trim() ? out.service.trim().slice(0, 60) : null;
    return json({
      seen: String(out.seen || "").slice(0, 200),
      service, range: rangeOf(c, prices, service),
      urgent: Boolean(out.urgent), advice: String(out.advice || "").slice(0, 200),
    }, 200, cors);
  } catch (e) {
    console.error("estimate", e.message);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429, cors);
    return json({ error: "upstream" }, 502, cors);
  }
};

export const config = { path: "/api/estimate" };
