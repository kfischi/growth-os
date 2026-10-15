// Netlify Function: כפיר's side of the site builder (demos/build/admin/). Authorization: Bearer admin:<LEADS_ADMIN_KEY>
//   GET  /api/builder-admin                       -> { drafts: [...] }
//   GET  /api/builder-admin?id=<id>               -> { draft, preview }   preview: a one-hour link to /draft/<id>
//   POST /api/builder-admin { action: "paid",    id }            payment arrived some other way (a bank transfer); Grow payments mark it by themselves
//   POST /api/builder-admin { action: "return",  id, note }      back to the owner for changes, with a note they see
//   POST /api/builder-admin { action: "publish", id, slug }      writes clients/<slug>/ to the repo, puts it on the air (Netlify), for נציג AI also the lead system row
//   POST /api/builder-admin { action: "domain",  id, domain }    the client's own domain: added now, the main address once its DNS points here
//   POST /api/builder-admin { action: "self_edit", id, on }      the owner may change the live site in the chat (0004_self_edit.sql)
//   POST /api/builder-admin { action: "delete",  id }
import { json, configured, authorise, db, q, clip } from "../lib/leads.mjs";
import { hostingOn, cleanDomain, addDomain, dnsSteps } from "../lib/hosting.mjs";
import { getDraft, saveDraft, templateOf, photoUrl, adminPreviewToken, deletePhotos, mediaPaths, Conflict, snapshot, editing, isDirty, editUsage, releaseMedia, publishDraft, PublishError } from "../lib/builder.mjs";

function view(d) {
  const t = templateOf(d);
  return {
    id: d.id, status: d.status, template: d.template, trade: t.label, package: d.package, plan: d.plan,
    business: d.content.business_name || "", owner: d.owner_name, phone: d.owner_phone ? "0" + d.owner_phone.slice(3) : "",
    missing: t.missing(d.content), photos: Object.keys(d.photos || {}).length, video: Boolean(d.video), rights: Boolean(d.photo_rights_at),
    returnNote: d.return_note, slug: d.published_slug || d.slug_wish || null, slugWish: d.slug_wish || null, domainWish: d.domain_wish || null,
    publishError: d.status === "paid" ? d.publish_error || null : null,
    selfEdit: Boolean(d.self_edit), editDirty: editing(d) ? isDirty(d) : false, edits: d.self_edit ? editUsage(d) : null,
    created: d.created_at, updated: d.updated_at, approved: d.approved_at, paid: d.paid_at, published: d.published_at,
    site: d.site_host ? "https://" + d.site_host + "/" : null, domain: d.domain || null, domainState: d.domain_state || null,
    dns: d.domain && d.domain_state === "waiting" && d.site_netlify ? dnsSteps(d.domain, { netlifyHost: d.site_netlify }) : null,
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
      // Everything but the chat and the key hash: the list stays small.
      const rows = await db("GET", "ls_drafts?select=id,status,template,package,plan,content,photos,video,photo_rights_at,owner_name,owner_phone,return_note,published_slug,slug_wish,domain_wish,publish_error,self_edit,live,site_host,site_netlify,domain,domain_state,edit_month,edit_messages,edit_publishes,created_at,updated_at,approved_at,paid_at,published_at&order=created_at.desc&limit=200");
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
      try {
        const out = await publishDraft(d, String(body.slug || ""));
        return json({ ...out, draft: view(out.draft) });
      } catch (e) {
        if (!(e instanceof PublishError)) throw e;
        return json({ error: e.code, ...(e.missing ? { missing: e.missing } : {}), ...(e.draftStatus ? { status: e.draftStatus } : {}), ...(e.detail ? { detail: e.detail } : {}) }, e.status);
      }
    }

    if (body.action === "domain") {
      if (d.status !== "published" || !d.site_id) return json({ error: "wrong_status", status: d.status }, 409);
      if (!hostingOn()) return json({ error: "not_configured", detail: "NETLIFY_TOKEN" }, 503);
      const domain = cleanDomain(body.domain);
      if (!domain) return json({ error: "bad_domain" }, 422);
      const taken = await db("GET", `ls_drafts?domain=eq.${q(domain)}&id=neq.${q(d.id)}&select=id`);
      if (taken.length) return json({ error: "domain_taken" }, 409);
      await addDomain(d.site_id, domain);
      const saved = await saveDraft(d, { domain, domain_state: "waiting", domain_since: now });
      return json({ draft: view(saved) });
    }

    if (body.action === "self_edit") {
      if (d.status !== "published" || !d.published_slug) return json({ error: "wrong_status", status: d.status }, 409);
      const on = body.on === true;
      // A site published before self edit existed: what it shows now is its content.
      // Turned off: changes the owner didn't publish are dropped, so a later publish by כפיר never carries them.
      const back = !on && d.live && isDirty(d) ? { content: d.live.content, photos: d.live.photos || {}, video: d.live.video || null, photo_rev: d.photo_rev + 1 } : {};
      const patch = on ? { self_edit: true, live: d.live || snapshot(d), messages: [] } : { self_edit: false, messages: [], ...back };
      const saved = await saveDraft(d, patch);
      if (back.content) await releaseMedia(saved, mediaPaths(d));
      return json({ draft: view(saved) });
    }

    if (body.action === "delete") {
      if (d.status === "published" || d.paid_at) return json({ error: "wrong_status", status: d.status }, 409);
      await deletePhotos(mediaPaths(d));
      await db("DELETE", `ls_payments?draft_id=eq.${q(d.id)}&status=neq.paid`); // checkouts opened and never paid
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
