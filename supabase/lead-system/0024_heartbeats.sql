-- =============================================================================
-- The watchdog (functions/watchdog.mjs) and the scheduled functions leave a heartbeat here: when each last ran,
-- whether it was well, and, for the watchdog, what every connection answered (Supabase, WhatsApp, Claude, GitHub,
-- Netlify, Gemini, Grow's settings). /api/health reads it, so a check that stopped running, or a connection that
-- broke, turns the uptime monitor red. No personal data: names, times and short error lines only.
-- Runs after 0023. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================

create table if not exists public.ls_heartbeats (
  name    text primary key,               -- watchdog, reminders, billing, monthly-report, weekly-report
  at      timestamptz not null default now(),
  ok      boolean not null default true,
  detail  jsonb                           -- the watchdog's results; a short error for the others
);
alter table public.ls_heartbeats enable row level security; -- only the server (service key)
