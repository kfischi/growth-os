// Netlify Scheduled Function: Sunday 06:00 UTC (08:00 or 09:00 in Israel).
// For businesses that asked for it (ls_clients.weekly_report): last week's visits, leads, leads that came
// outside working hours, and how many still wait, in one WhatsApp message to the owner.
import { configured, runWeeklyReports } from "../lib/leads.mjs";

export default async () => {
  if (!configured()) return;
  try { console.log("weekly-report", JSON.stringify(await runWeeklyReports())); } catch (e) { console.error("weekly-report", e.message); }
};

export const config = { schedule: "0 6 * * 0" };
