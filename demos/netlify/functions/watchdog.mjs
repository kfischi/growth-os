// Netlify Scheduled Function: every hour. Checks every connection the site depends on (lib/watchdog.mjs) and keeps
// the results for /api/health; כפיר gets one WhatsApp alert when something newly breaks.
import { configured } from "../lib/leads.mjs";
import { runWatchdog } from "../lib/watchdog.mjs";

export default async () => {
  if (!configured()) return;
  try { const r = await runWatchdog(); console.log("watchdog", JSON.stringify({ ok: r.ok, failed: r.failed, warn: r.warn })); }
  catch (e) { console.error("watchdog", e.message); }
};

export const config = { schedule: "7 * * * *" };
