import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { defaultTenantDomain, isSupabaseConfigured, MissingEnvError } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientConfig,
  ResolvedTenantContent,
  Tenant,
  TenantContent,
  TenantHighlight,
  TenantPromo,
} from "@/lib/types/database";

/**
 * Copy shown when a tenant exists but has no config yet, or when the platform
 * cannot reach Supabase. The site must never render an empty hero.
 */
export const TENANT_CONTENT_FALLBACK = {
  locale: "en",
  direction: "ltr",
  hero_headline: "Your business operating system",
  hero_subheadline:
    "Growth OS turns your numbers into decisions — and your decisions into a site that updates itself.",
  cta_text: "Get in touch",
  cta_href: "#contact",
  active_promo: null,
  highlights: [],
} as const satisfies ResolvedTenantContent;

/** Why the page is rendering fallback copy — drives the setup hint in the UI. */
export type TenantResolution =
  | { status: "ok"; tenant: Tenant }
  | { status: "unconfigured"; tenant: Tenant; domain: string }
  | { status: "unknown-domain"; tenant: Tenant; domain: string }
  | { status: "no-config"; tenant: Tenant; domain: string }
  | { status: "error"; tenant: Tenant; domain: string; message: string };

/**
 * Normalise a Host header into the canonical form stored in `clients.domain`:
 * lower-cased, no scheme, no port, no trailing dot, no leading `www.`.
 *
 * Returns `null` for anything that is not a plausible hostname, so a spoofed
 * or malformed Host never reaches the database as a lookup key.
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;

  let host = input.trim().toLowerCase();
  if (!host) return null;

  // A forwarded header may carry a comma-separated chain; the first entry is
  // the original client-facing host.
  const [first] = host.split(",");
  host = (first ?? "").trim();
  if (!host) return null;

  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme
  host = host.replace(/\/.*$/, ""); // path

  // IPv6 literals are bracketed: [::1]:3000
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    host = end === -1 ? host.slice(1) : host.slice(1, end);
  } else {
    host = host.replace(/:\d+$/, ""); // port
  }

  host = host.replace(/\.$/, ""); // fully-qualified trailing dot
  if (host.startsWith("www.")) host = host.slice(4);

  if (!host || host.length > 253) return null;
  if (!/^[a-z0-9._:-]+$/.test(host)) return null;

  return host;
}

/** Resolve the tenant domain for the current request. */
export async function getRequestDomain(): Promise<string | null> {
  const headerList = await headers();

  return (
    normalizeDomain(headerList.get("x-forwarded-host")) ??
    normalizeDomain(headerList.get("host")) ??
    normalizeDomain(defaultTenantDomain())
  );
}

function placeholderClient(domain: string): Client {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    domain,
    business_name: "Growth OS",
    created_at: new Date(0).toISOString(),
  };
}

function isPromo(value: unknown): value is TenantPromo {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as TenantPromo).text === "string" &&
    (value as TenantPromo).text.trim().length > 0
  );
}

function isHighlight(value: unknown): value is TenantHighlight {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as TenantHighlight;
  return (
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    typeof candidate.description === "string"
  );
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Merge a stored config over the fallback, discarding any field that is
 * missing, blank or of the wrong shape. The DB column is `jsonb`, so its
 * contents are validated here rather than trusted.
 */
export function resolveContent(
  content: TenantContent | null | undefined,
): ResolvedTenantContent {
  const source = (content ?? {}) as TenantContent;
  const direction = source.direction === "rtl" || source.direction === "ltr"
    ? source.direction
    : TENANT_CONTENT_FALLBACK.direction;

  const highlights = Array.isArray(source.highlights)
    ? source.highlights.filter(isHighlight)
    : [];

  return {
    locale: text(source.locale) ?? TENANT_CONTENT_FALLBACK.locale,
    direction,
    hero_headline:
      text(source.hero_headline) ?? TENANT_CONTENT_FALLBACK.hero_headline,
    hero_subheadline:
      text(source.hero_subheadline) ?? TENANT_CONTENT_FALLBACK.hero_subheadline,
    cta_text: text(source.cta_text) ?? TENANT_CONTENT_FALLBACK.cta_text,
    cta_href: text(source.cta_href) ?? TENANT_CONTENT_FALLBACK.cta_href,
    active_promo: isPromo(source.active_promo)
      ? source.active_promo
      : TENANT_CONTENT_FALLBACK.active_promo,
    highlights:
      highlights.length > 0 ? highlights : [...TENANT_CONTENT_FALLBACK.highlights],
  };
}

function fallbackTenant(domain: string, businessName?: string): Tenant {
  const client = placeholderClient(domain);
  return {
    client: businessName ? { ...client, business_name: businessName } : client,
    config: null,
    content: resolveContent(null),
  };
}

/**
 * Load the tenant for the current request and its active config — the row with
 * the highest `version`. Never throws: any failure degrades to fallback copy
 * with a status the page can act on.
 *
 * Wrapped in React's `cache`, so the layout and the page share a single
 * database round trip per request.
 */
export const getTenant = cache(async (): Promise<TenantResolution> => {
  const domain = (await getRequestDomain()) ?? "localhost";

  if (!isSupabaseConfigured()) {
    return { status: "unconfigured", tenant: fallbackTenant(domain), domain };
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, domain, business_name, created_at, client_configs(id, client_id, version, content, updated_at)",
      )
      .eq("domain", domain)
      .order("version", { referencedTable: "client_configs", ascending: false })
      .limit(1, { referencedTable: "client_configs" })
      .maybeSingle();

    if (error) {
      console.error("[tenant] lookup failed", { domain, error: error.message });
      return {
        status: "error",
        tenant: fallbackTenant(domain),
        domain,
        message: error.message,
      };
    }

    if (!data) {
      return { status: "unknown-domain", tenant: fallbackTenant(domain), domain };
    }

    const { client_configs: configs, ...client } = data as Client & {
      client_configs: ClientConfig[] | null;
    };
    const config = configs?.[0] ?? null;

    const tenant: Tenant = {
      client,
      config,
      content: resolveContent(config?.content),
    };

    return config
      ? { status: "ok", tenant }
      : { status: "no-config", tenant, domain };
  } catch (error) {
    const message =
      error instanceof MissingEnvError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error";

    console.error("[tenant] unexpected failure", { domain, message });
    return { status: "error", tenant: fallbackTenant(domain), domain, message };
  }
});
