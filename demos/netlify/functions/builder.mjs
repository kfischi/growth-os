// Netlify Function: the site builder's API for the owner (demos/build/). Guide: docs/side-income/SITE_BUILDER.md
//   POST   /api/builder/start     { name, phone, consent, company? }      -> { id, key, state }
//   GET    /api/builder/state                                             -> { state }
//   POST   /api/builder/chat      { message, rev }                        -> { reply, state }
//   POST   /api/builder/photo?slot=portrait   body: the JPEG/WebP bytes    -> { state }
//   DELETE /api/builder/photo?slot=portrait                               -> { state }
//   POST   /api/builder/video     body: the first frame (JPEG/WebP) then the MP4; x-poster-length: frame bytes -> { state }
//   DELETE /api/builder/video                                             -> { state }
//   POST   /api/builder/approve   { package, plan, rev }                  -> { state }
//   POST   /api/builder/reopen    { rev }   back to editing, before payment -> { state }
// Every call but start sends the private link's "<id>:<key>" in the x-draft header.
import Anthropic from "@anthropic-ai/sdk";
import { json, configured, rateLimiter, clientIp, sha256, clip, israeliPhone, db } from "../lib/leads.mjs";
import {
  TEMPLATES, MAX_MESSAGES, MAX_CHARS, MAX_PHOTO_BYTES, Conflict, newKey, loadDraft, saveDraft, templateOf, publicState,
  chatTurn, greeting, photoType, uploadPhoto, deletePhotos, alertKfir, savePhotos, saveMedia, getDraft,
  isMp4, MAX_VIDEO_BYTES, MAX_POSTER_BYTES,
} from "../lib/builder.mjs";

const startLimited = rateLimiter(3, 60 * 60 * 1000);   // new drafts per IP per hour, per function instance
const chatLimited = rateLimiter(40, 10 * 60 * 1000);    // chat turns per IP
const photoLimited = rateLimiter(30, 10 * 60 * 1000);
const videoLimited = rateLimiter(6, 10 * 60 * 1000);
const EDITABLE = ["draft", "returned"];

const first = (n) => clip(n, 40).split(" ")[0] || "";
const stateOf = (d) => ({ ...publicState(d), greeting: greeting(first(d.owner_name)) });

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

    if (action === "state" && req.method === "GET") return json({ state: stateOf(d) });

    if (action === "chat" && req.method === "POST") {
      if (!EDITABLE.includes(d.status)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (chatLimited(ip)) return json({ error: "rate_limited" }, 429);
      const body = await req.json().catch(() => null);
      const message = clip(body && body.message, MAX_CHARS + 1);
      if (!message) return json({ error: "empty" }, 400);
      if (message.length > MAX_CHARS) return json({ error: "too_long" }, 400);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      if ((d.messages || []).length >= MAX_MESSAGES) return json({ error: "limit", state: stateOf(d) }, 429);
      const turn = await chatTurn(d, message);
      const messages = [...(d.messages || []), { role: "user", content: message }, { role: "assistant", content: turn.reply }];
      const saved = await saveDraft(d, turn.refused ? { messages } : { content: turn.content, messages });
      return json({ reply: turn.reply, changed: turn.changed || [], state: stateOf(saved) });
    }

    if (action === "photo") {
      const slot = new URL(req.url).searchParams.get("slot");
      const t = templateOf(d);
      if (!slot || !Object.hasOwn(t.PHOTOS, slot)) return json({ error: "bad_slot" }, 400);
      if (!EDITABLE.includes(d.status)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (req.method === "DELETE") {
        const { row, before } = await savePhotos(d.id, (photos) => { delete photos[slot]; return photos; });
        if (!row) return json({ error: "locked", state: stateOf(before || d) }, 409);
        const old = ((before && before.photos) || {})[slot];
        if (old) await deletePhotos([old.path]);
        return json({ state: stateOf(row) });
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
      if (replaced) await deletePhotos([replaced.path]);
      return json({ state: stateOf(saved.row) });
    }

    if (action === "video") {
      if (!EDITABLE.includes(d.status)) return json({ error: "locked", state: stateOf(d) }, 409);
      if (req.method === "DELETE") {
        const { row, before } = await saveMedia(d.id, () => ({ video: null }));
        if (!row) return json({ error: "locked", state: stateOf(before || d) }, 409);
        const old = before && before.video;
        if (old) await deletePhotos([old.path, old.poster.path]);
        return json({ state: stateOf(row) });
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
      if (old) await deletePhotos([old.path, old.poster.path]);
      return json({ state: stateOf(saved.row) });
    }

    if (action === "approve" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!EDITABLE.includes(d.status)) return json({ error: "locked", state: stateOf(d) }, 409);
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
      if (!(pkg === "presence" && plan === "full") && !(pkg === "ai" && (plan === "full" || plan === "three"))) return json({ error: "bad_package" }, 422);
      const saved = await saveDraft(d, { status: "client_approved", package: pkg, plan, approved_at: new Date().toISOString(), return_note: null });
      const alert = await alertKfir(saved, "אתר חדש מחכה לאישור");
      return json({ state: stateOf(saved), alert });
    }

    if (action === "reopen" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (d.status !== "client_approved") return json({ error: "locked", state: stateOf(d) }, 409);
      if (body.rev !== d.rev) return json({ error: "conflict", state: stateOf(d) }, 409);
      const saved = await saveDraft(d, { status: "draft", approved_at: null });
      return json({ state: stateOf(saved) });
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
