// Netlify Function: the private preview of a site in the making. GET /draft/<id>?k=<key>
// (or ?a=<token> from כפיר's admin page). Rendered fresh from the draft's content on every request.
// Never indexed, never cached, and the link isn't passed on to other sites.
import { configured } from "../lib/leads.mjs";
import { loadDraft, getDraft, renderDraft, validPreviewToken } from "../lib/builder.mjs";

const HEADERS = {
  "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer",
  "x-frame-options": "SAMEORIGIN", "x-content-type-options": "nosniff",
};

const page = (status, text) => new Response(
  `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>טיוטה</title>
<style>body{margin:0;font:17px/1.6 system-ui,sans-serif;background:#f6f5fb;color:#1d1b2e;display:grid;place-items:center;min-height:100vh;padding:16px;text-align:center}</style></head>
<body><main><p>${text}</p><p><a href="/build/">לבונה האתרים</a></p></main></body></html>`,
  { status, headers: { ...HEADERS, "content-type": "text/html; charset=utf-8" } });

export default async (req, context) => {
  if (req.method !== "GET" && req.method !== "HEAD") return page(405, "הכתובת הזאת רק להצגה.");
  if (!configured()) return page(503, "המערכת עוד לא מחוברת.");
  const id = context.params && context.params.id;
  const url = new URL(req.url);
  try {
    const a = url.searchParams.get("a");
    const d = a ? (validPreviewToken(id, a) ? await getDraft(id) : null) : await loadDraft(id, url.searchParams.get("k"));
    if (!d) return page(404, "הטיוטה לא נמצאה. אולי הקישור לא שלם, או שהטיוטה נמחקה.");
    return new Response(renderDraft(d), { status: 200, headers: { ...HEADERS, "content-type": "text/html; charset=utf-8" } });
  } catch (e) {
    console.error("draft", e.message);
    return page(502, "משהו נתקע אצלנו. נסו לרענן בעוד רגע.");
  }
};

export const config = { path: "/draft/:id" };
