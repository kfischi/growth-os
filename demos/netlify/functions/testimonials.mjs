// Netlify Function: the testimonials a business's site shows (0010_testimonials.sql).
//   GET /api/testimonials/<slug>  -> { items: [{ name, text, stars, at }] }   only the visible ones, newest first
// Public: the page (shared/leadform.js, LeadForm.testimonials) shows them in its [data-testimonials] section.
import { json, configured, getClient, testimonialOn, publicTestimonials } from "../lib/leads.mjs";

const HEADERS = { "access-control-allow-origin": "*", "cache-control": "public, max-age=120" };

export default async (req, context) => {
  const slug = context.params && context.params.client;
  if (!configured() || !/^[a-z0-9-]{2,40}$/.test(slug || "")) return json({ items: [] }, 200, HEADERS);
  try {
    const client = await getClient(slug);
    if (!client || !client.active || !testimonialOn(client)) return json({ items: [] }, 200, HEADERS);
    return json({ items: await publicTestimonials(slug) }, 200, HEADERS);
  } catch (e) {
    console.error("testimonials", e.message);
    return json({ items: [] }, 200, { ...HEADERS, "cache-control": "no-store" });
  }
};

export const config = { path: "/api/testimonials/:client" };
