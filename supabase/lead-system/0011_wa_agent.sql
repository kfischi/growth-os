-- The WhatsApp assistant: when a customer writes back after the automatic reply, Claude answers from the
-- business's chat_facts within WhatsApp's 24 hours, and passes new details to the owner (demos/netlify/lib/agent.mjs).
-- Off by default; turned on per business:  update ls_clients set wa_agent = true where slug = '<slug>';
alter table public.ls_clients add column if not exists wa_agent boolean not null default false;
