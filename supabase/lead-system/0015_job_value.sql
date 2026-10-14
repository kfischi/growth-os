-- The owner's own number for "how much is an average job worth", in ₪. The panel shows the enquiries marked "נסגר"
-- this month times this number, labelled as an estimate. Never shown on the site, never in a report as a promise.
alter table public.ls_clients add column if not exists job_value integer check (job_value between 0 and 1000000);
