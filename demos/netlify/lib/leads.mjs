// Shared code for the lead system functions in demos/netlify/functions/:
// lead.mjs, wa-webhook.mjs, leads-api.mjs, reminders.mjs, monthly-report.mjs and client-chat.mjs.
// Storage is Supabase (supabase/lead-system/0001_lead_system.sql), reached through its REST API.
// WhatsApp is the official Cloud API. Secrets come only from Netlify environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY        the lead system's own Supabase project (secret key)
//   WA_TOKEN or WA_TOKEN_<SLUG>               Cloud API access token, per business if they differ
//   WA_APP_SECRET                             Meta app secret(s), comma separated, to verify webhooks
//   WA_VERIFY_TOKEN                           any string, typed again in Meta when the webhook is added
//   LEADS_ADMIN_KEY                           כפיר's key for the panel and the admin actions
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const STATUS_HE = { new: "חדש", handled: "טופל", won: "נסגר", lost: "לא רלוונטי" };
const SOURCE_HE = { direct: "כניסה ישירה", google: "גוגל", facebook: "פייסבוק", instagram: "אינסטגרם", whatsapp: "וואטסאפ", tiktok: "טיקטוק", "m.facebook.com": "פייסבוק", "l.facebook.com": "פייסבוק", "lm.facebook.com": "פייסבוק", "l.instagram.com": "אינסטגרם" };
export const sourceHe = (s) => SOURCE_HE[s] || (/^google\./.test(s || "") ? "גוגל" : s || "כניסה ישירה");

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

export const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

/* ---------------- Supabase (PostgREST) ---------------- */

