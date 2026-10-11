-- =============================================================================
-- Self edit: the owner changes their live site in the builder's chat. Runs after 0002.
-- SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- The draft row of a published site keeps being its working copy. content, photos and video are what
-- the owner is editing; "live" is what the site shows now, and "prev_live" the version before it, so
-- "back to the previous version" works. Nothing goes live until the owner presses "לפרסם את השינויים".
-- =============================================================================

-- כפיר turns it on per site, for the clients who pay for it (/build/admin/).
alter table public.ls_drafts add column if not exists self_edit boolean not null default false;

alter table public.ls_drafts add column if not exists live jsonb;       -- { content, photos, video } on the site now
alter table public.ls_drafts add column if not exists prev_live jsonb;  -- the version before it

-- The monthly allowance, so the cost of the chat stays known. Counted per Israel month ('YYYY-MM').
alter table public.ls_drafts add column if not exists edit_month text;
alter table public.ls_drafts add column if not exists edit_messages integer not null default 0;
alter table public.ls_drafts add column if not exists edit_publishes integer not null default 0;
