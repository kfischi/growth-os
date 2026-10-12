// Netlify Function: Meta calls this with WhatsApp events. GET/POST /api/wa-webhook
// In Meta: WhatsApp > Configuration > Webhook: this URL, the WA_VERIFY_TOKEN value, and subscribe to "messages".
// GET  verifies the webhook once. POST carries delivery statuses and incoming messages:
//   - the owner taps "טיפלתי" on an alert or a reminder: the lead is marked handled
//   - the owner writes "עסוק" / "פנוי" / "אוטומטי" / "סטטוס": the site's "available now" line changes
//   - a lead writes back: the message is logged and shown in the panel ("הסר" stops review requests)
//   - after "טיפלתי", if the business has review requests or testimonials on: the owner is asked, and one tap sends
//     the customer one request (a Google review, or a testimonial for the site through a private link)
//   - the owner taps "להסתיר" on a new testimonial: it comes off the site
import { json, configured, db, q, updateLead, sendText, validMetaSignature, safeEqual, clip, availability, availabilityCommand, setAvailability, firstName,
  sendButtons, sendTemplate, reviewOn, reviewBlocked, OPT_OUT, testimonialOn, testimonialBlocked, testimonialLink } from "../lib/leads.mjs";

async function clientByPhoneId(id) {
  const rows = await db("GET", `ls_clients?wa_phone_number_id=eq.${q(id)}&select=*`);
  return rows[0] || null;
}

// Meta may send statuses out of order. A status only moves forward: accepted > sent > delivered > read,
// and failed can replace anything but read.
const EARLIER = { sent: "accepted", delivered: "accepted,sent", read: "accepted,sent,delivered", failed: "accepted,sent,delivered" };

