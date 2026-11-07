// The watchdog (functions/watchdog.mjs, every hour, and /api/health?run=1): checks every connection the lead system
// and the builder depend on, from inside Netlify, with the real keys, without changing anything or spending money:
//   Supabase      the database answers, every table and column the migrations make exists, the buckets answer
//   WhatsApp      the webhook secrets are set, and each active business's number answers with its token
//   Claude        the key works (the free model list)
//   Gemini        the key works, when one is set (optional)
//   GitHub        the token can read the publish branch, and doesn't expire within 14 days
//   Netlify       the hosting token works
//   Grow          its settings are there (there is no safe call to try)
//   schedules     the reminders ran in the last 40 minutes, the billing in the last 26 hours
// Each check is { name, ok, warn?, detail }. A missing optional key is a note, not a failure. Results are kept in
// ls_heartbeats (0024_heartbeats.sql) for /api/health, and when something newly breaks כפיר gets one WhatsApp alert.
import { db, q, clip, waToken, GRAPH, schemaCheck, storageCheck, sendTemplate, getClient } from "./leads.mjs";

const T = 8000; // each outside call fails fast
const ok = (name, detail = "") => ({ name, ok: true, detail });
const bad = (name, detail) => ({ name, ok: false, detail: clip(String(detail), 160) });
const note = (name, detail) => ({ name, ok: true, warn: true, detail });
const get = (url, headers = {}) => fetch(url, { headers, signal: AbortSignal.timeout(T) });

export async function checkSupabase() {
  try {
    await db("GET", "ls_clients?select=slug&limit=1");
    const [missing, buckets] = await Promise.all([schemaCheck(), storageCheck()]);
    if (missing.length) return bad("supabase", "חסרות בטבלאות: " + missing.slice(0, 6).join(", ") + " (מיגרציה שלא הורצה)");
    if (buckets.length) return bad("supabase", "האחסון לא עונה: " + buckets.join(", "));
    return ok("supabase");
  } catch (e) { return bad("supabase", "המסד לא עונה: " + e.message); }
}

export async function checkWhatsApp() {
  const out = [];
  if (!process.env.WA_APP_SECRET) out.push(bad("whatsapp-webhook", "חסר WA_APP_SECRET: כל הודעה נכנסת נדחית (טיפלתי, פקודות, תשובות)"));
  else if (!process.env.WA_VERIFY_TOKEN) out.push(note("whatsapp-webhook", "חסר WA_VERIFY_TOKEN: אי אפשר לאמת את ה-webhook מחדש ב-Meta"));
  else out.push(ok("whatsapp-webhook"));
  const clients = await db("GET", "ls_clients?active=eq.true&package=eq.ai&select=slug,wa_phone_number_id").catch(() => []);
  for (const c of clients) {
    const name = "whatsapp:" + c.slug;
    if (!c.wa_phone_number_id) { out.push(note(name, "אין מספר וואטסאפ מחובר: ההודעות לא יוצאות, והאתר מעביר לוואטסאפ רגיל")); continue; }
    const token = waToken(c);
    if (!token) { out.push(bad(name, `חסר WA_TOKEN_${c.slug.toUpperCase().replace(/-/g, "_")}`)); continue; }
    try {
      const r = await get(`${GRAPH()}/${encodeURIComponent(c.wa_phone_number_id)}?fields=display_phone_number,quality_rating,verified_name`, { authorization: "Bearer " + token });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) out.push(bad(name, `Meta דחתה את הטוקן או המספר (${r.status}${d.error && d.error.code ? ", קוד " + d.error.code : ""})`));
      else if (d.quality_rating === "RED") out.push(note(name, "דירוג האיכות של המספר אדום ב-Meta: יש סיכון לחסימה"));
      else out.push(ok(name, d.display_phone_number || ""));
    } catch (e) { out.push(bad(name, "Meta לא עונה: " + e.message)); }
  }
  return out;
}

