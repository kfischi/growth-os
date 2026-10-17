-- Payment through Grow, the monthly charge and the automatic publish (demos/netlify/lib/billing.mjs, lib/grow.mjs).
-- Only the functions (service key) read and write these tables: row level security on, no policies.

-- The address the owner picked before paying: <slug_wish>.<SITES_DOMAIN>, and their own domain to connect after it.
alter table public.ls_drafts add column if not exists slug_wish text;
alter table public.ls_drafts add column if not exists domain_wish text;
-- The automatic publish after payment: why it failed and how many times (the 15-minute run retries up to 3).
alter table public.ls_drafts add column if not exists publish_error text;
alter table public.ls_drafts add column if not exists publish_tries int not null default 0;
-- The owner's panel link, made at the first publish, until the owner says they saved it. Then null.
alter table public.ls_drafts add column if not exists panel_once text;
create index if not exists ls_drafts_slug_wish on public.ls_drafts (slug_wish) where slug_wish is not null;

-- Every checkout and every monthly charge. kind: setup (the first payment), month / year (a charge on the saved
-- card), card (a new card after a refused charge, for the amount due).
create table if not exists public.ls_payments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.ls_drafts (id) on delete restrict,
  kind text not null check (kind in ('setup', 'month', 'year', 'card')),
  package text not null check (package in ('presence', 'ai')),
  cycle text not null check (cycle in ('month', 'year')),
  sum numeric(10, 2) not null check (sum > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  process_id text,            -- Grow's checkout (createPaymentProcess)
  process_token text,
  transaction_id text,
  asmachta text,              -- the card company's approval number
  invoice_number text,        -- the invoice or receipt Grow issued (invoiceNotifyUrl)
  invoice_url text,
  error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists ls_payments_draft on public.ls_payments (draft_id, created_at desc);
create index if not exists ls_payments_pending on public.ls_payments (created_at) where status = 'pending';
alter table public.ls_payments enable row level security;

-- One subscription per paid site: the saved card (a Grow token, not the card itself) and the next charge.
-- state: active, failed (refused, tried again after 3 days), suspended (4 refusals: the lead system paused),
-- cancelling (no notice: what was paid runs until end_at), ended.
create table if not exists public.ls_billing (
  draft_id uuid primary key references public.ls_drafts (id) on delete restrict,
  package text not null check (package in ('presence', 'ai')),
  cycle text not null check (cycle in ('month', 'year')),
  amount numeric(10, 2) not null check (amount > 0),   -- per month, or per year (10 months) on the annual plan
  card_token text,
  card_suffix text,
  state text not null default 'active' check (state in ('active', 'failed', 'suspended', 'cancelling', 'ended')),
  fails int not null default 0,
  next_charge_at timestamptz not null,   -- the next try: the billing day, or a retry 3 days after a refusal
  due_since timestamptz,                  -- while a charge is refused: the start of the unpaid period
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ls_billing_due on public.ls_billing (next_charge_at) where state in ('active', 'failed', 'cancelling');
alter table public.ls_billing enable row level security;
