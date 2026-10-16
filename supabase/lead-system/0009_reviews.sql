-- =============================================================================
-- A review request after "טיפלתי": once per customer, only with the owner's OK, with a way out.
-- Runs after 0001. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- When the owner taps "טיפלתי", the system asks them: send this customer a request for a Google review?
-- Only on "כן, לשלוח" does one message go out (template review_request), and never twice to the same
-- number. A customer who answers "הסר" never gets one again from this business.
-- Off until כפיר sets review_url and turns review_requests on for a business.
-- =============================================================================

alter table public.ls_clients add column if not exists review_requests boolean not null default false;
alter table public.ls_clients add column if not exists review_url text check (review_url is null or review_url ~ '^https://');
alter table public.ls_clients add column if not exists tpl_review_request text not null default 'review_request';

-- asked: the owner was asked · sent / failed: the request to the customer · skipped: the owner said no
-- optout: the customer answered "הסר"
alter table public.ls_leads add column if not exists review text check (review in ('asked', 'sent', 'failed', 'skipped', 'optout'));
