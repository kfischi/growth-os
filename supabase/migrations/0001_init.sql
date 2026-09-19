-- =============================================================================
-- Growth OS — multi-tenant core schema
-- =============================================================================
-- Three tables drive the whole product:
--   clients         : one row per tenant, keyed by the domain it is served on
--   client_configs  : versioned, JSON marketing/content config per tenant
--   pending_changes : AI-suggested edits awaiting the business owner's approval
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  domain        text not null,
  business_name text not null,
  created_at    timestamptz not null default now()
);

-- Domains are stored canonically: lower-cased, no scheme, no port, no trailing
-- dot, no leading "www.". The trigger below guarantees it on write, so the
-- app's exact-match lookup (`.eq("domain", host)`) can never miss a row
-- because of how it happened to be typed in.
create or replace function public.normalize_domain(p_domain text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(btrim(p_domain)), '^[a-z][a-z0-9+.-]*://', ''),
          '/.*$', ''),
        ':\d+$', ''),
      '^www\.|\.$', '', 'g'),
    '');
$$;

create or replace function public.clients_normalize_domain()
returns trigger
language plpgsql
as $$
begin
  new.domain := public.normalize_domain(new.domain);
  if new.domain is null then
    raise exception 'domain must be a non-empty hostname' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists clients_normalize_domain on public.clients;
create trigger clients_normalize_domain
  before insert or update of domain on public.clients
  for each row execute function public.clients_normalize_domain();

create unique index if not exists clients_domain_key
  on public.clients (domain);

-- -----------------------------------------------------------------------------
-- client_configs
-- -----------------------------------------------------------------------------
-- The active config for a tenant is the row with the highest `version`.
-- Updates are append-only: the webhook inserts version N+1 instead of mutating
-- history, so every AI-approved change is auditable and revertible.
create table if not exists public.client_configs (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  version    integer not null default 1 check (version > 0),
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint client_configs_client_version_key unique (client_id, version)
);

create index if not exists client_configs_active_idx
  on public.client_configs (client_id, version desc);

-- -----------------------------------------------------------------------------
-- pending_changes
-- -----------------------------------------------------------------------------
create table if not exists public.pending_changes (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  suggested_changes jsonb not null,
  reasoning         text,
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'applied')),
  created_at        timestamptz not null default now()
);

create index if not exists pending_changes_client_status_idx
  on public.pending_changes (client_id, status, created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_configs_set_updated_at on public.client_configs;
create trigger client_configs_set_updated_at
  before update on public.client_configs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- Published tenant content is public by definition — it is the copy rendered on
-- the marketing site — so anon/authenticated may read `clients` and
-- `client_configs`. Nothing may be written with the anon key: every mutation
-- goes through the service-role webhook. `pending_changes` holds unpublished
-- AI proposals and internal reasoning, so it is service-role only.
alter table public.clients         enable row level security;
alter table public.client_configs  enable row level security;
alter table public.pending_changes enable row level security;

drop policy if exists "clients are publicly readable" on public.clients;
create policy "clients are publicly readable"
  on public.clients for select
  to anon, authenticated
  using (true);

drop policy if exists "published configs are publicly readable" on public.client_configs;
create policy "published configs are publicly readable"
  on public.client_configs for select
  to anon, authenticated
  using (true);

-- No policies on public.pending_changes: RLS is on and nothing is granted, so
-- only the service-role key (which bypasses RLS) can touch it.

-- Defense in depth. Supabase grants anon/authenticated broad table privileges
-- in `public` by default, leaving RLS as the only barrier — an RLS policy
-- added carelessly later would silently expose these tables. Revoking the
-- privileges outright turns that into a hard permission error instead, and
-- makes a read of pending_changes fail loudly rather than return zero rows.
revoke all on public.pending_changes from anon, authenticated;
revoke insert, update, delete, truncate on public.clients from anon, authenticated;
revoke insert, update, delete, truncate on public.client_configs from anon, authenticated;
grant select on public.clients, public.client_configs to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Atomic config publish
-- -----------------------------------------------------------------------------
-- Called by /api/tenant/update with the service-role key. Merging, version
-- bumping and the pending_changes status flip happen in one transaction so a
-- concurrent webhook can never produce a duplicate or skipped version.
create or replace function public.publish_client_config(
  p_client_id  uuid,
  p_content    jsonb,
  p_pending_id uuid default null
)
returns public.client_configs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.client_configs;
  v_next    public.client_configs;
begin
  -- Lock the tenant row so two concurrent publishes serialise instead of
  -- racing for the same version number.
  perform 1 from public.clients where id = p_client_id for update;
  if not found then
    raise exception 'unknown client_id: %', p_client_id using errcode = 'foreign_key_violation';
  end if;

  select * into v_current
  from public.client_configs
  where client_id = p_client_id
  order by version desc
  limit 1;

  insert into public.client_configs (client_id, version, content)
  values (
    p_client_id,
    coalesce(v_current.version, 0) + 1,
    coalesce(v_current.content, '{}'::jsonb) || p_content
  )
  returning * into v_next;

  if p_pending_id is not null then
    update public.pending_changes
    set status = 'applied'
    where id = p_pending_id and client_id = p_client_id;
  end if;

  return v_next;
end;
$$;

revoke all on function public.publish_client_config(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.publish_client_config(uuid, jsonb, uuid) to service_role;
