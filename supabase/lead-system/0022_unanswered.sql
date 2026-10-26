-- =============================================================================
-- Questions the chats could not answer: the site's נציג AI and the WhatsApp assistant mark a question that the
-- business's facts don't answer. On Sunday morning the owner gets the week's list in one template message
-- (questions_digest), answers on WhatsApp ("למד: ...", typed or spoken), and the chats know from then on.
-- Only the question, in a short Hebrew line: no name, no phone, no address. Deleted after 30 days.
-- Runs after 0021. SQL Editor > paste > Run. Safe to run twice. The digest is off until כפיר turns it on.
-- =============================================================================

create table if not exists public.ls_unanswered (
  id          bigint generated always as identity primary key,
  client_slug text not null references public.ls_clients(slug) on delete cascade,
  question    text not null check (char_length(question) between 3 and 160),
  source      text not null default 'site' check (source in ('site', 'whatsapp')),
  created_at  timestamptz not null default now()
);
create index if not exists ls_unanswered_client on public.ls_unanswered (client_slug, created_at desc);
alter table public.ls_unanswered enable row level security; -- only the server (service key)

alter table public.ls_clients add column if not exists questions_digest boolean not null default false;
alter table public.ls_clients add column if not exists tpl_questions_digest text not null default 'questions_digest';
