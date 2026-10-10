-- =============================================================================
-- Reports: site visits and a weekly update. Runs after 0001 (and 0002 if the builder is in use).
-- SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- ls_visits : visits per business, per day, per source. A number only: no IP, no cookie, nothing that
--             identifies a person. Kept as long as the business is in the system.
-- =============================================================================

create table if not exists public.ls_visits (
  client_slug text not null references public.ls_clients (slug) on delete cascade,
  day         date not null,                 -- Israel date
  source      text not null default 'direct',
  visits      integer not null default 0,
  primary key (client_slug, day, source)
);

alter table public.ls_visits enable row level security;

-- One more visit, atomically (two visits at the same moment both count).
create or replace function public.ls_add_visit(p_slug text, p_day date, p_source text)
returns void language sql as $$
  insert into public.ls_visits (client_slug, day, source, visits)
  values (p_slug, p_day, p_source, 1)
  on conflict (client_slug, day, source) do update set visits = public.ls_visits.visits + 1;
$$;

-- Only the functions (secret key) may call it.
revoke execute on function public.ls_add_visit(text, date, text) from public, anon, authenticated;

-- The weekly update on WhatsApp is off unless the owner wants it.
alter table public.ls_clients add column if not exists weekly_report boolean not null default false;
alter table public.ls_clients add column if not exists tpl_weekly_report text not null default 'weekly_report';
