# Growth OS

A multi-tenant business operating system: one Next.js deployment serves many
brands, each rendering copy that an AI agent proposes and the business owner
approves.

Nothing on the page is hardcoded. Every headline, sub-headline, CTA and promo
is read at request time from Supabase, keyed on the domain the request arrived
on.

```
n8n / AI agent  ──▶  pending_changes   ──▶  owner approves
                                                  │
                                                  ▼
                                    POST /api/tenant/update  (HMAC-signed)
                                                  │
                                                  ▼
                              client_configs v(N+1)  ──▶  the live site
```

---

## Stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Framework| Next.js 15 (App Router, React 19, Server Components) |
| Styling  | Tailwind CSS v4, Shadcn/UI conventions               |
| Data     | Supabase (Postgres + Row Level Security)             |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess`    |

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in your Supabase credentials
npm run dev
```

Apply the schema — either paste the files into the Supabase SQL editor in
order, or run them with the CLI:

```bash
supabase db push               # or: psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
```

| File                              | Contents                                        |
| --------------------------------- | ----------------------------------------------- |
| `supabase/migrations/0001_init.sql` | Tables, indexes, RLS, the publish function     |
| `supabase/migrations/0002_seed.sql` | One live tenant plus a `localhost` dev tenant  |

Both files are idempotent — re-running them is safe.

Generate a webhook secret with `openssl rand -hex 32` and set
`TENANT_WEBHOOK_SECRET` to it in both this app and your n8n credentials.

---

## How a tenant is resolved

`src/lib/tenant.ts` reads the request's `x-forwarded-host` (falling back to
`host`, then `DEFAULT_TENANT_DOMAIN`) and normalises it: lower-cased, scheme
stripped, port stripped, trailing dot stripped, leading `www.` stripped. That
canonical hostname is matched against `clients.domain`.

The database applies the *same* normalisation on write, via the
`clients_normalize_domain` trigger, so `HTTPS://WWW.Example.COM:443/pricing`
and `example.com` can never end up as two different rows.

The active config is the `client_configs` row with the highest `version`. Both
are fetched in a single query using PostgREST's embedded-resource ordering.

### Fallback behaviour

`getTenant()` never throws. Every failure degrades to complete fallback copy
and reports *why*:

| Status           | Cause                                      | What the visitor sees |
| ---------------- | ------------------------------------------ | --------------------- |
| `ok`             | Tenant and config found                    | Their content         |
| `unconfigured`   | Supabase env vars missing                  | Fallback copy         |
| `unknown-domain` | No `clients` row for this host             | Fallback copy         |
| `no-config`      | Tenant exists, no config published yet     | Fallback copy         |
| `error`          | Supabase unreachable or query failed       | Fallback copy         |

In development, `SetupNotice` explains the non-`ok` status on screen. In
production it renders nothing — visitors get a complete page, and internal
details never leak.

Because `content` is a `jsonb` column written by an AI agent, it is validated
on read too: fields that are missing, blank or the wrong shape fall back
individually, so a half-written config degrades one field at a time rather
than blanking the page.

---

## Webhook: `POST /api/tenant/update`

### Authentication

**Signed payload (default).** Send an `x-growth-os-signature` header:

```
x-growth-os-signature: t=<unix-seconds>,v1=<hex HMAC-SHA256 of "<t>.<rawBody>">
```

The signature covers the body *and* a timestamp, so a captured request can be
neither replayed (±5 minutes tolerance) nor edited in flight. Comparison is
constant-time.

**Bearer token (opt-in).** Set `TENANT_WEBHOOK_ALLOW_BEARER=true` to accept
`Authorization: Bearer <TENANT_WEBHOOK_SECRET>` instead. Easier to wire up in
n8n, but it offers no replay or integrity protection — hence off by default.

### Request

```jsonc
{
  "client_id": "uuid",           // or "domain": "multibrawn.co.il"
  "changes": {                   // a partial patch; merged over the current config
    "hero_headline": "…",
    "cta_text": "…",
    "active_promo": { "label": "New", "text": "…", "href": "https://…" }
  },
  "pending_change_id": "uuid"    // optional — flipped to "applied" on success
}
```

