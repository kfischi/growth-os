import type { TenantResolution } from "@/lib/tenant";

const COPY: Record<
  Exclude<TenantResolution["status"], "ok">,
  { title: string; hint: string }
> = {
  unconfigured: {
    title: "Supabase is not configured",
    hint: "Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  },
  "unknown-domain": {
    title: "No tenant matches this domain",
    hint: "Add a row to public.clients with this domain, or set DEFAULT_TENANT_DOMAIN for local work.",
  },
  "no-config": {
    title: "Tenant has no published config",
    hint: "Insert a client_configs row for this client, or POST an approved change to /api/tenant/update.",
  },
  error: {
    title: "Could not load the tenant config",
    hint: "The request fell back to default copy. Check the server logs for the Supabase error.",
  },
};

/**
 * Developer-facing diagnostic explaining why fallback copy is on screen.
 *
 * Hidden in production: visitors get the fallback page, and internal details
 * (domains, Supabase errors) never reach them.
 */
export function SetupNotice({ resolution }: { resolution: TenantResolution }) {
  if (resolution.status === "ok") return null;
  if (process.env.NODE_ENV === "production") return null;

  const copy = COPY[resolution.status];

  return (
    <div className="px-6 pt-6" dir="ltr">
      <div className="mx-auto max-w-3xl rounded-xl2 border border-dashed border-line bg-surface px-5 py-4">
        <p className="text-sm font-semibold text-ink">
          Development notice — {copy.title}
        </p>
        <p className="mt-1 text-sm text-muted">{copy.hint}</p>
        <p className="mt-2 font-mono text-xs text-muted">
          domain: {resolution.domain}
          {resolution.status === "error" ? ` · ${resolution.message}` : ""}
        </p>
      </div>
    </div>
  );
}
