-- Emergency mode for "available now": the owner writes "חירום" (or taps it in the panel) and the site says
-- "זמינים עכשיו לקריאות דחופות ב<area>"; enquiries that arrive meanwhile are marked urgent in the owner's alert.
-- area: the business's area as the site names it, filled by the site builder at publish.
alter table public.ls_clients drop constraint if exists ls_clients_avail_check;
alter table public.ls_clients add constraint ls_clients_avail_check check (avail in ('free', 'busy', 'urgent'));
alter table public.ls_clients add column if not exists area text;
