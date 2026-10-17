// Netlify Function: a customer writes a testimonial for the business's site (0010_testimonials.sql).
//   GET  /r/<lead>.<signature>   the private form, from the link in the testimonial_request message
//   POST /api/testimonial        { token, name, text, stars? }  -> { ok, site }
// Only a link the system sent works, and only once per enquiry. What is written shows on the site at once
// (/api/testimonials/<slug>); the owner gets it on WhatsApp with "להסתיר", and can hide it in the panel too.
import { json, configured, db, q, getClient, rateLimiter, clientIp, testimonialOn, testimonialToken, checkTestimonial, sendButtons, sendTemplate, firstName, siteUrl, clip } from "../lib/leads.mjs";

const limited = rateLimiter(20, 10 * 60 * 1000);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const ERR = {
  name: "כתבו שם, לפחות שתי אותיות.", short: "כמה מילים נוספות, בבקשה.", long: "עד 400 תווים.", stars: "דירוג בין 1 ל-5.",
  contact: "בלי קישורים, מיילים או מספרי טלפון. ההמלצה מופיעה באתר כמו שהיא.",
};

// The enquiry behind a link, with its business, while the invitation is open.
async function invitation(token) {
  const id = testimonialToken(token);
  if (!id) return null;
  const lead = (await db("GET", `ls_leads?id=eq.${q(id)}&select=id,client_slug,name,testimonial`))[0];
  if (!lead) return null;
  const client = await getClient(lead.client_slug);
  if (!client || !client.active || !testimonialOn(client)) return null;
  return { lead, client };
}

