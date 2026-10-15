// Netlify Function: the site builder's API for the owner (demos/build/). Guide: docs/side-income/SITE_BUILDER.md
//   POST   /api/builder/start     { name, phone, consent, company? }      -> { id, key, state }
//   GET    /api/builder/state                                             -> { state }
//   POST   /api/builder/chat      { message, rev }                        -> { reply, state }
//   POST   /api/builder/learn     { text?, images?: [dataURL x3], rev }    -> { reply, changed, state, draft }   "למדו את העסק שלי"
//   POST   /api/builder/answer    { set, services, towns, regions, style, rev }   an answer picked in the questionnaire,
//                                 or the design ({ look, palette }), no AI -> { state }
//   POST   /api/builder/photo?slot=portrait   body: the JPEG/WebP bytes    -> { state }
//   DELETE /api/builder/photo?slot=portrait                               -> { state }
//   POST   /api/builder/video     body: the first frame (JPEG/WebP) then the MP4; x-poster-length: frame bytes -> { state }
//   DELETE /api/builder/video                                             -> { state }
//   POST   /api/builder/approve   { package, plan, rev }                  -> { state }
//   POST   /api/builder/reopen    { rev }   back to editing, before payment -> { state }
// Address, payment and the subscription (lib/billing.mjs; billing comes back as { billing } next to state):
//   GET    /api/builder/address                    -> { suggestions: [{ slug, host }] }   free names for the address
//   POST   /api/builder/address   { slug, domain?, rev } the pick; domain is the owner's own, connected after payment
//   POST   /api/builder/pay       { cycle: "month" | "year" }  -> { url }   Grow's payment page (or a new card after a refusal)
//   POST   /api/builder/pay-check  back from Grow: asks Grow about the checkout -> { state, billing }
//   POST   /api/builder/domain-check  is the owner's domain pointing here yet?   -> { state, billing }
//   POST   /api/builder/cancel | resume   the subscription, 30 days' notice    -> { billing }
//   POST   /api/builder/panel-seen  the panel link was saved: forget it         -> { billing }
//   POST   /api/builder/help      { message }   to כפיר on WhatsApp, from any step  -> { sent }
// Self edit, on a published site whose owner may change it (0004_self_edit.sql):
//   POST   /api/builder/publish   { rev }   puts the changes on the live site -> { state }
//   POST   /api/builder/discard   { rev }   back to what the site shows now  -> { state }
//   POST   /api/builder/undo      { rev }   loads the version before the last publish, to publish again -> { state }
// Every call but start sends the private link's "<id>:<key>" in the x-draft header.
import Anthropic from "@anthropic-ai/sdk";
import { json, configured, rateLimiter, clientIp, sha256, clip, israeliPhone, db } from "../lib/leads.mjs";
import {
  TEMPLATES, MAX_MESSAGES, MAX_CHARS, MAX_PHOTO_BYTES, Conflict, newKey, loadDraft, saveDraft, templateOf, publicState,
  chatTurn, learnTurn, greeting, applyUpdate, photoType, uploadPhoto, deletePhotos, alertKfir, savePhotos, saveMedia, getDraft,
  isMp4, MAX_VIDEO_BYTES, MAX_POSTER_BYTES,
  editing, renderDraft, heroAI, heroImage, isEditable, isDirty, snapshot, editUsage, EDIT_MESSAGES, EDIT_PUBLISHES, editGreeting, releaseMedia, mediaPaths,
  publishToRepo, ensureLeadClient, hostSite, suggestSlugs, connectDomain,
} from "../lib/builder.mjs";
import { billingView, chooseAddress, checkout, confirmPayment, cancel, resume } from "../lib/billing.mjs";
import dns from "node:dns/promises";

