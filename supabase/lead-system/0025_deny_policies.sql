-- Every ls_* table is read and written only by the Netlify functions with the secret key, which bypasses RLS.
-- RLS was on with no policy, so the public keys could already read nothing; Supabase still flags each table
-- (rls_enabled_no_policy) and sends advisor e-mails about it. One explicit "nobody" policy per table says the
-- same thing out loud and clears the notice. Safe to run again.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'ls\_%' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists ls_no_public_access on public.%I', t);
    execute format('create policy ls_no_public_access on public.%I for all to anon, authenticated using (false) with check (false)', t);
  end loop;
end $$;
