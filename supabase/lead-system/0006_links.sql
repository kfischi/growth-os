-- =============================================================================
-- Tagged links: one link per group or channel, so the owner sees where enquiries come from.
-- Runs after 0001. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- The owner names a link in the panel ("קבוצת השכונה בפייסבוק") and gets <site>/?s=k3p9 to post there.
-- Visits and leads from it carry the source "t-k3p9" (ls_visits.source, ls_leads.source), and the panel,
-- the WhatsApp alert and the monthly report show the name instead. Nothing about the visitor is stored.
-- =============================================================================

create table if not exists public.ls_links (
  client_slug text not null references public.ls_clients (slug) on delete cascade,
  code        text not null check (code ~ '^[a-z0-9]{4}$'),
  label       text not null check (char_length(label) between 2 and 40),
  created_at  timestamptz not null default now(),
  primary key (client_slug, code)
);

-- Closed like every ls_ table: only the Netlify functions, with the secret key, read and write it.
alter table public.ls_links enable row level security;
