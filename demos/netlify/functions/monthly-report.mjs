// Netlify Scheduled Function: on the 1st of each month at 08:00 UTC (10:00 or 11:00 in Israel).
// For every active נציג AI business: counts last month's enquiries, stores the summary in ls_reports
// and sends it to the owner on WhatsApp. כפיר writes the longer report with the monthly-report skill.
import { configured, runMonthlyReports, deleteOldLeads } from "../lib/leads.mjs";

export default async () => {
  if (!configured()) return;
  try { console.log("monthly-report", JSON.stringify(await runMonthlyReports())); } catch (e) { console.error("monthly-report", e.message); }
  // Leads older than two years are deleted, as the privacy notice on the client sites says.
  try { console.log("retention", JSON.stringify(await deleteOldLeads())); } catch (e) { console.error("retention", e.message); }
};

export const config = { schedule: "0 8 1 * *" };
