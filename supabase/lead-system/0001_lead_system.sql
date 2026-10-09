-- =============================================================================
-- Lead system for the side-income channel (נחיתה רכה). Not part of Growth OS.
-- Run it in its own Supabase project: SQL Editor > paste > Run.
-- =============================================================================
-- ls_clients  : one row per paying business (and one for כפיר's own site)
-- ls_leads    : every enquiry from a form or a chat
-- ls_messages : every WhatsApp message sent or received, with its delivery status
-- ls_reports  : the monthly summary per business
--
-- Only the Netlify Functions touch these tables, with the secret key.
-- RLS is on and there are no policies, so the public (anon) key reads nothing.
-- =============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.ls_clients (
  slug               text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name               text not null,
  package            text not null default 'ai' check (package in ('presence', 'ai')),
  -- false when the monthly payment stops: the page keeps working, the system stops.
  active             boolean not null default true,
  -- Sites allowed to send leads, e.g. {https://www.example.co.il,https://example.co.il}
  allowed_origins    text[] not null default '{}',
  owner_name         text,
  owner_phone        text check (owner_phone is null or owner_phone ~ '^972[0-9]{8,9}$'),
  -- WhatsApp Cloud API: the business number's Phone number ID (Meta > WhatsApp > API setup).
  -- The access token is not stored here. It lives in Netlify as WA_TOKEN_<SLUG>.
  wa_phone_number_id text,
  tpl_lang           text not null default 'he',
  tpl_lead_ack       text not null default 'lead_ack',
  tpl_owner_alert    text not null default 'owner_new_lead',
  tpl_owner_reminder text not null default 'owner_reminder',
  tpl_monthly_report text not null default 'monthly_report',
  auto_reply         boolean not null default true,
  owner_alerts       boolean not null default true,
  reminders          boolean not null default true,
  monthly_report     boolean not null default true,
  remind_after_min   integer not null default 60 check (remind_after_min between 10 and 1440),
  -- Reminders go out only in working hours, Israel time. Days: 0 = Sunday ... 6 = Saturday.
  work_start         smallint not null default 8  check (work_start between 0 and 23),
  work_end           smallint not null default 20 check (work_end between 1 and 24),
  work_days          smallint[] not null default '{0,1,2,3,4,5}',
  -- What the site's AI chat knows about the business (services, area, prices, hours). Plain Hebrew.
  chat_facts         text,
  -- sha256 of the owner's panel key. Made by scripts/lead-system/new-client.mjs.
  key_hash           text,
  created_at         timestamptz not null default now()
);

create table if not exists public.ls_leads (
  id              uuid primary key default gen_random_uuid(),
  client_slug     text not null references public.ls_clients (slug) on delete cascade,
  name            text,
  phone           text not null,          -- as the person typed it, normalised to 05XXXXXXXX
  phone_intl      text not null,          -- 9725XXXXXXXX, for WhatsApp
  service         text,
  message         text,                   -- free text, or the chat summary
  channel         text not null default 'form' check (channel in ('form', 'chat')),
  source          text,                   -- utm_source, or the referrer's host
  campaign        text,                   -- utm_campaign
  page            text,
  status          text not null default 'new' check (status in ('new', 'handled', 'won', 'lost')),
  note            text,
  auto_reply      text not null default 'pending' check (auto_reply in ('pending', 'sent', 'failed', 'skipped', 'off')),
  owner_alert     text not null default 'pending' check (owner_alert in ('pending', 'sent', 'failed', 'skipped', 'off')),
  reminded_at     timestamptz,
  handled_at      timestamptz,
  last_inbound_at timestamptz,            -- the lead wrote back on WhatsApp
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists ls_leads_client_created on public.ls_leads (client_slug, created_at desc);
create index if not exists ls_leads_open on public.ls_leads (created_at) where status = 'new' and reminded_at is null;
create index if not exists ls_leads_phone on public.ls_leads (client_slug, phone_intl, created_at desc);

create or replace function public.ls_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ls_leads_touch on public.ls_leads;
create trigger ls_leads_touch before update on public.ls_leads
  for each row execute function public.ls_touch();

create table if not exists public.ls_messages (
  id          bigint generated always as identity primary key,
  client_slug text not null references public.ls_clients (slug) on delete cascade,
  lead_id     uuid references public.ls_leads (id) on delete set null,
  direction   text not null check (direction in ('out', 'in')),
  kind        text not null,              -- lead_ack, owner_alert, reminder, report, owner_reply, inbound
  to_phone    text,
  from_phone  text,
  wa_id       text unique,                -- Meta's message id
  status      text,                       -- accepted, sent, delivered, read, failed, received
  error       text,
  body        jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ls_messages_lead on public.ls_messages (lead_id);

drop trigger if exists ls_messages_touch on public.ls_messages;
create trigger ls_messages_touch before update on public.ls_messages
  for each row execute function public.ls_touch();

create table if not exists public.ls_reports (
  client_slug text not null references public.ls_clients (slug) on delete cascade,
  month       date not null,              -- first day of the month
  data        jsonb not null,
  sent        text not null default 'pending',
  created_at  timestamptz not null default now(),
  primary key (client_slug, month)
);

alter table public.ls_clients  enable row level security;
alter table public.ls_leads    enable row level security;
alter table public.ls_messages enable row level security;
alter table public.ls_reports  enable row level security;
