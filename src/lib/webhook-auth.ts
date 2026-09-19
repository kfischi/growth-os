import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { tenantWebhookSecret } from "@/lib/env";

/**
 * Authentication for /api/tenant/update.
 *
 * Preferred scheme — signed payload:
 *   x-growth-os-signature: t=<unix-seconds>,v1=<hex HMAC-SHA256 of "<t>.<rawBody>">
 * The signature covers the body and a timestamp, so a captured request cannot
 * be replayed or edited in flight.
 *
 * Fallback scheme — shared bearer token:
 *   Authorization: Bearer <TENANT_WEBHOOK_SECRET>
 * Simpler to wire up in n8n, but offers no replay or integrity protection, so
 * it is off unless TENANT_WEBHOOK_ALLOW_BEARER=true is set explicitly.
 */

export const SIGNATURE_HEADER = "x-growth-os-signature";

/** Requests older than this are rejected even with a valid signature. */
const MAX_SIGNATURE_AGE_SECONDS = 300;

export type AuthResult =
  | { ok: true; scheme: "signature" | "bearer" }
  | { ok: false; reason: string };

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Hash both sides to a fixed width first.
  const secret = "growth-os-compare";
  const hl = createHmac("sha256", secret).update(left).digest();
  const hr = createHmac("sha256", secret).update(right).digest();
  return timingSafeEqual(hl, hr);
}

export function signPayload(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): string {
  const v1 = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

function parseSignatureHeader(
  header: string,
): { timestamp: number; signatures: string[] } | null {
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2).map((segment) => segment?.trim());
    if (!key || !value) continue;
    if (key === "t") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) timestamp = parsed;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/**
 * Verify an incoming request. `rawBody` must be the exact bytes received —
 * re-serialising parsed JSON would change the signed material.
 */
export function authenticateWebhook(
  headers: Headers,
  rawBody: string,
  now: number = Date.now(),
): AuthResult {
  let secret: string;
  try {
    secret = tenantWebhookSecret();
  } catch {
    return { ok: false, reason: "webhook secret is not configured" };
  }

  const signatureHeader = headers.get(SIGNATURE_HEADER);

  if (signatureHeader) {
    const parsed = parseSignatureHeader(signatureHeader);
    if (!parsed) {
      return { ok: false, reason: "malformed signature header" };
    }

    const ageSeconds = Math.abs(Math.floor(now / 1000) - parsed.timestamp);
    if (ageSeconds > MAX_SIGNATURE_AGE_SECONDS) {
      return { ok: false, reason: "signature timestamp outside tolerance" };
    }

    const expected = createHmac("sha256", secret)
      .update(`${parsed.timestamp}.${rawBody}`)
      .digest("hex");

    const matched = parsed.signatures.some((candidate) =>
      constantTimeEquals(candidate, expected),
    );

    return matched ? { ok: true, scheme: "signature" } : { ok: false, reason: "signature mismatch" };
  }

  if (process.env.TENANT_WEBHOOK_ALLOW_BEARER === "true") {
    const authorization = headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (token && constantTimeEquals(token, secret)) {
      return { ok: true, scheme: "bearer" };
    }
    return { ok: false, reason: "invalid bearer token" };
  }

  return { ok: false, reason: "missing signature header" };
}
