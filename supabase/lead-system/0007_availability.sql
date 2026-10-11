-- =============================================================================
-- "Available now": the owner writes "עסוק" or "פנוי" to the business's WhatsApp number, and the site says so.
-- Runs after 0001. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- avail is what the owner said, until avail_until. After that the site goes back to the working hours
-- (work_days, work_start, work_end). The owner can also set it in the panel.
-- =============================================================================

alter table public.ls_clients add column if not exists avail text check (avail in ('free', 'busy'));
alter table public.ls_clients add column if not exists avail_until timestamptz;
