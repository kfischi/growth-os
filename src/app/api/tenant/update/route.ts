import { NextResponse } from "next/server";

import { MissingEnvError } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/tenant";
import {
  parseTenantUpdateRequest,
  ValidationError,
} from "@/lib/tenant-changes";
import { authenticateWebhook } from "@/lib/webhook-auth";

/**
 * POST /api/tenant/update
 *
 * Receives an approved change from the automation layer (n8n) and publishes it
 * as a new `client_configs` version.
 *
 * Auth: HMAC signature in `x-growth-os-signature` (see lib/webhook-auth.ts).
 *
 * Body:
 *   {
 *     "client_id": "uuid",              // or "domain": "example.com"
 *     "changes": { "hero_headline": "…", "active_promo": { … } },
 *     "pending_change_id": "uuid"       // optional; marked "applied" on success
 *   }
 *
 * The patch is merged over the current config inside a single transaction, so
 * concurrent webhooks cannot collide on a version number.
 */

// node:crypto and the service-role key require the Node.js runtime, and the
// route must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

function fail(status: number, error: string, detail?: string) {
  return NextResponse.json(
    detail ? { ok: false, error, detail } : { ok: false, error },
    { status, headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  // The signature covers the exact bytes received, so read the body as text
  // and parse it afterwards.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return fail(400, "could not read request body");
  }

  if (rawBody.length > 64_000) {
    return fail(413, "payload too large");
  }

  const auth = authenticateWebhook(request.headers, rawBody);
  if (!auth.ok) {
    // The reason is logged, never returned: it would tell an attacker which
    // part of their forged request to fix.
    console.warn("[tenant/update] rejected request", { reason: auth.reason });
    return fail(401, "unauthorized");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return fail(400, "invalid JSON body");
  }

  let parsed;
  try {
    parsed = parseTenantUpdateRequest(payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(422, "invalid payload", error.message);
    }
    throw error;
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Resolve the tenant first so an unknown domain returns 404 rather than a
    // constraint violation from deep inside the database function.
    let clientId = parsed.clientId;

    if (!clientId) {
      const domain = normalizeDomain(parsed.domain);
      if (!domain) {
        return fail(422, "invalid payload", `"domain" is not a valid hostname`);
      }

      const { data, error } = await supabase
        .from("clients")
        .select("id")
        .eq("domain", domain)
        .maybeSingle();

      if (error) {
        console.error("[tenant/update] client lookup failed", error);
        return fail(502, "could not reach the database");
      }
      if (!data) {
        return fail(404, "unknown tenant");
      }

      clientId = data.id;
    }

    const { data, error } = await supabase.rpc("publish_client_config", {
      p_client_id: clientId,
      p_content: parsed.changes,
      p_pending_id: parsed.pendingChangeId ?? null,
    });

    if (error) {
      // 23503 is a foreign-key violation: the client_id does not exist.
      if (error.code === "23503") {
        return fail(404, "unknown tenant");
      }
      console.error("[tenant/update] publish failed", error);
      return fail(502, "could not publish the config");
    }

    const published = data;

    return NextResponse.json(
      {
        ok: true,
        client_id: published.client_id,
        version: published.version,
        updated_at: published.updated_at,
        content: published.content,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof MissingEnvError) {
      console.error("[tenant/update] configuration error", error.message);
      return fail(503, "service is not configured");
    }
    console.error("[tenant/update] unexpected failure", error);
    return fail(500, "internal error");
  }
}

/** Anything other than POST is rejected outright. */
export async function GET() {
  return fail(405, "method not allowed");
}

export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
