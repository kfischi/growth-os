-- =============================================================================
-- A photo with the enquiry: the visitor attaches one in the site's chat (a leak, the AC's label, the lock).
-- Runs after 0001. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- The photo is private: the bucket is not public, and the owner opens it through a signed link
-- (/p/<lead>.<signature>, functions/lead-photo.mjs) in the WhatsApp alert and in the panel.
-- It is deleted with its lead (leads older than two years, on the 1st of the month).
-- =============================================================================

alter table public.ls_leads add column if not exists photo text;   -- storage path in "lead-photos", or null

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-photos', 'lead-photos', false, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;