export async function db(method, path, body, prefer) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: key, "content-type": "application/json" };
  if (!key.startsWith("sb_")) headers.authorization = "Bearer " + key; // legacy service_role JWT
  if (prefer) headers.prefer = prefer;
  const res = await fetch(process.env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000), // a hung call must fail fast, so the page can still fall back to WhatsApp
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`db ${method} ${path.split("?")[0]} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export const q = encodeURIComponent;

const clientCache = new Map(); // per function instance, 60 seconds
export async function getClient(slug) {
  if (!/^[a-z0-9-]{2,40}$/.test(slug || "")) return null;
  const hit = clientCache.get(slug);
  if (hit && Date.now() - hit.at < 60_000) return hit.row;
  const rows = await db("GET", `ls_clients?slug=eq.${q(slug)}&select=*`);
  const row = rows[0] || null;
  clientCache.set(slug, { row, at: Date.now() });
  return row;
}

export async function insertLead(row) {
  return (await db("POST", "ls_leads", row, "return=representation"))[0];
}

export async function updateLead(id, patch) {
  return (await db("PATCH", `ls_leads?id=eq.${q(id)}`, patch, "return=representation"))[0];
}

/* ---------------- small helpers ---------------- */

// Israeli numbers only. Returns null for anything else.
export function israeliPhone(raw) {
  let d = String(raw || "").replace(/[^\d]/g, "");
  if (d.startsWith("00972")) d = d.slice(2);
  if (d.startsWith("972")) d = "0" + d.slice(3);
  if (!/^0(5\d{8}|[234689]\d{7}|7\d{8})$/.test(d)) return null;
  return { local: d, intl: "972" + d.slice(1), mobile: d.startsWith("05") };
}

export const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// WhatsApp template parameters can't be empty and can't hold new lines, tabs or 4+ spaces.
const param = (s, n = 200) => clip(s, n) || "-";

export const firstName = (name) => clip(name, 40).split(" ")[0] || "";

export function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(key, list);
    if (hits.size > 5000) hits.clear();
    return list.length > max;
  };
}

export const clientIp = (req) =>
  req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

export const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

// Meta signs each webhook body with the app secret: X-Hub-Signature-256: sha256=<hex>.
export function validMetaSignature(rawBody, header) {
  const secrets = (process.env.WA_APP_SECRET || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!secrets.length || !header || !header.startsWith("sha256=")) return false;
  return secrets.some((s) => safeEqual("sha256=" + createHmac("sha256", s).update(rawBody).digest("hex"), header));
}

// Hour, weekday and month in Israel, whatever the server's time zone.
export function israelTime(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem", hourCycle: "h23", weekday: "short", hour: "numeric", year: "numeric", month: "numeric", day: "numeric",
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    hour: Number(parts.hour),
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday),
    year: Number(parts.year), month: Number(parts.month), date: Number(parts.day),
  };
}

export function inWorkingHours(client, date = new Date()) {
  const t = israelTime(date);
  return (client.work_days || []).includes(t.day) && t.hour >= client.work_start && t.hour < client.work_end;
}

/* ---------------- "available now" (0007_availability.sql) ---------------- */

// What the owner said ("עסוק", "פנוי") counts until avail_until; after that the working hours decide.
// state: "free" | "busy" | "open" | "closed". text: one short line for the site, in the business's voice (plural).
const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const clock = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
export const AVAIL_MAX_HOURS = 12;

export function availability(client, now = new Date()) {
  const until = client.avail_until ? new Date(client.avail_until) : null;
  if (client.avail && until && until > now) {
    return client.avail === "busy"
      ? { state: "busy", until: until.toISOString(), text: `באמצע עבודה. חוזרים אליכם עד ${clock(until)}.` }
      : { state: "free", until: until.toISOString(), text: "פנויים עכשיו. אפשר לכתוב או להתקשר." };
  }
  if (client.work_start <= 0 && client.work_end >= 24 && (client.work_days || []).length === 7) return { state: "open", until: null, text: "זמינים 24/7." };
  if (inWorkingHours(client, now)) return { state: "open", until: null, text: `זמינים היום עד ${client.work_end}:00.` };
  // The next opening: today later, tomorrow, or the next working day.
  const t = israelTime(now);
  for (let i = 0; i < 8; i++) {
    const day = (t.day + i) % 7;
    if (!(client.work_days || []).includes(day) || (i === 0 && t.hour >= client.work_start)) continue;
    const when = i === 0 ? "היום" : i === 1 ? "מחר" : `ביום ${DAYS_HE[day]}`;
    return { state: "closed", until: null, text: `השאירו פרטים, ונחזור אליכם ${when} מ-${client.work_start}:00.` };
  }
  return { state: "closed", until: null, text: "השאירו פרטים, ונחזור אליכם." };
}

// From the owner's WhatsApp: "עסוק", "עסוק 2" (hours), "פנוי", "אוטומטי", "סטטוס". Anything else: null.
export function availabilityCommand(text) {
  const t = String(text || "").trim().replace(/[.!?,׳'"]+$/g, "").replace(/\s+/g, " ");
  let m = /^(עסוק|עסוקה|עסוקים|בעבודה)(?: (\d{1,2}))?$/.exec(t);
  if (m) return { avail: "busy", hours: Math.min(Math.max(Number(m[2]) || 3, 1), AVAIL_MAX_HOURS) };
  m = /^(פנוי|פנויה|פנויים|זמין|זמינה|זמינים)(?: (\d{1,2}))?$/.exec(t);
  if (m) return { avail: "free", hours: m[2] ? Math.min(Math.max(Number(m[2]), 1), AVAIL_MAX_HOURS) : null };
  if (/^(אוטומטי|רגיל|לפי השעות)$/.test(t)) return { avail: null };
  if (/^(סטטוס|מצב)$/.test(t)) return { status: true };
  return null;
}

// Sets it and returns what the site shows now. "free" without hours lasts to the end of today's working hours (at least 2 hours).
export async function setAvailability(client, cmd, now = new Date()) {
  let patch = { avail: null, avail_until: null };
  if (cmd.avail) {
    let hours = cmd.hours;
    if (!hours) { const t = israelTime(now); hours = Math.min(Math.max(client.work_end - t.hour, 2), AVAIL_MAX_HOURS); }
    patch = { avail: cmd.avail, avail_until: new Date(now.getTime() + hours * 3_600_000).toISOString() };
  }
  await db("PATCH", `ls_clients?slug=eq.${q(client.slug)}`, patch);
  Object.assign(client, patch);
  clientCache.delete(client.slug); // the next read in this instance sees it; others within a minute
  return availability(client, now);
}

export function ago(fromIso, now = new Date()) {
  const min = Math.max(1, Math.round((now - new Date(fromIso)) / 60000));
  if (min < 60) return min === 1 ? "דקה" : `${min} דקות`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שעות`;
  const d = Math.round(h / 24);
  return d === 1 ? "יום" : d === 2 ? "יומיים" : `${d} ימים`;
}

