-- Hosting for the sites the builder publishes (demos/netlify/lib/hosting.mjs): the Netlify site, the first address
-- (<slug>.<SITES_DOMAIN>, or <name>.netlify.app), and the client's own domain once כפיר adds it.
-- domain_state: null (no domain of their own), 'waiting' (added, its DNS doesn't point at Netlify yet), 'live' (the main address).
alter table public.ls_drafts add column if not exists site_id text;
alter table public.ls_drafts add column if not exists site_host text;      -- the address the site answers on now
alter table public.ls_drafts add column if not exists site_netlify text;   -- <name>.netlify.app, the target for the client's DNS
alter table public.ls_drafts add column if not exists site_sub text;       -- <slug>.<SITES_DOMAIN>, kept as an alias after the swap
alter table public.ls_drafts add column if not exists domain text;
alter table public.ls_drafts add column if not exists domain_state text check (domain_state in ('waiting', 'live'));
alter table public.ls_drafts add column if not exists domain_since timestamptz;
create index if not exists ls_drafts_domain_waiting on public.ls_drafts (domain_state) where domain_state = 'waiting';