const startLimited = rateLimiter(3, 60 * 60 * 1000);   // new drafts per IP per hour, per function instance
const chatLimited = rateLimiter(40, 10 * 60 * 1000);    // chat turns per IP
const photoLimited = rateLimiter(30, 10 * 60 * 1000);
const videoLimited = rateLimiter(6, 10 * 60 * 1000);
const publishLimited = rateLimiter(6, 10 * 60 * 1000);
const answerLimited = rateLimiter(120, 10 * 60 * 1000);
const learnLimited = rateLimiter(8, 60 * 60 * 1000);    // "learn my business" reads (images cost more than a chat turn)
const imageLimited = rateLimiter(4, 60 * 60 * 1000);    // made background images per IP per hour (each costs a few cents)
const imageDraftLimited = rateLimiter(6, 24 * 60 * 60 * 1000); // and per draft per day
const addressLimited = rateLimiter(10, 60 * 60 * 1000);  // name suggestions (one short model call each)
const payLimited = rateLimiter(10, 10 * 60 * 1000);
const helpLimited = rateLimiter(4, 60 * 60 * 1000);
const checkLimited = rateLimiter(20, 10 * 60 * 1000);

const first = (n) => clip(n, 40).split(" ")[0] || "";
const stateOf = (d) => ({ ...publicState(d), greeting: (editing(d) ? editGreeting : greeting)(first(d.owner_name)) });