/* ---------------- WhatsApp Cloud API ---------------- */

const GRAPH = () => `https://graph.facebook.com/${process.env.WA_GRAPH_VERSION || "v23.0"}`;

export function waToken(client) {
  return process.env["WA_TOKEN_" + client.slug.toUpperCase().replace(/-/g, "_")] || process.env.WA_TOKEN || "";
}

async function logMessage(row) {
  try { await db("POST", "ls_messages", row); } catch (e) { console.error("log message", e.message); }
}

async function waSend(client, to, payload, log) {
  const token = waToken(client);
  if (!token || !client.wa_phone_number_id || !to) {
    await logMessage({ ...log, client_slug: client.slug, direction: "out", to_phone: to, status: "skipped", error: "not_configured" });
    return "skipped";
  }
  try {
    const res = await fetch(`${GRAPH()}/${client.wa_phone_number_id}/messages`, {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...payload }),
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json().catch(() => ({}));
    const id = data.messages && data.messages[0] && data.messages[0].id;
    await logMessage({
      ...log, client_slug: client.slug, direction: "out", to_phone: to, wa_id: id || null,
      status: res.ok ? "accepted" : "failed", error: res.ok ? null : clip(data.error && (data.error.message || data.error.code), 300) || String(res.status),
      body: payload,
    });
    return res.ok ? "sent" : "failed";
  } catch (e) {
    await logMessage({ ...log, client_slug: client.slug, direction: "out", to_phone: to, status: "failed", error: clip(e.message, 300) });
    return "failed";
  }
}

// A template message: the only kind a business may start a conversation with.
// buttonPayload fills the template's first quick-reply button (the owner's "טיפלתי").
export function sendTemplate(client, to, name, params, { buttonPayload, kind, leadId } = {}) {
  const components = [{ type: "body", parameters: params.map((p) => ({ type: "text", text: param(p) })) }];
  if (buttonPayload) components.push({ type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: buttonPayload }] });
  return waSend(client, to, { type: "template", template: { name, language: { code: client.tpl_lang || "he" }, components } }, { kind, lead_id: leadId || null });
}

// Free text. Works only within 24 hours of the person's last message to the business.
export function sendText(client, to, text, { kind, leadId } = {}) {
  return waSend(client, to, { type: "text", text: { body: clip(text, 1000), preview_url: false } }, { kind, lead_id: leadId || null });
}

/* ---------------- the lead flow ---------------- */

export function sourceOf(input) {
  const s = clip(input.source, 40).toLowerCase();
  if (s) return s;
  try { return input.referrer ? new URL(input.referrer).hostname.replace(/^www\./, "") : "direct"; } catch { return "direct"; }
}

// Validates, stores, answers the lead on WhatsApp and alerts the owner.
// Returns { ok: true, id, duplicate?, autoReply } only when the owner was alerted (or alerts are off).
// If the alert didn't go out, the lead is still stored but the answer is { ok: false, error: "alert_failed" },
// so the page opens WhatsApp to the business and the enquiry reaches a person anyway.
/* ---------------- a photo with the enquiry (0005_lead_photos.sql) ---------------- */