const page = (title, body) => new Response(`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${h(title)}</title>
<style>
  :root { --ink: #1d1b2e; --soft: #5d5a72; --line: #dcd8e8; --bg: #f6f5fb; --accent: #0f7a6c; --err: #9b2c2c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 400 17px/1.6 system-ui, "Segoe UI", Arial, sans-serif; }
  main { max-width: 520px; margin: 0 auto; padding: 32px 16px 56px; }
  h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 6px; }
  p { margin: 0 0 18px; color: var(--soft); }
  form { display: grid; gap: 14px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; }
  label { display: grid; gap: 6px; font-weight: 600; }
  input, textarea { font: inherit; border: 1.5px solid var(--line); border-radius: 10px; padding: 10px 12px; background: #fff; color: var(--ink); width: 100%; }
  textarea { min-height: 140px; resize: vertical; }
  input:focus-visible, textarea:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 6px; }
  legend { font-weight: 600; padding: 0; margin-bottom: 6px; }
  .stars { display: flex; gap: 6px; flex-direction: row-reverse; justify-content: flex-end; }
  .stars input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .stars label { font-size: 30px; line-height: 1; color: #c9c4d6; cursor: pointer; font-weight: 400; }
  .stars input:checked ~ label, .stars label:hover, .stars label:hover ~ label { color: var(--accent); }
  .stars input:focus-visible + label { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  .note { font-size: .9rem; color: var(--soft); margin: 0; }
  button { font: 700 17px system-ui, sans-serif; border: 0; border-radius: 999px; padding: 14px 20px; background: var(--accent); color: #fff; cursor: pointer; }
  button[disabled] { opacity: .6; }
  .err { color: var(--err); font-weight: 600; margin: 0; min-height: 1.2em; }
  .done { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 22px 18px; }
  .done a { color: var(--accent); font-weight: 700; }
</style>
</head>
<body><main>${body}</main></body>
</html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" } });

const closed = () => page("הקישור כבר לא פעיל", `<h1>הקישור כבר לא פעיל</h1><p>כבר כתבתם המלצה מהקישור הזה, או שהוא לא תקין. תודה!</p>`);

export default async (req, context) => {
  if (!configured()) return json({ error: "not_configured" }, 503);
  const ip = clientIp(req);

  if (req.method === "GET") {
    const inv = await invitation(context.params && context.params.token).catch(() => null);
    if (!inv || inv.lead.testimonial !== "sent") return closed();
    const { lead, client } = inv;
    return page(`המלצה ל${client.name}`, `
<h1>כמה מילים על ${h(client.name)}?</h1>
<p>מה עשו, ואיך היה. ההמלצה תופיע באתר של העסק עם השם שתכתבו כאן.</p>
<form id="f" novalidate>
  <label>מה תרצו לכתוב?<textarea id="text" maxlength="400" required placeholder="למשל: הגיע תוך שעה, פתח את הסתימה בלי לשבור כלום, ומחיר כמו שסיכמנו."></textarea></label>
  <label>השם שיופיע<input id="name" maxlength="30" required value="${h(firstName(lead.name))}" autocomplete="given-name"></label>
  <fieldset><legend>דירוג (לא חובה)</legend>
    <div class="stars">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="stars" id="s${n}" value="${n}"><label for="s${n}" aria-label="${n} מתוך 5">★</label>`).join("")}</div>
  </fieldset>
  <p class="note">בלי קישורים, מיילים או מספרי טלפון.</p>
  <p class="err" id="err" role="alert"></p>
  <button id="go" type="submit">לפרסם את ההמלצה</button>
</form>
<script>
  const f = document.getElementById("f"), err = document.getElementById("err"), go = document.getElementById("go");
  f.addEventListener("submit", async (e) => {
    e.preventDefault(); err.textContent = ""; go.disabled = true;
    const s = f.querySelector("input[name=stars]:checked");
    try {
      const r = await fetch("/api/testimonial", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: ${JSON.stringify(context.params.token).replace(/</g, "\\u003c")}, name: document.getElementById("name").value, text: document.getElementById("text").value, stars: s ? Number(s.value) : null }) });
      const d = await r.json();
      if (r.ok && d.ok) {
        document.querySelector("main").innerHTML = '<div class="done"><h1>תודה!</h1><p>ההמלצה שלכם כבר באתר.</p>' + (d.site ? '<p><a href="' + d.site.replace(/"/g, "") + '#testimonials">לראות אותה באתר</a></p>' : "") + "</div>";
        return;
      }
      err.textContent = d.message || "לא הצלחנו לשמור. נסו שוב.";
    } catch (x) { err.textContent = "לא הצלחנו לשמור. בדקו את החיבור ונסו שוב."; }
    go.disabled = false;
  });
</script>`);
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (limited(ip)) return json({ error: "rate_limited", message: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." }, 429);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "bad_json" }, 400);
  const inv = await invitation(body.token);
  if (!inv) return json({ error: "closed", message: "הקישור כבר לא פעיל." }, 410);
  const chk = checkTestimonial(body);
  if (chk.error) return json({ error: chk.error, message: ERR[chk.error] }, 422);
  const { lead, client } = inv;
  // Store it first, so a failure never closes the link with the text lost. lead_id is unique: a second press is refused.
  let t;
  try { [t] = await db("POST", "ls_testimonials", { client_slug: client.slug, lead_id: lead.id, ...chk.row }, "return=representation"); }
  catch (e) { return json({ error: "closed", message: "כבר כתבתם המלצה מהקישור הזה. תודה!" }, 410); }
  // Then close the invitation. If it was already closed (a second press that got past the unique check), take it back.
  const shut = await db("PATCH", `ls_leads?id=eq.${q(lead.id)}&testimonial=eq.sent`, { testimonial: "done" }, "return=representation");
  if (!shut.length) {
    await db("DELETE", `ls_testimonials?id=eq.${q(t.id)}`).catch(() => {});
    return json({ error: "closed", message: "כבר כתבתם המלצה מהקישור הזה. תודה!" }, 410);
  }
  // The owner sees it right away, and can take it off the site with one tap. Buttons work only within 24 hours of the
  // owner's last message to the number; otherwise the owner alert template carries it, and the panel hides it.
  const stars = chk.row.stars ? " " + "★".repeat(chk.row.stars) : "";
  const r = await sendButtons(client, client.owner_phone, `המלצה חדשה עלתה לאתר${stars}:\n"${clip(chk.row.body, 400)}"\n${chk.row.name}`,
    [{ id: "hidetst:" + t.id, title: "להסתיר" }], { kind: "owner_reply", leadId: lead.id }).catch(() => "failed");
  if (r !== "sent" && client.owner_alerts) {
    await sendTemplate(client, client.owner_phone, client.tpl_owner_alert,
      [chk.row.name || "-", "-", "המלצה לאתר", { text: `המלצה חדשה עלתה לאתר${stars}: "${clip(chk.row.body, 300)}". להסתרה: בלוח הפניות.`, max: 480 }, "אתר"],
      { kind: "owner_alert", leadId: lead.id }).catch(() => {});
  }
  return json({ ok: true, site: siteUrl(client) });
};

export const config = { path: ["/r/:token", "/api/testimonial"] };
