-- =============================================================================
-- Testimonials on the site: a customer who sent an enquiry writes a few words, and they show on the site at once.
-- Runs after 0009. SQL Editor > paste > Run. Safe to run twice.
-- =============================================================================
-- Only an invited customer can write one: after "טיפלתי" the owner taps "המלצה לאתר", and one template message
-- (testimonial_request) goes to that customer with a private link (/r/<lead>.<signature>). One testimonial per enquiry.
-- What they write goes up right away, without approval. The owner gets it on WhatsApp with "להסתיר",
-- and can hide or show any of them in the panel. Off until כפיר turns testimonials on for a business.
-- =============================================================================

alter table public.ls_clients add column if not exists testimonials boolean not null default false;
alter table public.ls_clients add column if not exists tpl_testimonial_request text not null default 'testimonial_request';

-- asked: the owner was asked · sent / failed: the request to the customer · skipped: the owner said no · done: written
alter table public.ls_leads add column if not exists testimonial text check (testimonial in ('asked', 'sent', 'failed', 'skipped', 'done'));

create table if not exists public.ls_testimonials (
  id          uuid primary key default gen_random_uuid(),
  client_slug text not null references public.ls_clients(slug) on delete cascade,
  lead_id     uuid unique references public.ls_leads(id) on delete set null, -- the enquiry it came from; kept when old leads are deleted
  name        text not null check (char_length(name) between 2 and 30),
  body        text not null check (char_length(body) between 15 and 400),
  stars       smallint check (stars between 1 and 5),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ls_testimonials_client on public.ls_testimonials (client_slug, created_at desc);

-- Only the server (service key) reads and writes. The site gets the visible ones through /api/testimonials/<slug>.
alter table public.ls_testimonials enable row level security;
