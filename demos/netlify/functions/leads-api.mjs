// Netlify Function: the owner's panel (demos/panel/) reads and updates leads here.
// Authorization: Bearer <slug>:<key>   (the owner, sees only their business)
//                Bearer admin:<LEADS_ADMIN_KEY>   (כפיר, picks a business with ?client=<slug>)
// GET   /api/leads?client=<slug>&days=90     -> { client, leads, messages, month, stats }   month: this month so far; stats: the last 30 days
// PATCH /api/leads  { id, status?, note? }   -> { lead }
// POST  /api/leads  { run: "reminders" | "report", client?, month?: "YYYY-MM", send?: false }   admin only
// POST  /api/leads  { link: "קבוצת השכונה" } -> { link }   |   { unlink: "k3p9" } -> { ok }   the owner's tagged links
// POST  /api/leads  { available: "busy" | "free" | "urgent" | "auto", hours? } -> { availability }   the site's "available now" line
// POST  /api/leads  { job_value: number | null } -> { job_value }   the owner's average job, for the panel's ₪ estimate
// POST  /api/leads  { testimonial: "<id>", hidden: true | false } -> { testimonial }   show or hide one on the site
import { searchImpressions } from "../lib/search.mjs";
import { json, configured, db, q, getClient, authorise, photoLink, rateLimiter, clientIp, clip, runReminders, buildReport, STATUS_HE, periodStats, siteStats, monthRange, israelTime, addLink, removeLink, listLinks, availability, setAvailability, AVAIL_MAX_HOURS, testimonialOn } from "../lib/leads.mjs";

const limited = rateLimiter(120, 10 * 60 * 1000);
const PUBLIC_CLIENT = (c) => ({ slug: c.slug, name: c.name, package: c.package, active: c.active, remind_after_min: c.remind_after_min, job_value: c.job_value ?? null });

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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : null;
    const linkAction = body && (body.link !== undefined || body.unlink !== undefined || body.available !== undefined || body.testimonial !== undefined || body.job_value !== undefined);
    if (req.method === "POST" && !linkAction) {
      if (!who.admin) return json({ error: "forbidden" }, 403);
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

    if (linkAction && body.testimonial !== undefined) {
      if (!/^[0-9a-f-]{36}$/.test(String(body.testimonial)) || typeof body.hidden !== "boolean") return json({ error: "bad_testimonial" }, 400);
      const [t] = await db("PATCH", `ls_testimonials?id=eq.${q(body.testimonial)}&client_slug=eq.${q(client.slug)}`, { hidden: body.hidden }, "return=representation");
      return t ? json({ testimonial: { id: t.id, hidden: t.hidden } }) : json({ error: "not_found" }, 404);
    }
    // The owner's average job value, for the panel's estimate (0015_job_value.sql). null clears it.
    if (linkAction && body.job_value !== undefined) {
      const v = body.job_value === null || body.job_value === "" ? null : Math.round(Number(body.job_value));
      if (v !== null && !(Number.isFinite(v) && v >= 0 && v <= 1000000)) return json({ error: "bad_value" }, 400);
      await db("PATCH", `ls_clients?slug=eq.${q(client.slug)}`, { job_value: v });
      client.job_value = v;
      return json({ job_value: v });
    }
    if (linkAction && body.available !== undefined) {
      if (!["busy", "free", "urgent", "auto"].includes(body.available)) return json({ error: "bad_available" }, 400);
      const hours = body.hours == null ? null : Math.min(Math.max(Math.round(Number(body.hours)) || 1, 1), AVAIL_MAX_HOURS);
      const now = await setAvailability(client, body.available === "auto" ? { avail: null } : { avail: body.available, hours: hours || (body.available === "busy" ? 3 : body.available === "urgent" ? 6 : null) });
      return json({ availability: { ...now, manual: body.available !== "auto" } });
    }
    if (linkAction) {
      const out = body.link !== undefined ? await addLink(client, body.link) : await removeLink(client, body.unlink);
      return json(out, out.error ? (out.error === "not_found" ? 404 : 400) : 200);
    }

    if (req.method === "GET") {
      const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 90, 1), 400);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const leads = await db("GET", `ls_leads?client_slug=eq.${q(client.slug)}&created_at=gte.${q(since)}&select=*&order=created_at.desc&limit=1000`);
      const ids = leads.filter((l) => l.last_inbound_at).map((l) => l.id).slice(0, 100);
      const messages = ids.length
        ? await db("GET", `ls_messages?lead_id=in.(${ids.join(",")})&direction=eq.in&kind=eq.inbound&select=lead_id,body,created_at&order=created_at.desc&limit=300`)
        : [];
      // This month so far: what the site brought (visits, leads, leads outside working hours). Never blocks the list.
      let month = null, links = [];
      try {
        const t = israelTime(), r = monthRange(`${t.year}-${String(t.month).padStart(2, "0")}`);
        const s = await periodStats(client, r.start, r.end); // to the end of the month, so today is in
        month = { label: r.label, visits: s.visits, leads: s.total, afterHours: s.afterHours, handled: s.handled, open: s.open, won: (s.byStatus && s.byStatus.won) || 0, conversion: s.conversion };
        links = await listLinks(client, s); // each tagged link with its visits and leads this month
      } catch (e) { console.error("panel stats", e.message); }
      // The last 30 days: visits and leads per day, devices, hours, clicks and sources (0013_stats.sql).
      let stats = null;
      try { stats = await siteStats(client, 30); } catch (e) { console.error("panel site stats", e.message); }
      // Google search (lib/search.mjs): appearances and clicks, 28 days, when Search Console is set up for the site.
      if (stats) { try { const host = (client.allowed_origins || []).map((o) => o.replace(/^https:\/\//, "")).find(Boolean); stats.google = host ? await searchImpressions(host, 28) : null; } catch (e) { console.error("panel google", e.message); } }
      // A photo the visitor attached: the panel gets the private link, never the storage path.
      for (const l of leads) { l.photo_url = l.photo ? photoLink(l.id) : null; delete l.photo; }
      // Testimonials on the site: all of them, hidden ones too, so the owner can bring one back.
      const testimonials = testimonialOn(client)
        ? await db("GET", `ls_testimonials?client_slug=eq.${q(client.slug)}&select=id,name,body,stars,hidden,created_at&order=created_at.desc&limit=100`).catch(() => [])
        : null;
      const avail = { ...availability(client), manual: !!(client.avail && client.avail_until && new Date(client.avail_until) > new Date()) };
      // Questions the chats could not answer, last 30 days, the same question once with a count (0022_unanswered.sql).
      const qrows = await db("GET", `ls_unanswered?client_slug=eq.${q(client.slug)}&created_at=gte.${q(new Date(Date.now() - 30 * 86_400_000).toISOString())}&select=question,source,created_at&order=created_at.desc&limit=300`).catch(() => []);
      const qmap = new Map();
      for (const r of qrows) { const k = r.question.replace(/[\s?!.,"׳״'-]/g, ""); const x = qmap.get(k); if (x) x.n++; else qmap.set(k, { question: r.question, source: r.source, last: r.created_at, n: 1 }); }
      const questions = [...qmap.values()].sort((a, b) => b.n - a.n).slice(0, 30);
      return json({ client: PUBLIC_CLIENT(client), leads, messages, statuses: STATUS_HE, month, links, stats, availability: avail, testimonials, questions });
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
