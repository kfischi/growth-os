import { safeHref } from "@/lib/utils";
import type { TenantContent, TenantHighlight, TenantPromo } from "@/lib/types/database";

/**
 * Validation for incoming webhook payloads.
 *
 * The caller is authenticated but not trusted: the body originates from an AI
 * agent, so every field is allow-listed, length-capped and shape-checked
 * before it reaches the database. Unknown keys are rejected rather than
 * silently dropped, so a typo in an automation surfaces immediately.
 */

const MAX_HEADLINE = 160;
const MAX_SUBHEADLINE = 400;
const MAX_CTA = 60;
const MAX_PROMO_TEXT = 240;
const MAX_LABEL = 32;
const MAX_HIGHLIGHTS = 12;
const MAX_HIGHLIGHT_TITLE = 80;
const MAX_HIGHLIGHT_DESCRIPTION = 280;

const ALLOWED_KEYS = [
  "locale",
  "direction",
  "hero_headline",
  "hero_subheadline",
  "cta_text",
  "cta_href",
  "active_promo",
  "highlights",
] as const;

const ALLOWED_PROMO_KEYS = ["label", "text", "href"] as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function requireString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new ValidationError(`"${field}" must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`"${field}" must not be empty`);
  }
  if (trimmed.length > max) {
    throw new ValidationError(`"${field}" must be at most ${max} characters`);
  }
  return trimmed;
}

function requireUrl(value: unknown, field: string): string {
  const raw = requireString(value, field, 2048);
  const href = safeHref(raw);
  if (!href) {
    throw new ValidationError(
      `"${field}" must be an absolute http(s) URL, a mailto:/tel: link, or a path starting with "/" or "#"`,
    );
  }
  return href;
}

function parsePromo(value: unknown): TenantPromo | null {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`"active_promo" must be an object or null`);
  }

  const input = value as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!(ALLOWED_PROMO_KEYS as readonly string[]).includes(key)) {
      throw new ValidationError(`Unsupported field "active_promo.${key}"`);
    }
  }

  const promo: TenantPromo = {
    text: requireString(input.text, "active_promo.text", MAX_PROMO_TEXT),
  };

  if (input.label !== undefined && input.label !== null) {
    promo.label = requireString(input.label, "active_promo.label", MAX_LABEL);
  }
  if (input.href !== undefined && input.href !== null) {
    promo.href = requireUrl(input.href, "active_promo.href");
  }

  return promo;
}

function parseHighlights(value: unknown): TenantHighlight[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`"highlights" must be an array`);
  }
  if (value.length > MAX_HIGHLIGHTS) {
    throw new ValidationError(
      `"highlights" must contain at most ${MAX_HIGHLIGHTS} items`,
    );
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new ValidationError(`"highlights[${index}]" must be an object`);
    }
    const entry = item as Record<string, unknown>;
    for (const key of Object.keys(entry)) {
      if (key !== "title" && key !== "description") {
        throw new ValidationError(`Unsupported field "highlights[${index}].${key}"`);
      }
    }
    return {
      title: requireString(
        entry.title,
        `highlights[${index}].title`,
        MAX_HIGHLIGHT_TITLE,
      ),
      description: requireString(
        entry.description,
        `highlights[${index}].description`,
        MAX_HIGHLIGHT_DESCRIPTION,
      ),
    };
  });
}

/**
 * Validate a partial content patch. Only the keys present in the payload are
 * returned — the database merges them over the current config, so a webhook
 * can update the headline without resending the whole document.
 */
export function parseTenantChanges(value: unknown): TenantContent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(`"changes" must be an object`);
  }

  const input = value as Record<string, unknown>;
  const keys = Object.keys(input);

  if (keys.length === 0) {
    throw new ValidationError(`"changes" must contain at least one field`);
  }

  for (const key of keys) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      throw new ValidationError(
        `Unsupported field "${key}". Allowed fields: ${ALLOWED_KEYS.join(", ")}`,
      );
    }
  }

  const changes: TenantContent = {};

  if ("locale" in input) {
    const locale = requireString(input.locale, "locale", 10);
    if (!/^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/.test(locale)) {
      throw new ValidationError(`"locale" must be a BCP-47 tag such as "he" or "en-US"`);
    }
    changes.locale = locale;
  }

  if ("direction" in input) {
    if (input.direction !== "ltr" && input.direction !== "rtl") {
      throw new ValidationError(`"direction" must be "ltr" or "rtl"`);
    }
    changes.direction = input.direction;
  }

  if ("hero_headline" in input) {
    changes.hero_headline = requireString(
      input.hero_headline,
      "hero_headline",
      MAX_HEADLINE,
    );
  }

  if ("hero_subheadline" in input) {
    changes.hero_subheadline = requireString(
      input.hero_subheadline,
      "hero_subheadline",
      MAX_SUBHEADLINE,
    );
  }

  if ("cta_text" in input) {
    changes.cta_text = requireString(input.cta_text, "cta_text", MAX_CTA);
  }

  if ("cta_href" in input) {
    changes.cta_href = requireUrl(input.cta_href, "cta_href");
  }

  if ("active_promo" in input) {
    changes.active_promo = parsePromo(input.active_promo);
  }

  if ("highlights" in input) {
    changes.highlights = parseHighlights(input.highlights);
  }

  return changes;
}

export interface TenantUpdateRequest {
  clientId?: string;
  domain?: string;
  changes: TenantContent;
  pendingChangeId?: string;
}

/** Validate the full webhook envelope. */
export function parseTenantUpdateRequest(body: unknown): TenantUpdateRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const input = body as Record<string, unknown>;

  const hasClientId = input.client_id !== undefined && input.client_id !== null;
  const hasDomain = input.domain !== undefined && input.domain !== null;

  if (!hasClientId && !hasDomain) {
    throw new ValidationError(`Provide either "client_id" or "domain"`);
  }

  const request: TenantUpdateRequest = {
    changes: parseTenantChanges(input.changes),
  };

  if (hasClientId) {
    if (!isUuid(input.client_id)) {
      throw new ValidationError(`"client_id" must be a UUID`);
    }
    request.clientId = input.client_id;
  }

  if (hasDomain) {
    request.domain = requireString(input.domain, "domain", 253);
  }

  if (input.pending_change_id !== undefined && input.pending_change_id !== null) {
    if (!isUuid(input.pending_change_id)) {
      throw new ValidationError(`"pending_change_id" must be a UUID`);
    }
    request.pendingChangeId = input.pending_change_id;
  }

  return request;
}
