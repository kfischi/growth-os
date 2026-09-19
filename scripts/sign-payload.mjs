#!/usr/bin/env node
/**
 * Sign a webhook payload for /api/tenant/update.
 *
 * Usage:
 *   node scripts/sign-payload.mjs '{"domain":"localhost","changes":{"cta_text":"Start"}}'
 *
 * Reads TENANT_WEBHOOK_SECRET from the environment and prints a ready-to-run
 * curl command. Useful for testing without wiring up n8n.
 */
import { createHmac } from "node:crypto";

const secret = process.env.TENANT_WEBHOOK_SECRET;
if (!secret) {
  console.error("TENANT_WEBHOOK_SECRET is not set.");
  process.exit(1);
}

const body = process.argv[2];
if (!body) {
  console.error("Usage: node scripts/sign-payload.mjs '<json-body>'");
  process.exit(1);
}

try {
  JSON.parse(body);
} catch {
  console.error("The payload is not valid JSON.");
  process.exit(1);
}

const baseUrl = process.env.GROWTH_OS_URL ?? "http://localhost:3000";
const timestamp = Math.floor(Date.now() / 1000);
const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

console.log(`curl -sS -X POST ${baseUrl}/api/tenant/update \\
  -H 'content-type: application/json' \\
  -H 'x-growth-os-signature: t=${timestamp},v1=${v1}' \\
  -d ${JSON.stringify(body)}`);
