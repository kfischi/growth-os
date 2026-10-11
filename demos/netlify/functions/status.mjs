// Netlify Function: the "available now" line on a business's site. GET /api/status/<slug>
// -> { state: "free" | "busy" | "open" | "closed", text, until }   or { state: null } when there is nothing to show.
// The owner sets it from WhatsApp ("עסוק", "פנוי") or the panel; otherwise the working hours decide.
// Public and harmless (no lead data), cached for a minute.
import { json, configured, getClient, availability } from "../lib/leads.mjs";

const HEADERS = { "access-control-allow-origin": "*", "cache-control": "public, max-age=60" };

export default async (req, context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...HEADERS, "access-control-allow-methods": "GET" } });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const slug = context.params && context.params.client;
  if (!configured() || !/^[a-z0-9-]{2,40}$/.test(slug || "")) return json({ state: null }, 200, HEADERS);
  try {
    const client = await getClient(slug);
    // A paused business shows nothing: the page still works, without the line.
    if (!client || !client.active) return json({ state: null }, 200, HEADERS);
    return json(availability(client), 200, HEADERS);
  } catch (e) {
    console.error("status", e.message);
    return json({ state: null }, 200, { ...HEADERS, "cache-control": "no-store" });
  }
};

export const config = { path: "/api/status/:client" };
