// Netlify Function: Meta calls this with WhatsApp events. GET/POST /api/wa-webhook
// In Meta: WhatsApp > Configuration > Webhook: this URL, the WA_VERIFY_TOKEN value, and subscribe to "messages".
// GET  verifies the webhook once. POST carries delivery statuses and incoming messages:
//   - the owner taps "טיפלתי" on an alert or a reminder: the lead is marked handled
//   - a lead writes back: the message is logged and shown in the panel
import { json, configured, db, q, updateLead, sendText, validMetaSignature, safeEqual, clip } from "../lib/leads.mjs";

async function clientByPhoneId(id) {
  const rows = await db("GET", `ls_clients?wa_phone_number_id=eq.${q(id)}&select=*`);
  return rows[0] || null;
}

async function onStatus(s) {
  const error = s.errors && s.errors[0] ? clip(`${s.errors[0].code} ${s.errors[0].title || ""}`, 300) : null;
  await db("PATCH", `ls_messages?wa_id=eq.${q(s.id)}`, error ? { status: s.status, error } : { status: s.status });
}

// Logs an incoming message once. Meta may deliver the same event again; then this returns false.
async function logInbound(row) {
  const rows = await db("POST", "ls_messages?on_conflict=wa_id", { ...row, direction: "in", status: "received" }, "resolution=ignore-duplicates,return=representation");
  return rows.length > 0;
}

async function onMessage(client, m) {
  const from = m.from;
  const text = m.type === "text" ? m.text.body : m.type === "button" ? m.button.text
    : m.type === "interactive" ? (m.interactive.button_reply || m.interactive.list_reply || {}).title : `[${m.type}]`;
  const payload = m.type === "button" ? m.button.payload : m.type === "interactive" && m.interactive.button_reply ? m.interactive.button_reply.id : "";

  // Owner pressed "טיפלתי" on an alert or a reminder.
  if (from === client.owner_phone && /^done:[0-9a-f-]{36}$/.test(payload || "")) {
    const id = payload.slice(5);
    const fresh = await logInbound({ client_slug: client.slug, lead_id: id, kind: "owner_reply", from_phone: from, wa_id: m.id, body: { text, payload } });
    if (!fresh) return;
    const rows = await db("PATCH", `ls_leads?id=eq.${q(id)}&client_slug=eq.${q(client.slug)}&status=eq.new`,
      { status: "handled", handled_at: new Date().toISOString() }, "return=representation");
    // The owner just wrote, so a free text reply is allowed.
    await sendText(client, from, rows.length ? `סומן כטופל: ${rows[0].name}.` : "הפנייה הזאת כבר סומנה.", { kind: "owner_reply", leadId: id });
    return;
  }

  const lead = (await db("GET", `ls_leads?client_slug=eq.${q(client.slug)}&phone_intl=eq.${q(from)}&select=id&order=created_at.desc&limit=1`))[0];
  const fresh = await logInbound({ client_slug: client.slug, lead_id: lead ? lead.id : null, kind: from === client.owner_phone ? "owner_reply" : "inbound", from_phone: from, wa_id: m.id, body: { type: m.type, text: clip(text, 1000) } });
  if (fresh && lead) await updateLead(lead.id, { last_inbound_at: new Date().toISOString() });
}

export default async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && process.env.WA_VERIFY_TOKEN &&
      safeEqual(url.searchParams.get("hub.verify_token") || "", process.env.WA_VERIFY_TOKEN);
    return ok ? new Response(url.searchParams.get("hub.challenge") || "", { status: 200 }) : new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (!validMetaSignature(raw, req.headers.get("x-hub-signature-256"))) return json({ error: "bad_signature" }, 401);
  if (!configured()) return json({ error: "not_configured" }, 503);

  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }
  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        if (change.field !== "messages" || !v.metadata) continue;
        for (const s of v.statuses || []) await onStatus(s);
        if (!(v.messages || []).length) continue;
        const client = await clientByPhoneId(v.metadata.phone_number_id);
        if (!client) continue;
        for (const m of v.messages) await onMessage(client, m);
      }
    }
  } catch (e) {
    // Answer 500 so Meta retries the delivery later.
    console.error("wa-webhook", e.message);
    return json({ error: "server" }, 500);
  }
  return json({ ok: true });
};

export const config = { path: "/api/wa-webhook" };
