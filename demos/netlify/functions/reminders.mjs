// Netlify Scheduled Function: every 15 minutes. A lead still marked "new" after the business's
// remind_after_min (default 60) gets one reminder to the owner on WhatsApp, in working hours only.
// A lead that came at night is reminded the next working morning.
import { configured, runReminders } from "../lib/leads.mjs";

export default async () => {
  if (!configured()) return;
  try { console.log("reminders", JSON.stringify(await runReminders())); } catch (e) { console.error("reminders", e.message); }
};

export const config = { schedule: "*/15 * * * *" };
