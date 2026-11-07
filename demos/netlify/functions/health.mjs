// Netlify Function: GET /api/health?key=<HEALTH_KEY>
// For an uptime monitor (UptimeRobot, free): answers 200 when all is well, 503 when in the last 24 hours an
// owner alert failed or got stuck, a WhatsApp message failed, the database can't be reached, a table or column the
// code reads is missing (a migration not run: schemaMissing names it), or a storage bucket doesn't answer.
// Counts and client slugs only, no personal data. Set HEALTH_KEY in Netlify; without it the check is open.
// It also carries the watchdog's last results (lib/watchdog.mjs, every hour): a broken connection (WhatsApp, Claude,
// GitHub, Netlify, ...) or a watchdog that stopped running turns it red too. With HEALTH_KEY set, ?run=1 runs the
// watchdog now instead of reading its last run.
import { json, configured, healthCheck, safeEqual } from "../lib/leads.mjs";
import { runWatchdog, watchdogStatus } from "../lib/watchdog.mjs";

export default async (req) => {
  const key = process.env.HEALTH_KEY;
  if (key && !safeEqual(new URL(req.url).searchParams.get("key") || "", key)) return json({ error: "forbidden" }, 403);
  if (!configured()) return json({ ok: false, error: "not_configured" }, 503);
  try {
    const r = await healthCheck();
    const live = key && new URL(req.url).searchParams.get("run") === "1";
    const w = live ? await runWatchdog().then((x) => ({ ran: true, ageMin: 0, stale: false, ok: x.ok, failed: x.failed, results: x.results })) : await watchdogStatus();
    // Before the first watchdog run (or without 0024_heartbeats.sql) only the lead checks decide.
    const all = r.ok && (!w.ran || (!w.stale && w.ok));
    return json({ ...r, ok: all, watchdog: w }, all ? 200 : 503);
  } catch (e) {
    return json({ ok: false, error: "db", detail: String(e.message).slice(0, 120) }, 503);
  }
};

export const config = { path: "/api/health" };
