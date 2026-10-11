// Netlify Function: the photo a visitor attached to an enquiry. GET /p/<lead-id>.<signature>
// The link is in the owner's WhatsApp alert and in the panel. The signature makes it unguessable;
// the photo itself sits in a private bucket (0005_lead_photos.sql). Never indexed, never shared caches.
import { configured, db, q, photoToken, readLeadPhoto } from "../lib/leads.mjs";

const HEADERS = { "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" };
const notFound = () => new Response("התמונה לא נמצאה.", { status: 404, headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export default async (req, context) => {
  if (req.method !== "GET" && req.method !== "HEAD") return notFound();
  if (!configured()) return notFound();
  const id = photoToken(context.params && context.params.token);
  if (!id) return notFound();
  try {
    const [lead] = await db("GET", `ls_leads?id=eq.${q(id)}&select=photo`);
    if (!lead || !lead.photo) return notFound();
    const buf = await readLeadPhoto(lead.photo);
    if (!buf) return notFound();
    return new Response(buf, { status: 200, headers: { ...HEADERS, "content-type": lead.photo.endsWith(".webp") ? "image/webp" : "image/jpeg", "cache-control": "private, max-age=86400" } });
  } catch (e) {
    console.error("lead photo", e.message);
    return notFound();
  }
};

export const config = { path: "/p/:token" };