export const PHOTO_BUCKET = "lead-photos";
export const MAX_LEAD_PHOTO = 1_048_576;
const SITE = "https://service-pro-web.netlify.app";

// A data URL from the chat ("data:image/jpeg;base64,..."): only a real JPEG or WebP, up to 1 MB. Else null.
export function decodePhoto(dataUrl) {
  const m = /^data:image\/(jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || "").slice(0, 1_500_000));
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > MAX_LEAD_PHOTO) return null;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const webp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !webp) return null;
  return { buf, ext: jpeg ? "jpg" : "webp", type: jpeg ? "image/jpeg" : "image/webp" };
}

const storage = (path) => process.env.SUPABASE_URL.replace(/\/$/, "") + "/storage/v1/object/" + path;
function storageHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const h = { apikey: key, ...extra };
  if (!key.startsWith("sb_")) h.authorization = "Bearer " + key;
  return h;
}
async function uploadLeadPhoto(slug, leadId, photo) {
  const path = `${slug}/${leadId}.${photo.ext}`;
  const res = await fetch(storage(`${PHOTO_BUCKET}/${path}`), {
    method: "POST", headers: storageHeaders({ "content-type": photo.type, "x-upsert": "true" }), body: photo.buf, signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`photo upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return path;
}
export async function readLeadPhoto(path) {
  const res = await fetch(storage(`${PHOTO_BUCKET}/${path}`), { headers: storageHeaders(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}
export async function deleteLeadPhotos(paths) {
  if (!paths.length) return;
  const res = await fetch(storage(PHOTO_BUCKET), {
    method: "DELETE", headers: storageHeaders({ "content-type": "application/json" }), body: JSON.stringify({ prefixes: paths }), signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) console.error("photo delete", res.status);
}
// The private link to a lead's photo: whoever has it sees the photo, nobody can guess it.
const photoSig = (id) => createHmac("sha256", process.env.SUPABASE_SERVICE_KEY || "").update("lead-photo:" + id).digest("base64url").slice(0, 22);
export const photoLink = (id) => `${SITE}/p/${id}.${photoSig(id)}`;
export function photoToken(token) {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{22})$/.exec(token || "");
  return m && safeEqual(m[2], photoSig(m[1])) ? m[1] : null;
}

/* ---------------- tagged links (0006_links.sql) ---------------- */

// The owner makes one link per group or channel in the panel: <site>/?s=k3p9. The page sends the source
// "t-k3p9" (shared/leadform.js), and the name the owner gave it shows instead of the code.
export const LINK_MAX = 30;
const LINK_ABC = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i: read aloud or typed, it stays right
export const isTag = (s) => /^t-[a-z0-9]{4}$/.test(s || "");
export const sourceName = (s, labels = {}) => labels[s] || sourceHe(s);
export function siteUrl(client) {
  const o = (client.allowed_origins || []).find((x) => /^https:\/\//.test(x));
  return (o || SITE).replace(/\/$/, "") + "/";
}
export const linkUrl = (client, code) => siteUrl(client) + "?s=" + code;

// { "t-k3p9": "קבוצת השכונה" }. Never throws: without names the codes still show.
export async function linkLabels(slug) {
  try {
    const rows = await db("GET", `ls_links?client_slug=eq.${q(slug)}&select=code,label&limit=${LINK_MAX * 2}`);
    return Object.fromEntries(rows.map((r) => ["t-" + r.code, r.label]));
  } catch (e) { console.error("link labels", e.message); return {}; }
}

export async function addLink(client, label) {
  const name = clip(label, 40);
  if (name.length < 2) return { error: "bad_label" };
  const have = await db("GET", `ls_links?client_slug=eq.${q(client.slug)}&select=code,label`);
  if (have.length >= LINK_MAX) return { error: "too_many_links" };
  if (have.some((l) => l.label === name)) return { error: "label_taken" };
  for (let i = 0; i < 5; i++) {
    const bytes = randomBytes(4), code = [...bytes].map((b) => LINK_ABC[b % LINK_ABC.length]).join("");
    if (have.some((l) => l.code === code)) continue;
    try {
      const [row] = await db("POST", "ls_links", { client_slug: client.slug, code, label: name }, "return=representation");
      return { link: { code: row.code, label: row.label, url: linkUrl(client, row.code) } };
    } catch (e) { if (!/409|duplicate/.test(e.message)) throw e; }
  }
  return { error: "try_again" };
}

export async function removeLink(client, code) {
  if (!/^[a-z0-9]{4}$/.test(code || "")) return { error: "bad_code" };
  const rows = await db("DELETE", `ls_links?client_slug=eq.${q(client.slug)}&code=eq.${q(code)}`, undefined, "return=representation");
  return rows.length ? { ok: true } : { error: "not_found" };
}

// The links with what each brought in the period (from periodStats).
export async function listLinks(client, stats) {
  const rows = await db("GET", `ls_links?client_slug=eq.${q(client.slug)}&select=code,label,created_at&order=created_at.asc&limit=${LINK_MAX * 2}`);
  return rows.map((r) => ({
    code: r.code, label: r.label, url: linkUrl(client, r.code),
    visits: (stats && stats.visitsBySource["t-" + r.code]) || 0, leads: (stats && stats.bySource["t-" + r.code]) || 0,
  }));
}

export async function processLead(client, input, channel = "form") {
  const phone = israeliPhone(input.phone);
  if (!phone) return { ok: false, error: "bad_phone" };
  const name = clip(input.name, 60);
  if (name.length < 2) return { ok: false, error: "bad_name" };

  // The same person sending twice within 10 minutes is one enquiry.
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const dup = await db("GET", `ls_leads?client_slug=eq.${q(client.slug)}&phone_intl=eq.${phone.intl}&created_at=gte.${q(since)}&select=id&limit=1`);
  if (dup.length) return { ok: true, id: dup[0].id, duplicate: true };
  // (A double tap within the same second can still make two rows. Rare, and two alerts beat none.)

  const lead = await insertLead({
    client_slug: client.slug, name, phone: phone.local, phone_intl: phone.intl,
    service: clip(input.service, 120) || null, message: clip(input.message, 1500) || null, channel,
    source: sourceOf(input), campaign: clip(input.campaign, 60) || null, page: clip(input.page, 300) || null,
    auto_reply: client.auto_reply ? "pending" : "off", owner_alert: client.owner_alerts ? "pending" : "off",
  });

  // The photo goes up before the alert, so the alert can link to it (a template parameter takes no line
  // breaks, so it joins the message with " · "). A failed upload never stops the lead.
  let photoNote = "";
  const photo = input.photo ? decodePhoto(input.photo) : null;
  if (photo) {
    try { lead.photo = await uploadLeadPhoto(client.slug, lead.id, photo); await updateLead(lead.id, { photo: lead.photo }); photoNote = "תמונה: " + photoLink(lead.id); }
    catch (e) { console.error("lead photo", e.message); photoNote = "הלקוח צירף תמונה, והיא לא נשמרה"; }
  }

  const [autoReply, ownerAlert] = await Promise.all([
    client.auto_reply
      ? (phone.mobile
        ? sendTemplate(client, phone.intl, client.tpl_lead_ack, [firstName(name), lead.service || "הפנייה שלכם"], { kind: "lead_ack", leadId: lead.id })
        : Promise.resolve("skipped"))
      : Promise.resolve("off"),
    client.owner_alerts
      ? sendTemplate(client, client.owner_phone, client.tpl_owner_alert,
        [name, phone.local, lead.service || "-", [clip(lead.message, 400), photoNote].filter(Boolean).join(" · ") || "-",
          isTag(lead.source) ? sourceName(lead.source, await linkLabels(client.slug)) : sourceHe(lead.source)],
        { kind: "owner_alert", leadId: lead.id, buttonPayload: "done:" + lead.id })
      : Promise.resolve("off"),
  ]);
  try { await updateLead(lead.id, { auto_reply: autoReply, owner_alert: ownerAlert }); } catch (e) { console.error("update lead", e.message); }
  if (ownerAlert !== "sent" && ownerAlert !== "off") return { ok: false, id: lead.id, error: "alert_failed" };
  return { ok: true, id: lead.id, autoReply };
}

/* ---------------- CORS for the client sites ---------------- */

export function corsHeaders(req, client) {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  const own = (() => { try { return new URL(origin).host === new URL(req.url).host; } catch { return false; } })();
  if (!own && !(client && (client.allowed_origins || []).includes(origin))) return null;
  return { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" };
}

/* ---------------- reminders and the monthly report ---------------- */

export async function runReminders(now = new Date()) {
  const clients = await db("GET", "ls_clients?active=eq.true&package=eq.ai&reminders=eq.true&select=*");
  let sent = 0, failed = 0;
  for (const client of clients) {
    if (!inWorkingHours(client, now)) continue;
    try { // one client's error must not stop the others
      const before = new Date(now - client.remind_after_min * 60_000).toISOString();
      const notOlder = new Date(now - 7 * 86_400_000).toISOString(); // a week-old lead is the panel's job
      const leads = await db("GET",
        `ls_leads?client_slug=eq.${q(client.slug)}&status=eq.new&reminded_at=is.null&created_at=lte.${q(before)}&created_at=gte.${q(notOlder)}&select=*&order=created_at.asc&limit=20`);
      for (const lead of leads) {
        // Mark first, so a slow send can't make two runs remind twice.
        const claimed = await db("PATCH", `ls_leads?id=eq.${q(lead.id)}&reminded_at=is.null`, { reminded_at: now.toISOString() }, "return=representation");
        if (!claimed.length) continue;
        const r = await sendTemplate(client, client.owner_phone, client.tpl_owner_reminder,
          [lead.name, lead.phone, ago(lead.created_at, now), lead.service || "-"],
          { kind: "reminder", leadId: lead.id, buttonPayload: "done:" + lead.id });
        if (r === "sent") sent++;
        else { failed++; await db("PATCH", `ls_leads?id=eq.${q(lead.id)}`, { reminded_at: null }); } // try again next run
      }
    } catch (e) { failed++; console.error("reminders", client.slug, e.message); }
  }
  return { reminders: sent, failed };
}

const MONTHS_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

// month: "YYYY-MM". Default: the month that just ended, in Israel time.
export function monthRange(month, now = new Date()) {
  let y, m;
  if (month && /^\d{4}-\d{2}$/.test(month)) [y, m] = month.split("-").map(Number);
  else { const t = israelTime(now); y = t.month === 1 ? t.year - 1 : t.year; m = t.month === 1 ? 12 : t.month - 1; }
  const pad = (n) => String(n).padStart(2, "0");
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  // Midnight Israel time (UTC+2 in winter, +3 in summer), written with its offset.
  const offset = (yy, mm) => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" })
    .formatToParts(new Date(Date.UTC(yy, mm - 1, 1, 12))).find((p) => p.type === "timeZoneName").value.replace("GMT", "") || "+02:00";
  const start = `${y}-${pad(m)}-01T00:00:00${offset(y, m)}`, end = `${ny}-${pad(nm)}-01T00:00:00${offset(ny, nm)}`;
  return { key: `${y}-${pad(m)}`, first: `${y}-${pad(m)}-01`, start, end, label: `${MONTHS_HE[m - 1]} ${y}` };
}

export function summarise(leads) {
  const bySource = {}, byStatus = { new: 0, handled: 0, won: 0, lost: 0 }, byChannel = {};
  const waits = [];
  for (const l of leads) {
    bySource[l.source || "direct"] = (bySource[l.source || "direct"] || 0) + 1;
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    byChannel[l.channel] = (byChannel[l.channel] || 0) + 1;
    if (l.handled_at) waits.push((new Date(l.handled_at) - new Date(l.created_at)) / 60000);
  }
  waits.sort((a, b) => a - b);
  const median = waits.length ? Math.round(waits[Math.floor(waits.length / 2)]) : null;
  const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0];
  return {
    total: leads.length, handled: leads.length - byStatus.new, byStatus, bySource, byChannel,
    topSource: topSource ? topSource[0] : null, medianMinutesToHandle: median,
  };
}

/* ---------------- visits ---------------- */

// The date in Israel, YYYY-MM-DD.
export function israelDay(date = new Date()) {
  const t = israelTime(date);
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.date).padStart(2, "0")}`;
}

// One visit: a number for the day and the source, nothing about the person.
export async function recordVisit(client, input, now = new Date()) {
  let source = sourceOf(input);
  try { // a click from one page of the site to another is not a new source
    if (input.referrer && input.page && new URL(input.referrer).host === new URL(input.page).host) source = clip(input.source, 40).toLowerCase() || "direct";
  } catch { /* bad URL: keep what we have */ }
  await db("POST", "rpc/ls_add_visit", { p_slug: client.slug, p_day: israelDay(now), p_source: source || "direct" });
}

/* ---------------- what a period brought: the monthly report, the weekly update and the panel ---------------- */

// From start (inclusive) to end (exclusive), both ISO strings with their offset.
export async function periodStats(client, start, end) {
  const [leads, visits] = await Promise.all([
    db("GET", `ls_leads?client_slug=eq.${q(client.slug)}&created_at=gte.${q(start)}&created_at=lt.${q(end)}&select=status,source,channel,created_at,handled_at,auto_reply&limit=5000`),
    db("GET", `ls_visits?client_slug=eq.${q(client.slug)}&day=gte.${israelDay(new Date(start))}&day=lt.${israelDay(new Date(end))}&select=visits,source&limit=5000`),
  ]);
  const base = summarise(leads);
  const visitCount = visits.reduce((n, v) => n + (v.visits || 0), 0);
  const visitsBySource = {};
  for (const v of visits) visitsBySource[v.source || "direct"] = (visitsBySource[v.source || "direct"] || 0) + (v.visits || 0);
  return {
    ...base,
    visits: visitCount, visitsBySource,
    // The leads that would have been missed: they came when the business was closed.
    afterHours: leads.filter((l) => !inWorkingHours(client, new Date(l.created_at))).length,
    autoAnswered: leads.filter((l) => l.auto_reply === "sent").length,
    open: base.byStatus.new || 0,
    conversion: visitCount ? Math.round((leads.length / visitCount) * 1000) / 10 : null, // % of visits that became a lead
  };
}

export async function buildReport(client, month, { send = true, now = new Date() } = {}) {
  const r = monthRange(month, now);
  const data = { month: r.key, label: r.label, ...(await periodStats(client, r.start, r.end)) };
  let sent = "off";
  if (send && client.monthly_report && client.active) {
    // monthly_report: {{1}} month, {{2}} visits, {{3}} leads, {{4}} outside working hours, {{5}} handled, {{6}} top source
    sent = await sendTemplate(client, client.owner_phone, client.tpl_monthly_report,
      [r.label, String(data.visits), String(data.total), String(data.afterHours), String(data.handled), data.topSource ? sourceName(data.topSource, await linkLabels(client.slug)) : "-"], { kind: "report" });
  }
  await db("POST", "ls_reports?on_conflict=client_slug,month", { client_slug: client.slug, month: r.first, data, sent }, "resolution=merge-duplicates");
  return { ...data, sent };
}

// The weekly update, for owners who asked for it (ls_clients.weekly_report): the seven days that just ended.
export async function runWeeklyReports(now = new Date()) {
  const clients = await db("GET", "ls_clients?active=eq.true&package=eq.ai&weekly_report=eq.true&select=*");
  const end = new Date(`${israelDay(now)}T00:00:00${israelOffset(now)}`), start = new Date(end - 7 * 86_400_000);
  const out = [];
  for (const c of clients) {
    try {
      const d = await periodStats(c, start.toISOString(), end.toISOString());
      // weekly_report: {{1}} visits, {{2}} leads, {{3}} outside working hours, {{4}} still waiting
      const sent = await sendTemplate(c, c.owner_phone, c.tpl_weekly_report || "weekly_report",
        [String(d.visits), String(d.total), String(d.afterHours), String(d.open)], { kind: "weekly" });
      out.push({ client: c.slug, sent, visits: d.visits, total: d.total });
    } catch (e) { console.error("weekly", c.slug, e.message); out.push({ client: c.slug, error: e.message }); }
  }
  return out;
}

const israelOffset = (date) => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" })
  .formatToParts(date).find((p) => p.type === "timeZoneName").value.replace("GMT", "") || "+02:00";

export async function runMonthlyReports(month, now = new Date()) {
  const clients = await db("GET", "ls_clients?active=eq.true&package=eq.ai&select=*");
  const out = [];
  for (const c of clients) {
    try { out.push({ client: c.slug, ...(await buildReport(c, month, { now })) }); }
    catch (e) { console.error("report", c.slug, e.message); out.push({ client: c.slug, error: e.message }); }
  }
  return out;
}

// The privacy notice promises leads are kept up to two years. Runs with the monthly report.
export const RETENTION_DAYS = 730;
export async function deleteOldLeads(now = new Date()) {
  const cutoff = new Date(now - RETENTION_DAYS * 86_400_000).toISOString();
  const leads = await db("DELETE", `ls_leads?created_at=lt.${q(cutoff)}&select=id,photo`, undefined, "return=representation");
  await deleteLeadPhotos(leads.map((l) => l.photo).filter(Boolean));
  await db("DELETE", `ls_messages?created_at=lt.${q(cutoff)}`);
  return { deleted: leads.length };
}

// For an uptime monitor: problems in the last 24 hours, counts only, no personal data.
export async function healthCheck(now = new Date()) {
  const day = new Date(now - 86_400_000).toISOString(), stale = new Date(now - 10 * 60_000).toISOString();
  const [alerts, pending, messages] = await Promise.all([
    db("GET", `ls_leads?created_at=gte.${q(day)}&owner_alert=in.(failed,skipped)&select=client_slug`),
    db("GET", `ls_leads?created_at=gte.${q(day)}&created_at=lt.${q(stale)}&owner_alert=eq.pending&select=client_slug`),
    db("GET", `ls_messages?created_at=gte.${q(day)}&direction=eq.out&status=in.(failed,skipped)&select=client_slug,kind`),
  ]);
  const clients = [...new Set([...alerts, ...pending, ...messages].map((r) => r.client_slug))];
  return { ok: !alerts.length && !pending.length && !messages.length, ownerAlertsFailed: alerts.length, ownerAlertsStuck: pending.length, messagesFailed: messages.length, clients };
}

/* ---------------- panel access ---------------- */

// The admin key as pasted into Netlify, without the spaces or line break a paste can carry.
export const adminKey = () => String(process.env.LEADS_ADMIN_KEY || "").trim();

// Authorization: Bearer <slug>:<key>   or   Bearer admin:<LEADS_ADMIN_KEY>
export async function authorise(req) {
  const m = /^Bearer ([a-z0-9-]{2,40}):(\S{16,200})$/.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const [, who, key] = m;
  if (who === "admin") {
    const admin = adminKey();
    if (admin.length >= 16 && safeEqual(key, admin)) return { admin: true };
    // Lengths only, never the key: tells a bad paste in Netlify (spaces, a cut) from a wrong key.
    console.warn(`admin login refused: got ${key.length} characters, LEADS_ADMIN_KEY has ${admin.length}`);
    return null;
  }
  const client = await getClient(who);
  if (!client || !client.key_hash || !safeEqual(sha256(key), client.key_hash)) return null;
  return { admin: false, client };
}
