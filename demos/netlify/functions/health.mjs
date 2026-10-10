// Netlify Function: GET /api/health?key=<HEALTH_KEY>
// For an uptime monitor (UptimeRobot, free): answers 200 when all is well, 503 when in the last 24 hours an
// owner alert failed or got stuck, a WhatsApp message failed, or the database can't be reached.
// Counts and client slugs only, no personal data. Set HEALTH_KEY in Netlify; without it the check is open.
import { json, configured, healthCheck, safeEqual } from "../lib/leads.mjs";

export default async (req) => {
  const key = process.env.HEALTH_KEY;
  if (key && !safeEqual(new URL(req.url).searchParams.get("key") || "", key)) return json({ error: "forbidden" }, 403);
  if (!configured()) return json({ ok: false, error: "not_configured" }, 503);
  try {
    const r = await healthCheck();
    return json(r, r.ok ? 200 : 503);
  } catch (e) {
    return json({ ok: false, error: "db", detail: String(e.message).slice(0, 120) }, 503);
  }
};

export const config = { path: "/api/health" };
