/**
 * Environment access with explicit, actionable failures.
 *
 * Supabase credentials are read lazily (never at module scope) so that a
 * missing variable surfaces as a handled error in the request that needed it,
 * rather than crashing the build or the whole server on boot.
 */

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
    this.name = "MissingEnvError";
  }
}

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new MissingEnvError(name);
  return trimmed;
}

export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseServiceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function tenantWebhookSecret(): string {
  return required("TENANT_WEBHOOK_SECRET", process.env.TENANT_WEBHOOK_SECRET);
}

/**
 * Domain used when the request carries no usable Host header (CLI builds,
 * health checks, local `next start` behind a proxy).
 */
export function defaultTenantDomain(): string | null {
  return process.env.DEFAULT_TENANT_DOMAIN?.trim() || null;
}

/** True when Supabase is configured at all — used to render a setup hint. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}
