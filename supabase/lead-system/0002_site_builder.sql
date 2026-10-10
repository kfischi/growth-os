-- =============================================================================
-- Site builder (docs/side-income/SITE_BUILDER.md). Runs in the lead system's Supabase project,
-- after 0001_lead_system.sql: SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- ls_drafts : one row per site in the making, from the first chat message to publishing
-- storage   : the bucket "builder" holds the owners' photos (already resized in the browser)
--
-- Like the other ls_* tables: RLS on, no policies. Only the Netlify Functions touch it, with the secret key.
-- =============================================================================

create table if not exists public.ls_drafts (
  id              uuid primary key default gen_random_uuid(),
  key_hash        text not null,                 -- sha256 of the private edit key; the key itself is only in the owner's link
  template        text not null default 'plumber',
  content         jsonb not null default '{}',   -- the fields the chat filled
  photos          jsonb not null default '{}',   -- { slot: { path, ext } } in the "builder" bucket
  video           jsonb,                         -- { path, ext: "mp4", poster: { path, ext } }: the short video at the top, or null
  photo_rights_at timestamptz,                   -- the owner confirmed the photos are theirs to publish
  messages        jsonb not null default '[]',   -- the chat, text only: [{ role, content }]
  status          text not null default 'draft'
                  check (status in ('draft', 'client_approved', 'paid', 'published', 'returned')),
  package         text check (package is null or package in ('presence', 'ai')),
  plan            text check (plan is null or plan in ('full', 'three')),
  return_note     text,                          -- why כפיר sent it back to the owner
  owner_name      text,
  owner_phone     text check (owner_phone is null or owner_phone ~ '^972[0-9]{8,9}$'),
  published_slug  text check (published_slug is null or published_slug ~ '^[a-z0-9-]{2,40}$'),
  published_sha   text,
  rev             integer not null default 0,    -- bumped on every save, so two tabs can't overwrite each other
  photo_rev       integer not null default 0,    -- the same for the photos, which are saved apart from the chat
  ip_hash         text,
  approved_at     timestamptz,
  paid_at         timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists ls_drafts_created on public.ls_drafts (created_at desc);
create index if not exists ls_drafts_status on public.ls_drafts (status, updated_at);
create unique index if not exists ls_drafts_slug on public.ls_drafts (published_slug) where published_slug is not null;

drop trigger if exists ls_drafts_touch on public.ls_drafts;
create trigger ls_drafts_touch before update on public.ls_drafts
  for each row execute function public.ls_touch();

alter table public.ls_drafts enable row level security;

-- Photos and the short video: public to read (the draft and the site show them), written only by the functions.
-- JPEG, WebP or MP4. The bucket allows up to 5 MB a file; the functions allow photos up to 1 MB and a video up to 4.5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('builder', 'builder', true, 5242880, array['image/webp', 'image/jpeg', 'video/mp4'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/webp', 'image/jpeg', 'video/mp4'];

-- For a database that ran an earlier copy of this file.
alter table public.ls_drafts add column if not exists photo_rev integer not null default 0;
alter table public.ls_drafts add column if not exists video jsonb;
