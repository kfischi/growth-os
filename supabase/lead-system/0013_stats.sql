-- Site statistics (demos/shared/leadform.js, functions/visit.mjs, the owner's panel): numbers per business and day,
-- never a person. kind 'device' (label mobile | tablet | desktop), 'hour' (label 00..23, Israel time of the visit),
-- 'act' (label wa | call | chat | save | build | demo: a click on WhatsApp, a call, opening the chat, saving the
-- contact, and on our own site starting the builder or opening a demo). No IP, no cookie; kept like ls_visits.
create table if not exists public.ls_stats (
  client_slug text not null references public.ls_clients (slug) on delete cascade,
  day         date not null,
  kind        text not null check (kind in ('device', 'hour', 'act')),
  label       text not null,
  n           integer not null default 0,
  primary key (client_slug, day, kind, label)
);
alter table public.ls_stats enable row level security;

create or replace function public.ls_add_stat(p_slug text, p_day date, p_kind text, p_label text)
returns void language sql as $$
  insert into public.ls_stats (client_slug, day, kind, label, n)
  values (p_slug, p_day, p_kind, p_label, 1)
  on conflict (client_slug, day, kind, label) do update set n = public.ls_stats.n + 1;
$$;
revoke execute on function public.ls_add_stat(text, date, text, text) from public, anon, authenticated;
