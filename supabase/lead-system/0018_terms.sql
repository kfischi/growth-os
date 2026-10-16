-- When the owner accepted the terms (demos/terms/) before paying: the builder's pay step requires the tick.
alter table ls_drafts add column if not exists terms_at timestamptz;