`changes` accepts `locale`, `direction`, `hero_headline`, `hero_subheadline`,
`cta_text`, `cta_href`, `active_promo` and `highlights`. Every field is
length-capped and shape-checked; unknown keys are **rejected**, not dropped, so
a typo in an automation surfaces immediately rather than silently doing
nothing. URLs must be `http(s)`, `mailto:`, `tel:`, or a `/` or `#` path —
`javascript:` and `data:` are refused at both the write and the render path.

### Responses

| Status | Meaning                                                    |
| ------ | ---------------------------------------------------------- |
| `200`  | Published. Returns the new `version` and merged `content`.  |
| `400`  | Body unreadable or not valid JSON                           |
| `401`  | Authentication failed (reason is logged, never returned)    |
| `404`  | No tenant matches the `client_id` / `domain`                |
| `405`  | Method other than POST                                      |
| `413`  | Body over 64 KB                                             |
| `422`  | Payload failed validation — `detail` names the field        |
| `502`  | Database unreachable                                        |
| `503`  | Server is missing required environment variables            |

### Testing it locally

```bash
export TENANT_WEBHOOK_SECRET=$(openssl rand -hex 32)
node scripts/sign-payload.mjs '{"domain":"localhost","changes":{"cta_text":"Book a demo"}}'
```

That prints a ready-to-run `curl` command with a valid signature.

---

## Data model

```
clients            id · domain (unique, normalised) · business_name · created_at
client_configs     id · client_id → clients · version · content (jsonb) · updated_at
pending_changes    id · client_id → clients · suggested_changes (jsonb) · reasoning
                   · status (pending|approved|rejected|applied) · created_at
```

**Configs are append-only.** Publishing inserts version N+1 rather than
mutating version N, so every AI-approved change is auditable and revertible —
rolling back is just re-publishing an earlier `content`.

`publish_client_config()` does the merge, the version bump and the
`pending_changes` status flip in one transaction, taking a row lock on the
tenant first. Twelve concurrent publishes against one tenant produce versions
2–13 with no duplicates and no errors.

### Security posture

- **`clients` / `client_configs`** — public `SELECT` for `anon` and
  `authenticated`. This is the copy already rendered on the public marketing
  site, so there is nothing to hide. Writes are revoked outright.
- **`pending_changes`** — no policies and no grants. Unpublished AI proposals
  and their reasoning are service-role only. A read with the anon key fails
  with a permission error rather than quietly returning zero rows.
- **`publish_client_config()`** — `security definer`, execute granted to
  `service_role` alone.
- **Service-role key** — used only in `src/lib/supabase/admin.ts`, imported
  only by the authenticated route handler, and never prefixed `NEXT_PUBLIC_`.

Request rate limiting is deliberately not implemented in-process: on
serverless it would be per-instance and give false confidence. Put it at the
CDN or WAF in front of the deployment.

---

## Project layout

```
src/
  app/
    layout.tsx                 per-tenant <html lang/dir> and metadata
    page.tsx                   the dynamic homepage
    error.tsx  not-found.tsx   boundaries
    api/tenant/update/route.ts the webhook
  components/
    sections/                  hero, promo banner, highlights, footer, dev notice
    ui/                        button, card, badge (Shadcn/UI conventions)
  lib/
    env.ts                     lazy, explicit env access
    tenant.ts                  domain normalisation, tenant loading, fallbacks
    tenant-changes.ts          webhook payload validation
    webhook-auth.ts            HMAC verification
    supabase/server.ts         anon client (RLS applies)
    supabase/admin.ts          service-role client (RLS bypassed)
    types/database.ts          hand-written DB types
supabase/migrations/           schema and seed
scripts/sign-payload.mjs       webhook signing helper
```

---

## Internationalisation

`locale` and `direction` live in the config, so each tenant controls its own
`<html lang>` and `<html dir>`. Hebrew tenants render RTL end-to-end — the
directional arrow in the promo banner flips via `rtl:rotate-180`, and the font
stack includes `Noto Sans Hebrew`.

---

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck   # tsc --noEmit
```