async function onStatus(s) {
  if (!EARLIER[s.status]) return;
  const error = s.errors && s.errors[0] ? clip(`${s.errors[0].code} ${s.errors[0].title || ""}`, 300) : null;
  const rows = await db("PATCH", `ls_messages?wa_id=eq.${q(s.id)}&status=in.(${EARLIER[s.status]})`,
    error ? { status: s.status, error } : { status: s.status }, "return=representation");
  // An owner alert that Meta accepted but couldn't deliver: mark the lead, so the panel and /api/health show it.
  const m = rows[0];
  if (s.status === "failed" && m && m.kind === "owner_alert" && m.lead_id) {
    await db("PATCH", `ls_leads?id=eq.${q(m.lead_id)}`, { owner_alert: "failed" });
  }
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
    // Mark first: it is safe to repeat, so a Meta retry after an error still marks the lead.
    const rows = await db("PATCH", `ls_leads?id=eq.${q(id)}&client_slug=eq.${q(client.slug)}&status=eq.new`,
      { status: "handled", handled_at: new Date().toISOString() }, "return=representation");
    const exists = rows.length || (await db("GET", `ls_leads?id=eq.${q(id)}&select=id`)).length;
    const fresh = await logInbound({ client_slug: client.slug, lead_id: exists ? id : null, kind: "owner_reply", from_phone: from, wa_id: m.id, body: { text, payload } });
    if (!fresh) return;
    // The owner just wrote, so a free text reply (or buttons) is allowed.
    const done = rows[0];
    const mobile = done && /^9725\d{8}$/.test(done.phone_intl);
    const canReview = mobile && reviewOn(client) && !(await reviewBlocked(client, done.phone_intl));
    const canTst = mobile && testimonialOn(client) && !(await testimonialBlocked(client, done.phone_intl));
    if (canReview || canTst) {
      if (canReview) await db("PATCH", `ls_leads?id=eq.${q(id)}&review=is.null`, { review: "asked" });
      if (canTst) await db("PATCH", `ls_leads?id=eq.${q(id)}&testimonial=is.null`, { testimonial: "asked" });
      const first = firstName(done.name);
      const [text, buttons] = canReview && canTst
        ? [`סומן כטופל: ${done.name}. לבקש מ${first} המלצה? באתר היא עולה מיד, ואפשר להסתיר אותה. זו הודעה אחת, פעם אחת.`,
          [{ id: "tst:" + id, title: "המלצה לאתר" }, { id: "review:" + id, title: "ביקורת בגוגל" }, { id: "noreview:" + id, title: "לא הפעם" }]]
        : canTst
          ? [`סומן כטופל: ${done.name}. לשלוח ל${first} בקשה לכתוב המלצה לאתר? היא עולה מיד, ואפשר להסתיר אותה. זו הודעה אחת, פעם אחת.`,
            [{ id: "tst:" + id, title: "כן, לשלוח" }, { id: "noreview:" + id, title: "לא הפעם" }]]
          : [`סומן כטופל: ${done.name}. לשלוח ל${first} בקשה לכתוב ביקורת בגוגל? זו הודעה אחת, פעם אחת.`,
            [{ id: "review:" + id, title: "כן, לשלוח" }, { id: "noreview:" + id, title: "לא הפעם" }]];
      await sendButtons(client, from, text, buttons, { kind: "owner_reply", leadId: id });
      return;
    }
    await sendText(client, from, done ? `סומן כטופל: ${done.name}.` : exists ? "הפנייה הזאת כבר סומנה." : "הפנייה הזאת כבר לא במערכת.", { kind: "owner_reply", leadId: exists ? id : null });
    return;
  }

  // The owner's answer: send the review request, or not. Only from "asked", so a retry never sends twice.
  const rv = from === client.owner_phone && /^(review|noreview|tst):([0-9a-f-]{36})$/.exec(payload || "");
  if (rv) {
    const id = rv[2], lead = `ls_leads?id=eq.${q(id)}&client_slug=eq.${q(client.slug)}`;
    const fresh = await logInbound({ client_slug: client.slug, lead_id: null, kind: "owner_reply", from_phone: from, wa_id: m.id, body: { text, payload } });
    if (!fresh) return;
    // One answer closes both questions: whatever wasn't picked is skipped.
    const [r1] = await db("PATCH", `${lead}&review=eq.asked`, { review: rv[1] === "review" ? "sent" : "skipped" }, "return=representation");
    const [t1] = await db("PATCH", `${lead}&testimonial=eq.asked`, { testimonial: rv[1] === "tst" ? "sent" : "skipped" }, "return=representation");
    const l = rv[1] === "review" ? r1 : rv[1] === "tst" ? t1 : r1 || t1;
    if (!l) return void (await sendText(client, from, "כבר טיפלנו בזה.", { kind: "owner_reply" }));
    if (rv[1] === "noreview") return void (await sendText(client, from, "בסדר, לא נשלח.", { kind: "owner_reply", leadId: id }));
    if (rv[1] === "tst") {
      // testimonial_request: {{1}} first name, {{2}} the business, {{3}} the private link. Ends with how to opt out.
      const r = testimonialOn(client) ? await sendTemplate(client, l.phone_intl, client.tpl_testimonial_request, [firstName(l.name), client.name, testimonialLink(id)], { kind: "testimonial", leadId: id }) : "off";
      if (r !== "sent") await db("PATCH", `ls_leads?id=eq.${q(id)}`, { testimonial: "failed" });
      await sendText(client, from, r === "sent" ? `נשלח ל${firstName(l.name)}. כשיכתוב, ההמלצה תעלה לאתר ותגיע גם אליכם לכאן.` : "לא הצלחנו לשלוח הפעם. הפנייה מסומנת בלוח.", { kind: "owner_reply", leadId: id });
      return;
    }
    // review_request: {{1}} first name, {{2}} the business, {{3}} the Google review link. Ends with how to opt out.
    const r = reviewOn(client) ? await sendTemplate(client, l.phone_intl, client.tpl_review_request, [firstName(l.name), client.name, client.review_url], { kind: "review", leadId: id }) : "off";
    if (r !== "sent") await db("PATCH", `ls_leads?id=eq.${q(id)}`, { review: "failed" });
    await sendText(client, from, r === "sent" ? `נשלח ל${firstName(l.name)}. תודה!` : "לא הצלחנו לשלוח הפעם. הפנייה מסומנת בלוח.", { kind: "owner_reply", leadId: id });
    return;
  }

  // The owner hides a new testimonial from the site, straight from the alert.
  const ht = from === client.owner_phone && /^hidetst:([0-9a-f-]{36})$/.exec(payload || "");
  if (ht) {
    const fresh = await logInbound({ client_slug: client.slug, lead_id: null, kind: "owner_reply", from_phone: from, wa_id: m.id, body: { text, payload } });
    if (!fresh) return;
    const rows = await db("PATCH", `ls_testimonials?id=eq.${q(ht[1])}&client_slug=eq.${q(client.slug)}`, { hidden: true }, "return=representation");
    await sendText(client, from, rows.length ? "ההמלצה הוסתרה מהאתר. אפשר להחזיר אותה בלוח הפניות." : "לא מצאנו את ההמלצה הזאת.", { kind: "owner_reply" });
    return;
  }

  // The owner writes "עסוק" or "פנוי": the site shows it (0007_availability.sql).
  const cmd = from === client.owner_phone && m.type === "text" ? availabilityCommand(text) : null;
  if (cmd) {
    const fresh = await logInbound({ client_slug: client.slug, lead_id: null, kind: "owner_reply", from_phone: from, wa_id: m.id, body: { text: clip(text, 100) } });
    if (!fresh) return;
    const now = cmd.status ? availability(client) : await setAvailability(client, cmd);
    const tip = now.state === "busy" ? "כשתסיימו, כתבו \"פנוי\"." : now.state === "free" ? "כשתצאו לעבודה, כתבו \"עסוק\"." : "\"עסוק\" או \"פנוי\" משנים את זה.";
    await sendText(client, from, `באתר כתוב עכשיו: ${now.text} ${tip}`, { kind: "owner_reply" });
    return;
  }

  const lead = (await db("GET", `ls_leads?client_slug=eq.${q(client.slug)}&phone_intl=eq.${q(from)}&select=id&order=created_at.desc&limit=1`))[0];
  const fresh = await logInbound({ client_slug: client.slug, lead_id: lead ? lead.id : null, kind: from === client.owner_phone ? "owner_reply" : "inbound", from_phone: from, wa_id: m.id, body: { type: m.type, text: clip(text, 1000) } });
  if (fresh && lead) await updateLead(lead.id, { last_inbound_at: new Date().toISOString() });
  // "הסר": no more review requests to this number from this business, ever.
  if (fresh && lead && from !== client.owner_phone && m.type === "text" && OPT_OUT.test(String(text).trim())) {
    await db("PATCH", `ls_leads?client_slug=eq.${q(client.slug)}&phone_intl=eq.${q(from)}`, { review: "optout" });
    await sendText(client, from, "הוסרתם. לא תקבלו מאיתנו הודעות כאלה יותר.", { kind: "optout", leadId: lead.id });
  }
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
