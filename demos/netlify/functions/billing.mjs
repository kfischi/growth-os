// Netlify Scheduled Function: every day at 06:10 Israel time (03:10 UTC). Charges the monthly (or yearly) payment
// on the saved card of every subscription due today, and ends the cancelled ones whose 30 days' notice is over.
// lib/billing.mjs has the rules: a refused card is tried again after 3 days, and after 4 refusals the lead system pauses.
import { configured } from "../lib/leads.mjs";
import { runBilling } from "../lib/billing.mjs";

export default async () => {
  if (!configured()) return;
  try { console.log("billing", JSON.stringify(await runBilling())); } catch (e) { console.error("billing", e.message); }
};

export const config = { schedule: "10 3 * * *" };
