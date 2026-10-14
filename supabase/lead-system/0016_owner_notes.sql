-- What the owner teaches the business's chats on WhatsApp ("למד: לא עובדים בשבת"): short facts the site's AI chat,
-- the WhatsApp assistant and the photo's first look read together with chat_facts. [{ "text": "...", "at": "<iso>" }]
alter table public.ls_clients add column if not exists owner_notes jsonb not null default '[]'::jsonb;
