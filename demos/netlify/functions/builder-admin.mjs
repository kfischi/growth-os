// Netlify Function: כפיר's side of the site builder (demos/build/admin/). Authorization: Bearer admin:<LEADS_ADMIN_KEY>
//   GET  /api/builder-admin                       -> { drafts: [...] }
//   GET  /api/builder-admin?id=<id>               -> { draft, preview }   preview: a one-hour link to /draft/<id>
//   POST /api/builder-admin { action: "paid",    id }            payment arrived (until the invoicing system's webhook does it)
//   POST /api/builder-admin { action: "return",  id, note }      back to the owner for changes, with a note they see
//   POST /api/builder-admin { action: "publish", id, slug }      writes clients/<slug>/ to the repo, puts it on the air (Netlify), for נציג AI also the lead system row
//   POST /api/builder-admin { action: "domain",  id, domain }    the client's own domain: added now, the main address once its DNS points here
//   POST /api/builder-admin { action: "self_edit", id, on }      the owner may change the live site in the chat (0004_self_edit.sql)
//   POST /api/builder-admin { action: "delete",  id }
import { json, configured, authorise, db, q, clip } from "../lib/leads.mjs";
import { hostingOn, cleanDomain, addDomain, dnsSteps } from "../lib/hosting.mjs";
import { getDraft, saveDraft, templateOf, photoUrl, adminPreviewToken, publishToRepo, ensureLeadClient, deletePhotos, mediaPaths, Conflict, snapshot, editing, isDirty, editUsage, releaseMedia, hostSite, setOrigins } from "../lib/builder.mjs";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$/;

function view(d) {
  const t = templateOf(d);
  return {
    id: d.id, status: d.status, template: d.template, trade: t.label, package: d.package, plan: d.plan,
    business: d.content.business_name || "", owner: d.owner_name, phone: d.owner_phone ? "0" + d.owner_phone.slice(3) : "",
    missing: t.missing(d.content), photos: Object.keys(d.photos || {}).length, video: Boolean(d.video), rights: Boolean(d.photo_rights_at),
    returnNote: d.return_note, slug: d.published_slug,
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
      const rows = await db("GET", "ls_drafts?select=id,status,template,package,plan,content,photos,video,photo_rights_at,owner_name,owner_phone,return_note,published_slug,self_edit,live,site_host,site_netlify,domain,domain_state,edit_month,edit_messages,edit_publishes,created_at,updated_at,approved_at,paid_at,published_at&order=created_at.desc&limit=200");
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
      if (!SLUG.test(slug) || ["sample-plumber", "kfir", "admin"].includes(slug)) return json({ error: "bad_slug" }, 422);
      if (!["paid", "published"].includes(d.status) || (d.published_slug && d.published_slug !== slug)) return json({ error: "wrong_status", status: d.status }, 409);
      const missing = templateOf(d).missing(d.content);
      if (missing.length) return json({ error: "missing", missing }, 422);
      // The owner is in the middle of changes they haven't published: never put them live for them.
      if (editing(d) && isDirty(d)) return json({ error: "owner_editing" }, 409);
      const mine = d.published_slug === slug;
      const other = await db("GET", `ls_drafts?published_slug=eq.${q(slug)}&id=neq.${q(d.id)}&select=id`);
      if (other.length) return json({ error: "slug_taken" }, 409);
      // A business already in the lead system (made by hand with new-client.mjs) keeps its name.
      if (!mine && (await db("GET", `ls_clients?slug=eq.${q(slug)}&select=slug`)).length) return json({ error: "slug_taken" }, 409);

      // Reserve the name before writing to the repo: a second click, or a retry after a half-finished
      // publish, then continues this draft's folder instead of being refused as "taken".
      let draft = d;
      if (!mine) {
        try { draft = await saveDraft(d, { published_slug: slug }); }
        catch (e) { if (e instanceof Conflict || /23505|duplicate/.test(e.message)) return json({ error: "conflict" }, 409); throw e; }
      }
      let sha;
      try { sha = await publishToRepo(draft, slug); }
      catch (e) {
        if (e.message === "slug_taken") {
          if (!mine) await saveDraft(draft, { published_slug: null }).catch((x) => console.error("release slug", x.message));
          return json({ error: "slug_taken" }, 409);
        }
        if (e.message.startsWith("not_configured")) return json({ error: "not_configured", detail: "GITHUB_TOKEN" }, 503);
        throw e;
      }
      // Self edit comes with every package (it is part of the monthly), so a published site is open to its owner at once.
      const saved = await saveDraft(draft, { status: "published", published_sha: sha, published_at: now, live: snapshot(draft), ...(draft.self_edit ? {} : { self_edit: true, messages: [] }) });
      // The site is in the repo already. If the lead system row fails, publishing again with the same slug finishes it.
      let leads;
      try { leads = await ensureLeadClient(saved, slug); } catch (e) { console.error("builder lead client", e.message); leads = { row: "failed" }; }
      // On the air: the Netlify site and its address the first time, a new deploy every time. Publishing again retries it.
      let hosted = saved, hosting;
      try {
        const h = await hostSite(saved, slug);
        if (h.off) hosting = { state: "off" };
        else { hosted = await saveDraft(saved, h); await setOrigins(hosted); hosting = { state: "live", url: "https://" + hosted.site_host + "/" }; }
      } catch (e) { console.error("builder hosting", e.message); hosting = { state: "failed", detail: clip(e.message, 200) }; }
      return json({ draft: view(hosted), commit: sha, folder: `clients/${slug}/`, leads, hosting });
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
