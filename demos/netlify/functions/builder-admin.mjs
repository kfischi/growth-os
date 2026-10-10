// Netlify Function: כפיר's side of the site builder (demos/build/admin/). Authorization: Bearer admin:<LEADS_ADMIN_KEY>
//   GET  /api/builder-admin                       -> { drafts: [...] }
//   GET  /api/builder-admin?id=<id>               -> { draft, preview }   preview: a one-hour link to /draft/<id>
//   POST /api/builder-admin { action: "paid",    id }            payment arrived (until the invoicing system's webhook does it)
//   POST /api/builder-admin { action: "return",  id, note }      back to the owner for changes, with a note they see
//   POST /api/builder-admin { action: "publish", id, slug }      writes clients/<slug>/ to the repo; for נציג AI also the lead system row
//   POST /api/builder-admin { action: "delete",  id }
import { json, configured, authorise, db, q, clip } from "../lib/leads.mjs";
import { getDraft, saveDraft, templateOf, photoUrl, adminPreviewToken, publishToRepo, ensureLeadClient, deletePhotos, Conflict } from "../lib/builder.mjs";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$/;

function view(d) {
  const t = templateOf(d);
  return {
    id: d.id, status: d.status, template: d.template, package: d.package, plan: d.plan,
    business: d.content.business_name || "", owner: d.owner_name, phone: d.owner_phone ? "0" + d.owner_phone.slice(3) : "",
    missing: t.missing(d.content), photos: Object.keys(d.photos || {}).length, rights: Boolean(d.photo_rights_at),
    messages: (d.messages || []).length, returnNote: d.return_note, slug: d.published_slug,
    created: d.created_at, updated: d.updated_at, approved: d.approved_at, paid: d.paid_at, published: d.published_at,
  };
}

export default async (req) => {
  const origin = req.headers.get("origin");
  if (origin) { try { if (new URL(origin).host !== new URL(req.url).host) return json({ error: "forbidden" }, 403); } catch { return json({ error: "forbidden" }, 403); } }
  if (!configured()) return json({ error: "not_configured" }, 503);
  const who = await authorise(req).catch(() => null);
  if (!who || !who.admin) return json({ error: "unauthorised" }, 401);

  try {
    if (req.method === "GET") {
      const id = new URL(req.url).searchParams.get("id");
      if (id) {
        const d = await getDraft(id);
        if (!d) return json({ error: "not_found" }, 404);
        return json({
          draft: { ...view(d), content: d.content, chat: d.messages || [], photoUrls: Object.fromEntries(Object.entries(d.photos || {}).map(([s, p]) => [s, photoUrl(p)])) },
          preview: `/draft/${d.id}?a=${adminPreviewToken(d.id)}`,
        });
      }
      const rows = await db("GET", "ls_drafts?select=*&order=created_at.desc&limit=200");
      return json({ drafts: rows.map(view) });
    }
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "bad_json" }, 400);
    const d = await getDraft(body.id);
    if (!d) return json({ error: "not_found" }, 404);
    const now = new Date().toISOString();

    if (body.action === "paid") {
      if (d.status !== "client_approved") return json({ error: "wrong_status", status: d.status }, 409);
      return json({ draft: view(await saveDraft(d, { status: "paid", paid_at: now })) });
    }

    if (body.action === "return") {
      const note = clip(body.note, 500);
      if (!note) return json({ error: "note_required" }, 422);
      if (!["client_approved", "paid"].includes(d.status)) return json({ error: "wrong_status", status: d.status }, 409);
      return json({ draft: view(await saveDraft(d, { status: "returned", return_note: note, approved_at: null })) });
    }

    if (body.action === "publish") {
      const slug = String(body.slug || "");
      if (!SLUG.test(slug) || slug === "sample-plumber" || slug === "kfir") return json({ error: "bad_slug" }, 422);
      if (d.status === "published" ? d.published_slug !== slug : d.status !== "paid") return json({ error: "wrong_status", status: d.status }, 409);
      const missing = templateOf(d).missing(d.content);
      if (missing.length) return json({ error: "missing", missing }, 422);
      const other = await db("GET", `ls_drafts?published_slug=eq.${q(slug)}&id=neq.${q(d.id)}&select=id`);
      if (other.length) return json({ error: "slug_taken" }, 409);

      let sha;
      try { sha = await publishToRepo(d, slug); }
      catch (e) {
        if (e.message === "slug_taken") return json({ error: "slug_taken" }, 409);
        if (e.message.startsWith("not_configured")) return json({ error: "not_configured", detail: "GITHUB_TOKEN" }, 503);
        throw e;
      }
      const saved = await saveDraft(d, { status: "published", published_slug: slug, published_sha: sha, published_at: now });
      // The site is in the repo already. If the lead system row fails, publishing again with the same slug finishes it.
      let leads;
      try { leads = await ensureLeadClient(saved, slug); } catch (e) { console.error("builder lead client", e.message); leads = { row: "failed" }; }
      return json({ draft: view(saved), commit: sha, folder: `clients/${slug}/`, leads });
    }

    if (body.action === "delete") {
      if (d.status === "published") return json({ error: "wrong_status", status: d.status }, 409);
      await deletePhotos(Object.values(d.photos || {}).map((p) => p.path));
      await db("DELETE", `ls_drafts?id=eq.${q(d.id)}`);
      return json({ deleted: d.id });
    }

    return json({ error: "bad_action" }, 400);
  } catch (e) {
    if (e instanceof Conflict) return json({ error: "conflict" }, 409);
    console.error("builder-admin", e.message);
    return json({ error: "server", detail: clip(e.message, 200) }, 502);
  }
};

export const config = { path: "/api/builder-admin" };