export async function checkClaude() {
  if (!process.env.ANTHROPIC_API_KEY) return bad("claude", "חסר ANTHROPIC_API_KEY: הבונה לא עובד והצ׳אטים עונים מתסריט");
  try {
    const r = await get("https://api.anthropic.com/v1/models?limit=1", { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" });
    return r.ok ? ok("claude") : bad("claude", `המפתח נדחה (${r.status})`);
  } catch (e) { return bad("claude", "Anthropic לא עונה: " + e.message); }
}

export async function checkGemini() {
  if (!process.env.GEMINI_API_KEY) return note("gemini", "אין GEMINI_API_KEY: הודעות קוליות ותמונת רקע כבויות");
  try {
    const r = await get("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { "x-goog-api-key": process.env.GEMINI_API_KEY });
    return r.ok ? ok("gemini") : bad("gemini", `המפתח נדחה (${r.status})`);
  } catch (e) { return bad("gemini", "Google לא עונה: " + e.message); }
}

export async function checkGitHub(now = new Date()) {
  if (!process.env.GITHUB_TOKEN) return bad("github", "חסר GITHUB_TOKEN: אי אפשר לפרסם אתרים");
  const repo = process.env.GITHUB_REPO || "kfischi/growth-os", branch = process.env.GITHUB_BRANCH || "claude/multitenant-business-os-9y3vc1";
  try {
    const r = await get(`https://api.github.com/repos/${repo}/branches/${encodeURIComponent(branch)}`, { authorization: "Bearer " + process.env.GITHUB_TOKEN, accept: "application/vnd.github+json", "user-agent": "multi-landing-watchdog" });
    if (!r.ok) return bad("github", `אין גישה לענף ${branch} (${r.status})`);
    const exp = r.headers.get("github-authentication-token-expiration");
    const days = exp ? (new Date(exp.replace(" UTC", "Z").replace(" ", "T")) - now) / 86_400_000 : null;
    if (days !== null && days < 14) return note("github", `הטוקן פג בעוד ${Math.max(0, Math.floor(days))} ימים: לחדש אותו ב-GitHub ולעדכן ב-Netlify`);
    return ok("github", branch);
  } catch (e) { return bad("github", "GitHub לא עונה: " + e.message); }
}

export async function checkNetlify() {
  if (!process.env.NETLIFY_TOKEN) return note("netlify", "אין NETLIFY_TOKEN: אתרי לקוחות עולים ידנית");
  try {
    const r = await get("https://api.netlify.com/api/v1/user", { authorization: "Bearer " + process.env.NETLIFY_TOKEN });
    return r.ok ? ok("netlify") : bad("netlify", `הטוקן נדחה (${r.status})`);
  } catch (e) { return bad("netlify", "Netlify לא עונה: " + e.message); }
}

export function checkGrow() {
  if (process.env.GROW_SANDBOX) return bad("grow", "GROW_SANDBOX מוגדר: תשלומים אמיתיים לא עוברים");
  if (!process.env.GROW_PAGE_CODE || !process.env.GROW_USER_ID) return note("grow", "Grow לא מוגדר: התשלום עובר בקישור, וכפיר מסמן ׳שולם׳");
  return ok("grow");
}

// When each scheduled function last ran (they write ls_heartbeats at the end of a run).
export const SCHEDULES = { reminders: 40, billing: 26 * 60 };
export async function checkSchedules(now = new Date()) {
  const rows = await db("GET", "ls_heartbeats?select=name,at,ok,detail").catch(() => null);
  if (!rows) return [note("schedules", "אין טבלת ls_heartbeats (0024_heartbeats.sql): אי אפשר לדעת אם התזמונים רצים")];
  return Object.entries(SCHEDULES).map(([name, max]) => {
    const r = rows.find((x) => x.name === name);
    if (!r) return note("schedule:" + name, "עוד לא רץ מאז שהוספנו את הבדיקה");
    const min = Math.round((now - new Date(r.at)) / 60_000);
    if (min > max) return bad("schedule:" + name, `לא רץ כבר ${min} דקות`);
    return r.ok ? ok("schedule:" + name) : bad("schedule:" + name, "הריצה האחרונה נכשלה: " + clip(String((r.detail && r.detail.error) || ""), 120));
  });
}

export async function runWatchdog(now = new Date()) {
  const results = (await Promise.all([checkSupabase(), checkWhatsApp(), checkClaude(), checkGemini(), checkGitHub(now), checkNetlify(), checkGrow(), checkSchedules(now)])).flat();
  const failed = results.filter((r) => !r.ok);
  const prev = (await db("GET", "ls_heartbeats?name=eq.watchdog&select=detail").catch(() => []))[0];
  const before = new Set(((prev && prev.detail && prev.detail.failed) || []));
  const fresh = failed.filter((r) => !before.has(r.name));
  await heartbeat("watchdog", !failed.length, { failed: failed.map((r) => r.name), results }, now);
  if (fresh.length) await alertKfir(fresh).catch((e) => console.error("watchdog alert", e.message));
  return { ok: !failed.length, failed: failed.map((r) => r.name), warn: results.filter((r) => r.warn).map((r) => r.name), results };
}

// One WhatsApp alert to כפיר per newly broken connection (the same failure isn't repeated every hour).
async function alertKfir(fresh) {
  const k = await getClient(process.env.BUILDER_ALERT_CLIENT || "kfir");
  if (!k || !k.owner_phone || !k.wa_phone_number_id) return;
  const text = "בדיקת החיבורים מצאה תקלה: " + fresh.map((r) => `${r.name}: ${r.detail}`).join(" · ");
  await sendTemplate(k, k.owner_phone, k.tpl_owner_alert, ["בדיקת מערכת", "-", "תקלה בחיבור", { text: clip(text, 470), max: 480 }, "שומר"], { kind: "owner_alert" });
}

// A scheduled function's last run: name, when, and whether it was well. Never throws.
export async function heartbeat(name, isOk, detail = null, now = new Date()) {
  await db("POST", "ls_heartbeats?on_conflict=name", { name, at: now.toISOString(), ok: !!isOk, detail }, "resolution=merge-duplicates").catch((e) => console.error("heartbeat", name, e.message));
}

// For /api/health: the watchdog's last results, and whether the watchdog itself still runs (every hour).
export async function watchdogStatus(now = new Date()) {
  const r = (await db("GET", "ls_heartbeats?name=eq.watchdog&select=at,ok,detail").catch(() => []))[0];
  if (!r) return { ran: false };
  const age = Math.round((now - new Date(r.at)) / 60_000);
  return { ran: true, at: r.at, ageMin: age, stale: age > 130, ok: r.ok, failed: (r.detail && r.detail.failed) || [] };
}
