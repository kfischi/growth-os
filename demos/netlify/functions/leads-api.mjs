// Netlify Function: the owner's panel (demos/panel/) reads and updates leads here.
// Authorization: Bearer <slug>:<key>   (the owner, sees only their business)
//                Bearer admin:<LEADS_ADMIN_KEY>   (כפיר, picks a business with ?client=<slug>)
// GET   /api/leads?client=<slug>&days=90     -> { client, leads, messages }
// PATCH /api/leads  { id, status?, note? }   -> { lead }
// POST  /api/leads  { run: "reminders" | "report", client?, month?: "YYYY-MM", send?: false }   admin only
import { json, configured, db, q, getClient, authorise, rateLimiter, clientIp, clip, runReminders, buildReport, STATUS_HE } from "../lib/leads.mjs";

const limited = rateLimiter(120, 10 * 60 * 1000);
const PUBLIC_CLIENT = (c) => ({ slug: c.slug, name: c.name, package: c.package, active: c.active, remind_after_min: c.remind_after_min });

export default async (req) => {
  if (!configured()) return json({ error: "not_configured" }, 503);
  const origin = req.headers.get("origin");
  if (origin) { let same = false; try { same = new URL(origin).host === new URL(req.url).host; } catch { /* "null" and other junk */ } if (!same) return json({ error: "forbidden" }, 403); }
  if (limited(clientIp(req))) return json({ error: "rate_limited" }, 429);

  let who;
  try { who = await authorise(req); } catch (e) { console.error(e.message); return json({ error: "db" }, 502); }
  if (!who) return json({ error: "unauthorised" }, 401);

  const url = new URL(req.url);
  try {
    if (req.method === "POST") {
      if (!who.admin) return json({ error: "forbidden" }, 403);
      const body = await req.json().catch(() => ({}));
      if (body.run === "reminders") return json(await runReminders());
      if (body.run === "report") {
        const c = await getClient(body.client);
        if (!c) return json({ error: "unknown_client" }, 404);
        return json(await buildReport(c, body.month, { send: body.send !== false }));
      }
      return json({ error: "bad_action" }, 400);
    }

    const slug = who.admin ? url.searchParams.get("client") : who.client.slug;
    if (who.admin && !slug) {
      const clients = await db("GET", "ls_clients?select=slug,name,package,active&order=name.asc");
      return json({ clients });
    }
    const client = who.admin ? await getClient(slug) : who.client;
    if (!client) return json({ error: "unknown_client" }, 404);

    if (req.method === "GET") {
      const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 90, 1), 400);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const leads = await db("GET", `ls_leads?client_slug=eq.${q(client.slug)}&created_at=gte.${q(since)}&select=*&order=created_at.desc&limit=1000`);
      const ids = leads.filter((l) => l.last_inbound_at).map((l) => l.id).slice(0, 100);
      const messages = ids.length
        ? await db("GET", `ls_messages?lead_id=in.(${ids.join(",")})&direction=eq.in&kind=eq.inbound&select=lead_id,body,created_at&order=created_at.desc&limit=300`)
        : [];
      return json({ client: PUBLIC_CLIENT(client), leads, messages, statuses: STATUS_HE });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      if (!/^[0-9a-f-]{36}$/.test(body.id || "")) return json({ error: "bad_id" }, 400);
      const patch = {};
      if (body.status !== undefined) {
        if (!STATUS_HE[body.status]) return json({ error: "bad_status" }, 400);
        patch.status = body.status;
        patch.handled_at = body.status === "new" ? null : new Date().toISOString();
      }
      if (body.note !== undefined) patch.note = clip(body.note, 500) || null;
      if (!Object.keys(patch).length) return json({ error: "nothing_to_change" }, 400);
      // Keep the first handled time: a lead that moves from handled to won keeps when it was answered.
      if (patch.handled_at && patch.status !== "new") {
        const cur = (await db("GET", `ls_leads?id=eq.${q(body.id)}&client_slug=eq.${q(client.slug)}&select=handled_at`))[0];
        if (!cur) return json({ error: "not_found" }, 404);
        if (cur.handled_at) delete patch.handled_at;
      }
      const rows = await db("PATCH", `ls_leads?id=eq.${q(body.id)}&client_slug=eq.${q(client.slug)}`, patch, "return=representation");
      return rows.length ? json({ lead: rows[0] }) : json({ error: "not_found" }, 404);
    }
    return json({ error: "method_not_allowed" }, 405);
  } catch (e) {
    console.error("leads-api", e.message);
    return json({ error: "server" }, 502);
  }
};

export const config = { path: "/api/leads" };
