// Netlify Scheduled Function: every 15 minutes. A lead still marked "new" after the business's
// remind_after_min (default 60) gets one reminder to the owner on WhatsApp, in working hours only.
// A lead that came at night is reminded the next working morning.
// Every run it also asks Grow about checkouts whose callback never came, and retries a paid site whose
// automatic publish failed (lib/billing.mjs runPending).
// Once an hour it checks the client domains waiting for their DNS (builder.mjs checkDomains).
// Once a day (the run at 03:00 UTC) it also deletes site builder drafts nobody touched for 30 days.
import { configured, runReminders } from "../lib/leads.mjs";
import { deleteStaleDrafts, checkDomains } from "../lib/builder.mjs";
import { runPending } from "../lib/billing.mjs";

export default async () => {
  if (!configured()) return;
  try { console.log("reminders", JSON.stringify(await runReminders())); } catch (e) { console.error("reminders", e.message); }
  try { console.log("payments", JSON.stringify(await runPending())); } catch (e) { console.error("payments", e.message); }
  const now = new Date();
  if (now.getUTCMinutes() < 15) { // once an hour: client domains whose DNS may point at their site by now
    try { console.log("domains", JSON.stringify(await checkDomains(now))); } catch (e) { console.error("domains", e.message); }
  }
  if (now.getUTCHours() === 3 && now.getUTCMinutes() < 15) {
    try { console.log("stale drafts", JSON.stringify(await deleteStaleDrafts(now))); } catch (e) { console.error("stale drafts", e.message); }
  }
};

export const config = { schedule: "*/15 * * * *" };
