-- A fixed search_path on the lead system's functions (Supabase linter 0011). Safe to run again.
alter function public.ls_touch() set search_path = public, pg_temp;
alter function public.ls_add_visit(text, date, text) set search_path = public, pg_temp;
alter function public.ls_add_stat(text, date, text, text) set search_path = public, pg_temp;
