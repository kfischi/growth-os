// Netlify Scheduled Function: every day at 03:10 UTC (06:10 in Israel in summer, 05:10 in winter). Charges the monthly
// (or yearly) payment on the saved card of every subscription due today, and ends the cancelled ones whose paid period is over.
// lib/billing.mjs has the rules: a refused card is tried again after 3 days, and after 4 refusals the lead system pauses.
import { configured } from "../lib/leads.mjs";
import { runBilling } from "../lib/billing.mjs";
import { heartbeat } from "../lib/watchdog.mjs";

export default async () => {
  if (!configured()) return;
  let error = null;
  try { console.log("billing", JSON.stringify(await runBilling())); } catch (e) { error = e.message; console.error("billing", e.message); }
  await heartbeat("billing", !error, error ? { error } : null); // the watchdog checks this ran in the last 26 hours
};

export const config = { schedule: "10 3 * * *" };
