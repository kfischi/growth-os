-- =============================================================================
-- When to call back: the visitor picks a time in the chat ("היום אחרי 16:00", "מחר בבוקר").
-- Runs after 0001. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- The owner's alert and the panel show the time, and the reminder comes 5 minutes before it
-- instead of after remind_after_min. Null: as soon as possible, as before.
-- =============================================================================

alter table public.ls_leads add column if not exists callback_at timestamptz;
