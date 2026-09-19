import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Shadcn/UI's class helper: conditional classes with conflict-aware merging. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Only allow links the config can legitimately point at. `content` is edited by
 * an AI agent, so an unchecked `href` would be a stored-XSS vector via
 * `javascript:` or `data:` URLs.
 */
export function safeHref(href: string | null | undefined): string | undefined {
  const value = href?.trim();
  if (!value) return undefined;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:|^tel:/i.test(value)) return value;
  return undefined;
}