export default async (req, context) => {
  // Only this site's own pages call the builder.
  const origin = req.headers.get("origin");
  if (origin) { try { if (new URL(origin).host !== new URL(req.url).host) return json({ error: "forbidden" }, 403); } catch { return json({ error: "forbidden" }, 403); } }
  if (!configured() || !process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);
  const action = context.params && context.params.action;
  const ip = clientIp(req);
  let d = null;

  try {
    if (action === "start") {
      if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "bad_json" }, 400);
      if (body.company) return json({ error: "rate_limited" }, 429); // honeypot
      const name = clip(body.name, 40), phone = israeliPhone(body.phone);
      if (name.length < 2) return json({ error: "bad_name" }, 422);
      if (!phone || !phone.mobile) return json({ error: "bad_phone" }, 422);
      if (body.consent !== true) return json({ error: "no_consent" }, 422);
      const template = typeof body.template === "string" && Object.hasOwn(TEMPLATES, body.template) ? body.template : "plumber";
      if (startLimited(ip)) return json({ error: "rate_limited" }, 429);
      const cap = Number(process.env.BUILDER_DAILY_MAX) || 40;
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const today = await db("GET", `ls_drafts?created_at=gte.${encodeURIComponent(since)}&select=id&limit=${cap + 1}`);
      if (today.length >= cap) return json({ error: "busy_today" }, 429);

      const key = newKey();
      const content = { ...TEMPLATES[template].emptyContent(), owner_name: name, whatsapp: phone.local };
      const [d] = await db("POST", "ls_drafts", {
        key_hash: sha256(key), template, content, owner_name: name, owner_phone: phone.intl, ip_hash: sha256("ip:" + ip),
      }, "return=representation");
      return json({ id: d.id, key, state: stateOf(d) }, 201);
    }

    // Everything else needs the private link.
    const [id, key] = String(req.headers.get("x-draft") || "").split(":");
    d = await loadDraft(id, key);
    if (!d) return json({ error: "not_found" }, 404);

    if (action === "state" && req.method === "GET") return json({ state: stateOf(d), billing: await billingView(d) });

    if (action === "chat" && req.method === "POST") {
      if (!isEditable(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (chatLimited(ip)) return json({ error: "rate_limited" }, 429);
      const body = await req.json().catch(() => null);
      const message = clip(body && body.message, MAX_CHARS + 1);
      if (!message) return json({ error: "empty" }, 400);
      if (message.length > MAX_CHARS) return json({ error: "too_long" }, 400);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      if ((d.messages || []).length >= MAX_MESSAGES) return json({ error: "limit", state: stateOf(d) }, 429);
      const use = editing(d) ? editUsage(d) : null;
      if (use && use.messages >= EDIT_MESSAGES()) return json({ error: "edit_limit", state: stateOf(d) }, 429);
      const turn = await chatTurn(d, message);
      const messages = [...(d.messages || []), { role: "user", content: message }, { role: "assistant", content: turn.reply }];
      const count = use ? { edit_month: use.month, edit_messages: use.messages + 1, edit_publishes: use.publishes } : {};
      const saved = await saveDraft(d, turn.refused ? { messages, ...count } : { content: turn.content, messages, ...count });
      return json({ reply: turn.reply, changed: turn.changed || [], state: stateOf(saved), ...((turn.changed || []).length ? { draft: renderDraft(saved) } : {}) });
    }

    // "למדו את העסק שלי": a price list, a flyer, a card or pasted text fills the draft (lib/builder.mjs learnTurn).
    if (action === "learn" && req.method === "POST") {
      if (!isEditable(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (learnLimited(ip)) return json({ error: "rate_limited" }, 429);
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "bad_json" }, 400);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      const text = clip(body.text, 4000);
      const images = [];
      for (const url of Array.isArray(body.images) ? body.images.slice(0, 3) : []) {
        const m = typeof url === "string" && url.length <= 1_400_000 && /^data:(image\/(?:jpeg|webp|png));base64,([A-Za-z0-9+/=]+)$/.exec(url);
        if (!m) return json({ error: "bad_image" }, 400);
        images.push({ media: m[1], data: m[2] });
      }
      if (!text && !images.length) return json({ error: "empty" }, 400);
      if ((d.messages || []).length >= MAX_MESSAGES) return json({ error: "limit", state: stateOf(d) }, 429);
      const use = editing(d) ? editUsage(d) : null;
      if (use && use.messages >= EDIT_MESSAGES()) return json({ error: "edit_limit", state: stateOf(d) }, 429);
      const turn = await learnTurn(d, { text, images });
      // The history keeps text only: what was shared, in a line, and the reply.
      const shared = ["שיתפנו חומר על העסק", images.length ? `${images.length} תמונות` : "", text ? `טקסט: ${clip(text, 300)}` : ""].filter(Boolean).join(" · ");
      const messages = [...(d.messages || []), { role: "user", content: shared }, { role: "assistant", content: turn.reply }];
      const count = use ? { edit_month: use.month, edit_messages: use.messages + 1, edit_publishes: use.publishes } : {};
      const saved = await saveDraft(d, turn.refused ? { messages, ...count } : { content: turn.content, messages, ...count });
      return json({ reply: turn.reply, changed: turn.changed || [], state: stateOf(saved), ...((turn.changed || []).length ? { draft: renderDraft(saved) } : {}) });
    }

    // The questionnaire: the owner picked or typed an answer. Same checks as the chat's changes, no AI call.
    if (action === "answer" && req.method === "POST") {
      if (!isEditable(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (answerLimited(ip)) return json({ error: "rate_limited" }, 429);
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "bad_json" }, 400);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      const update = {
        set: Array.isArray(body.set) ? body.set.slice(0, 10).filter((x) => x && typeof x.field === "string") : [],
        services: Array.isArray(body.services) ? body.services : null,
        towns: Array.isArray(body.towns) ? body.towns.slice(0, 40) : null,
        regions: Array.isArray(body.regions) ? body.regions.slice(0, 8) : null,
        style: body.style && typeof body.style === "object" ? { look: String(body.style.look || ""), palette: String(body.style.palette || "") } : null,
      };
      const { content, changed, errors } = applyUpdate(templateOf(d), d.content, update);
      if (errors.length) return json({ error: "bad_answer", errors, state: stateOf(d) }, 422);
      const saved = changed.length ? await saveDraft(d, { content }) : d;
      return json({ changed, state: stateOf(saved), ...(changed.length ? { draft: renderDraft(saved) } : {}) });
    }

    // A background photo made for the owner (no photo of their own). Only made here; the page saves it like an upload.
    if (action === "hero-image" && req.method === "POST") {
      if (!heroAI()) return json({ error: "not_configured" }, 503);
      if (!isEditable(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (imageLimited(ip) || imageDraftLimited(d.id)) return json({ error: "rate_limited" }, 429);
      const body = await req.json().catch(() => ({}));
      try {
        const img = await heroImage(d.content, typeof body.wish === "string" ? body.wish : "");
        return json({ image: `data:${img.mime};base64,${img.data}` });
      } catch (e) {
        console.error("hero-image", e.message);
        return json({ error: "image_failed" }, 502);
      }
    }

    if (action === "photo") {
      const slot = new URL(req.url).searchParams.get("slot");
      const t = templateOf(d);
      if (!slot || !Object.hasOwn(t.PHOTOS, slot)) return json({ error: "bad_slot" }, 400);
      if (!isEditable(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (req.method === "DELETE") {
        const { row, before } = await savePhotos(d.id, (photos) => { delete photos[slot]; return photos; });
        if (!row) return json({ error: "locked", state: stateOf(before || d) }, 409);
        const old = ((before && before.photos) || {})[slot];
        if (old) await releaseMedia(row, [old.path]);
        return json({ state: stateOf(row), draft: renderDraft(row) });
      }
      if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      if (req.headers.get("x-photo-rights") !== "yes") return json({ error: "no_rights" }, 422);
      if (photoLimited(ip)) return json({ error: "rate_limited" }, 429);
      if (Number(req.headers.get("content-length") || 0) > MAX_PHOTO_BYTES) return json({ error: "too_big" }, 413);
      const buf = Buffer.from(await req.arrayBuffer());
      if (buf.length > MAX_PHOTO_BYTES) return json({ error: "too_big" }, 413);
      const ext = photoType(buf);
      if (!ext) return json({ error: "bad_type" }, 415);
      const photo = await uploadPhoto(d.id, slot, buf, ext);
      // Photos have their own version (photo_rev), so an upload during a chat answer doesn't cancel the answer,
      // and two uploads at once both stay.
      let saved;
      try { saved = await savePhotos(d.id, (photos) => ({ ...photos, [slot]: photo })); }
      catch (e) { await deletePhotos([photo.path]); throw e; }
      if (!saved.row) { await deletePhotos([photo.path]); return json({ error: "locked", state: saved.before ? stateOf(saved.before) : undefined }, 409); }
      const replaced = ((saved.before && saved.before.photos) || {})[slot];
      if (replaced) await releaseMedia(saved.row, [replaced.path]);
      return json({ state: stateOf(saved.row), draft: renderDraft(saved.row) });
    }

    if (action === "video") {
      if (!isEditable(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (req.method === "DELETE") {
        const { row, before } = await saveMedia(d.id, () => ({ video: null }));
        if (!row) return json({ error: "locked", state: stateOf(before || d) }, 409);
        const old = before && before.video;
        if (old) await releaseMedia(row, [old.path, old.poster.path]);
        return json({ state: stateOf(row), draft: renderDraft(row) });
      }
      if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      if (req.headers.get("x-photo-rights") !== "yes") return json({ error: "no_rights" }, 422);
      if (videoLimited(ip)) return json({ error: "rate_limited" }, 429);
      if (Number(req.headers.get("content-length") || 0) > MAX_VIDEO_BYTES + MAX_POSTER_BYTES) return json({ error: "too_big" }, 413);
      const buf = Buffer.from(await req.arrayBuffer());
      const n = Number(req.headers.get("x-poster-length"));
      if (!Number.isInteger(n) || n < 100 || n > MAX_POSTER_BYTES || n >= buf.length) return json({ error: "bad_type" }, 415);
      const frame = buf.subarray(0, n), movie = buf.subarray(n);
      if (movie.length > MAX_VIDEO_BYTES) return json({ error: "too_big" }, 413);
      const frameExt = photoType(frame);
      if (!frameExt || !isMp4(movie)) return json({ error: "bad_type" }, 415);
      const [poster, film] = await Promise.all([uploadPhoto(d.id, "poster", frame, frameExt), uploadPhoto(d.id, "video", movie, "mp4")]);
      const video = { ...film, poster };
      let saved;
      try { saved = await saveMedia(d.id, () => ({ video })); }
      catch (e) { await deletePhotos([film.path, poster.path]); throw e; }
      if (!saved.row) { await deletePhotos([film.path, poster.path]); return json({ error: "locked", state: saved.before ? stateOf(saved.before) : undefined }, 409); }
      const old = saved.before && saved.before.video;
      if (old) await releaseMedia(saved.row, [old.path, old.poster.path]);
      return json({ state: stateOf(saved.row), draft: renderDraft(saved.row) });
    }

    if (action === "approve" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!isEditable(d) || editing(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      const t = templateOf(d);
      const missing = t.missing(d.content);
      if (missing.length) return json({ error: "missing", missing }, 422);
      // Already paid (כפיר sent it back for a fix): the package stays as paid for, and it goes straight back to him.
      if (d.paid_at) {
        const saved = await saveDraft(d, { status: "paid", approved_at: new Date().toISOString(), return_note: null });
        const alert = await alertKfir(saved, "תיקון אחרי תשלום, מחכה לפרסום");
        return json({ state: stateOf(saved), alert });
      }
      const pkg = body.package, plan = body.plan;
      if (!["presence", "ai"].includes(pkg) || plan !== "full") return json({ error: "bad_package" }, 422);
      const saved = await saveDraft(d, { status: "client_approved", package: pkg, plan, approved_at: new Date().toISOString(), return_note: null });
      const alert = await alertKfir(saved, "אתר חדש מחכה לאישור");
      return json({ state: stateOf(saved), alert });
    }

    if (action === "address" && req.method === "GET") {
      if (d.status !== "client_approved") return json({ error: "locked" }, 409);
      if (addressLimited(ip)) return json({ error: "rate_limited" }, 429);
      return json({ suggestions: await suggestSlugs(d) });
    }

    if (action === "address" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (d.status !== "client_approved" || d.paid_at) return json({ error: "locked", state: stateOf(d) }, 409);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      const r = await chooseAddress(d, { slug: body.slug, domain: body.domain });
      if (r.error) return json({ error: r.error }, 422);
      const saved = await saveDraft(d, r.patch);
      // A domain nobody registered yet: say so now, before it is paid for.
      let registered = null;
      if (r.patch.domain_wish) registered = await dns.resolveNs(r.patch.domain_wish).then((x) => x.length > 0, (e) => (e.code === "ENOTFOUND" || e.code === "ENODATA" ? false : null));
      return json({ state: stateOf(saved), billing: await billingView(saved), registered });
    }

    if (action === "pay" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (payLimited(ip)) return json({ error: "rate_limited" }, 429);
      const r = await checkout(d, { cycle: body.cycle, origin: new URL(req.url).origin });
      if (r.error) return json({ error: r.error }, r.error === "not_configured" ? 503 : r.error === "pay_failed" ? 502 : 409);
      return json({ url: r.url });
    }

    if (action === "pay-check" && req.method === "POST") {
      if (checkLimited(ip)) return json({ error: "rate_limited" }, 429);
      const [pay] = await db("GET", `ls_payments?draft_id=eq.${encodeURIComponent(d.id)}&status=eq.pending&select=*&order=created_at.desc&limit=1`);
      let paid = false;
      if (pay) { try { paid = Boolean((await confirmPayment(pay)).paid); } catch (e) { console.error("pay check", e.message); } }
      const fresh = (await getDraft(d.id)) || d;
      return json({ paid, state: stateOf(fresh), billing: await billingView(fresh) });
    }

    if (action === "domain-check" && req.method === "POST") {
      if (checkLimited(ip)) return json({ error: "rate_limited" }, 429);
      const r = await connectDomain(d);
      const fresh = r.draft || d;
      return json({ domain: r.state, state: stateOf(fresh), billing: await billingView(fresh) });
    }

    if (["cancel", "resume"].includes(action) && req.method === "POST") {
      const r = await (action === "cancel" ? cancel(d) : resume(d));
      if (r.error) return json({ error: r.error }, 409);
      return json({ billing: await billingView(d) });
    }

    if (action === "panel-seen" && req.method === "POST") {
      const saved = d.panel_once ? await saveDraft(d, { panel_once: null }) : d;
      return json({ state: stateOf(saved), billing: await billingView(saved) });
    }

    if (action === "help" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const message = clip(body.message, 500);
      if (message.length < 3) return json({ error: "empty" }, 422);
      if (helpLimited(ip)) return json({ error: "rate_limited" }, 429);
      const sent = await alertKfir(d, "בקשת עזרה מהבונה: " + message);
      return json({ sent: sent === "sent" });
    }

    if (action === "reopen" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (d.status !== "client_approved") return json({ error: "locked", state: stateOf(d) }, 409);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      const saved = await saveDraft(d, { status: "draft", approved_at: null });
      return json({ state: stateOf(saved) });
    }

    if (["publish", "discard", "undo"].includes(action) && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!editing(d)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      const editPatch = (v) => ({ content: v.content, photos: v.photos || {}, video: v.video || null, photo_rev: d.photo_rev + 1 });

      if (action === "discard") {
        if (!isDirty(d)) return json({ error: "no_changes", state: stateOf(d) }, 409);
        const saved = await saveDraft(d, { ...editPatch(d.live), messages: [] });
        await releaseMedia(saved, mediaPaths(d)); // the uploads that never went live
        return json({ state: stateOf(saved) });
      }

      if (action === "undo") {
        if (!d.prev_live) return json({ error: "no_changes", state: stateOf(d) }, 409);
        const saved = await saveDraft(d, editPatch(d.prev_live));
        await releaseMedia(saved, mediaPaths(d));
        return json({ state: stateOf(saved) });
      }

      // publish: the changes go to the live site, in one commit to clients/<slug>/
      if (!isDirty(d)) return json({ error: "no_changes", state: stateOf(d) }, 409);
      const missing = templateOf(d).missing(d.content);
      if (missing.length) return json({ error: "missing", missing, state: stateOf(d) }, 422);
      const use = editUsage(d);
      if (use.publishes >= EDIT_PUBLISHES()) return json({ error: "edit_limit", state: stateOf(d) }, 429);
      if (publishLimited(ip)) return json({ error: "rate_limited" }, 429);
      const sha = await publishToRepo(d, d.published_slug, `Update clients/${d.published_slug}: the owner's changes\n\nDraft ${d.id}, published by the owner from the builder chat.`);
      const saved = await saveDraft(d, {
        live: snapshot(d), prev_live: d.live, published_sha: sha, published_at: new Date().toISOString(), messages: [],
        edit_month: use.month, edit_messages: use.messages, edit_publishes: use.publishes + 1,
      });
      await releaseMedia(saved, d.prev_live ? mediaPaths(d.prev_live) : []); // two versions back: no longer needed
      if (saved.package === "ai") await ensureLeadClient(saved, saved.published_slug).catch((e) => console.error("builder lead client", e.message));
      // The new version goes on the air at once; if Netlify fails, כפיר's alert says so and his next publish deploys it.
      let hosted = saved, deployed = true;
      try { const h = await hostSite(saved, saved.published_slug); if (!h.off) hosted = await saveDraft(saved, h); }
      catch (e) { console.error("builder hosting", e.message); deployed = false; }
      const alert = await alertKfir(hosted, deployed ? "בעל העסק פרסם שינוי באתר" : "בעל העסק פרסם שינוי, אבל ההעלאה ל-Netlify נכשלה. לפרסם שוב מהניהול");
      return json({ state: stateOf(hosted), commit: sha, alert });
    }

    return json({ error: "not_found" }, 404);
  } catch (e) {
    if (e instanceof Conflict) {
      const fresh = d && await getDraft(d.id).catch(() => null);
      return json({ error: "conflict", state: fresh ? stateOf(fresh) : undefined }, 409);
    }
    console.error("builder", action, e && e.message);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "not_configured" }, 503);
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.APIConnectionError || (e instanceof Anthropic.APIError && e.status >= 500)) return json({ error: "busy" }, 503);
    return json({ error: "server" }, 502);
  }
};

export const config = { path: "/api/builder/:action" };
