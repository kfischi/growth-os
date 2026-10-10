// Netlify Function: a site sends an enquiry here. POST /api/lead/<client-slug>
// Body: { name, phone, service?, message?, source?, campaign?, page?, referrer?, company? }
// "company" is a hidden honeypot field: a person leaves it empty, a bot fills it.
// Answers { ok: true, id } when the lead is stored. Any other answer means the page should
// fall back to opening WhatsApp, so no enquiry is lost even when this system is down.
import { json, configured, getClient, processLead, corsHeaders, rateLimiter, clientIp } from "../lib/leads.mjs";

const limited = rateLimiter(8, 10 * 60 * 1000); // per IP, per function instance

export default async (req, context) => {
  const slug = context.params && context.params.client;
  if (!configured()) return json({ ok: false, error: "not_configured" }, 503, corsHeaders(req, null) || {});

  let client;
  try { client = await getClient(slug); } catch (e) { console.error(e.message); return json({ ok: false, error: "db" }, 502); }
  const cors = corsHeaders(req, client);
  if (cors === null) return json({ ok: false, error: "forbidden" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);
  if (!client) return json({ ok: false, error: "unknown_client" }, 404, cors);
  // The monthly payment stopped, or a נוכחות page: the page opens WhatsApp itself.
  if (!client.active || client.package !== "ai") return json({ ok: false, error: "inactive" }, 409, cors);
  if (limited(clientIp(req))) return json({ ok: false, error: "rate_limited" }, 429, cors);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, cors); }
  if (!body || typeof body !== "object") return json({ ok: false, error: "bad_json" }, 400, cors);
  if (body.company) return json({ ok: true, id: null }, 200, cors); // honeypot: look fine, store nothing

  try {
    const result = await processLead(client, body, "form");
    return json(result, result.ok ? 200 : result.error === "alert_failed" ? 202 : 422, cors);
  } catch (e) {
    console.error("lead", e.message);
    return json({ ok: false, error: "server" }, 502, cors);
  }
};

export const config = { path: "/api/lead/:client" };
