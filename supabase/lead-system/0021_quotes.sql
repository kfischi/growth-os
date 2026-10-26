-- =============================================================================
-- A price quote on WhatsApp: the owner answers an enquiry's alert with a price (typed or a voice note), sees how the
-- customer will get it, taps "לשלוח", and the customer gets one template message (quote) from the business's
-- number with "מאשרים" and "יש לי שאלה". "מאשרים" marks the enquiry "נסגר" and tells the owner.
-- Runs after 0020. SQL Editor > paste > Run. Safe to run twice. Off until כפיר turns quotes on for a business.
-- =============================================================================

alter table public.ls_clients add column if not exists quotes boolean not null default false;
alter table public.ls_clients add column if not exists tpl_quote text not null default 'quote';

-- The latest quote of an enquiry. sent / failed: the template to the customer · accepted: "מאשרים" · question: "יש לי שאלה"
alter table public.ls_leads add column if not exists quote_price text;
alter table public.ls_leads add column if not exists quote_details text;
alter table public.ls_leads add column if not exists quote_status text check (quote_status in ('sent', 'failed', 'accepted', 'question'));
alter table public.ls_leads add column if not exists quote_sent_at timestamptz;
alter table public.ls_leads add column if not exists quote_answered_at timestamptz;
