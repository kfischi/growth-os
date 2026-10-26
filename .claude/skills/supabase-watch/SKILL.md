---
name: supabase-watch
description: The lead system's watchman. A short, read-only check that Supabase and the live site talk to each other and work: the project is up, every table and column the code reads exists (a migration that wasn't run), the storage buckets answer, the advisors and the last hours of logs show no new errors, and the live pages and public endpoints respond. Reports only when something is wrong. Use on its scheduled run (every few hours), when Kfir asks "תבדוק את סופבייס", "האתר עובד?", or right after merging a PR with a migration.
---

# Supabase watch

The goal: Kfir hears about a problem with the database or the live site before a customer does, and hears nothing when all is well.
For a deep hunt with fixes, use `site-doctor`; this skill only looks.

## Hard rules

- **Read only.** No writes to production Supabase: no migration, no insert, no update, no delete. A missing migration is reported with the file to run, and applied only when Kfir says so.
- **Never touch secrets.** No key in a file, a log, a message or a PR. `/api/health` needs HEALTH_KEY, which you don't have: use the Supabase connector and the public endpoints instead.
- **Silent when all is well.** Kfir asked for no empty reports: when every check passes, end with one line, "Supabase והאתר תקינים", and nothing else. No PR, no file change.
- **Never invent a result.** A check you could not run (no connector, a blocked host) is reported as not checked.

## The project

Supabase project "Easy Landing", id `lhyjxgnspbuolhhcayih` (the lead system's own project, tables `ls_*`). Never confuse it with the other projects in the account, which are not this site's.

## Checks, in this order

1. **Up:** `list_projects` shows it `ACTIVE_HEALTHY`. A paused project is critical: every enquiry falls back to WhatsApp only.
2. **Schema:** `execute_sql` with
   `select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name like 'ls\_%'`
   and compare with `SCHEMA` in `demos/netlify/lib/schema.mjs` (made from `supabase/lead-system/*.sql`). Every table and column there must exist. A missing one: name it, and the migration file that adds it (`grep -l <column> supabase/lead-system/`). This is the same check `/api/health` makes (`schemaCheck`), which an uptime monitor runs every few minutes.
3. **Functions:** `ls_add_visit` and `ls_add_stat` exist (`select proname from pg_proc where proname like 'ls\_%'`).
4. **Storage:** the buckets `builder` (public) and `lead-photos` (private) exist (`select id, public from storage.buckets`).
5. **Advisors:** `get_advisors` security and performance. `rls_enabled_no_policy` on `ls_*` is expected (only the server, with the service key, reads and writes): ignore it. Anything WARN or ERROR is a finding.
6. **Logs:** `query_logs` for `api` and `postgres` over the last hours: repeated 4xx/5xx from `/rest/v1/ls_*` or Postgres errors are findings. Quote the error and the path, never a row's data.
7. **The live site** (https://service-pro-web.netlify.app), with curl, when the network allows:
   - `/`, `/all/`, `/plumber/`, `/build/` answer 200;
   - `/api/status/plumber` answers 200 with JSON;
   - `/api/testimonials/plumber` answers 200 with `{ "items": [...] }`.
   A blocked host: say so and go on.

## Report (Hebrew, short, only when something is wrong)

1. What is wrong, rated: **קריטי** (enquiries, payments or the database down), **גבוה** (a feature fails: a missing column, a bucket), **בינוני** (an advisor warning, a slow query).
2. The cause, as far as the check shows, and the fix: the migration file to run, or the setting to change.
3. What only Kfir can do (a Netlify variable, the Supabase dashboard).
4. What could not be checked, and why.
