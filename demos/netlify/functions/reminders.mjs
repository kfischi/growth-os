// Netlify Scheduled Function: every 15 minutes. A lead still marked "new" after the business's
// remind_after_min (default 60) gets one reminder to the owner on WhatsApp, in working hours only.
// A lead that came at night is reminded the next working morning.
// Once a day (the run at 03:00 UTC) it also deletes site builder drafts nobody touched for 30 days.
import { configured, runReminders } from "../lib/leads.mjs";
import { deleteStaleDrafts } from "../lib/builder.mjs";

export default async () => {
  if (!configured()) return;
  try { console.log("reminders", JSON.stringify(await runReminders())); } catch (e) { console.error("reminders", e.message); }
  const now = new Date();
  if (now.getUTCHours() === 3 && now.getUTCMinutes() < 15) {
    try { console.log("stale drafts", JSON.stringify(await deleteStaleDrafts(now))); } catch (e) { console.error("stale drafts", e.message); }
  }
};

export const config = { schedule: "*/15 * * * *" };
