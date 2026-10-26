// The owner's voice note on WhatsApp, turned into the same commands the owner can type (wa-webhook.mjs).
// The owner speaks ("תעלה את הסתימה ל-400, ואני עסוק עד הערב"), Google's model writes down what it heard and the
// commands it understood, our own parsers (ownerCommand, availabilityCommand) check every line, and nothing changes
// on the site until the owner taps "לאשר". The model never writes to the site: a line our parsers reject is dropped.
//   GEMINI_API_KEY        Google AI Studio key (already used by the builder's "ליצור תמונת רקע"); without it,
//                         the owner is asked to type the command instead
//   GEMINI_VOICE_MODEL    optional, default gemini-2.5-flash
// The audio is fetched from Meta and sent to Google once; we never store it, only the transcript (in ls_messages).
// Use a paid Gemini API key: on the free tier Google may use what it receives to improve its models.
import { db, q, clip, waToken, GRAPH, ownerCommand, availabilityCommand } from "./leads.mjs";

export const voiceOn = () => Boolean(process.env.GEMINI_API_KEY);
export const VOICE_MAX_BYTES = 4 * 1024 * 1024; // a WhatsApp voice note is about 100 KB a minute
export const VOICE_MAX_COMMANDS = 5;
export const VOICE_TTL_MIN = 30; // "לאשר" works for this long after the note

// Meta keeps incoming media behind its own URL: first the media's details, then the file, both with the token.
export async function fetchMedia(client, mediaId) {
  const auth = { authorization: "Bearer " + waToken(client) };
  const meta = await fetch(`${GRAPH()}/${encodeURIComponent(mediaId)}`, { headers: auth, signal: AbortSignal.timeout(8000) });
  if (!meta.ok) throw new Error("media info " + meta.status);
  const info = await meta.json();
  if (!info.url || Number(info.file_size) > VOICE_MAX_BYTES) throw new Error("media too large or missing");
  const file = await fetch(info.url, { headers: auth, signal: AbortSignal.timeout(15000) });
  if (!file.ok) throw new Error("media file " + file.status);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > VOICE_MAX_BYTES) throw new Error("media too large");
  return { buf, mime: String(info.mime_type || "audio/ogg").split(";")[0].trim() };
}

// The services on the published site, so the model can name the one the owner meant.
export async function serviceNames(client) {
  const d = (await db("GET", `ls_drafts?published_slug=eq.${q(client.slug)}&status=eq.published&select=content&limit=1`))[0];
  return ((d && d.content && d.content.services) || []).map((s) => clip(s.name, 46)).filter(Boolean).slice(0, 30);
}

const PROMPT = (services) => `זו הודעה קולית שבעל עסק שלח למספר הוואטסאפ של העסק שלו, כדי לעדכן את האתר.
1. transcript: כתבו מילה במילה את מה שנאמר, בשפה שבה נאמר.
2. commands: הפכו כל בקשה ברורה לשורה אחת, בדיוק באחת הצורות האלה בלבד:
   מחיר <שם השירות> <מספר>-<מספר>      (טווח מחיר, למשל: מחיר פתיחת סתימה 350-550)
   מחיר <שם השירות> <מספר>             (מחיר אחד, כשלא נאמר טווח)
   מחיר <שם השירות> מ-<מספר>           (מחיר התחלתי, "החל מ")
   מחיר <שם השירות> בלי מחיר           (להוריד מחיר)
   עסוק <שעות>   ·   פנוי   ·   חירום <שעות>   ·   אוטומטי      (הזמינות באתר; שעות: מספר שלם מ-1 עד 12)
   למד: <משפט קצר>                      (כל מידע אחר ללקוחות, למשל חופשה: "למד: בחופש עד יום ראשון, חוזרים לעבוד ביום שני")
${services.length ? `שמות השירותים באתר (השתמשו בשם המדויק מהרשימה): ${services.join(" | ")}` : "אין רשימת שירותים: השתמשו בשם שבעל העסק אמר."}
מספרים תמיד בספרות, בלי פסיקים ("ארבע מאות" הוא 400).
אל תמציאו שום דבר שלא נאמר. על שאלה, ברכה או משהו לא ברור לא כותבים שורה. אם אין בקשה ברורה, commands ריק.`;

// One call to Gemini with the audio inline and a JSON schema for the answer.
export async function transcribe({ buf, mime }, services = []) {
  const model = process.env.GEMINI_VOICE_MODEL || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT(services) }, { inline_data: { mime_type: mime, data: buf.toString("base64") } }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { transcript: { type: "STRING" }, commands: { type: "ARRAY", items: { type: "STRING" } } }, required: ["transcript", "commands"] },
      },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error("gemini " + res.status);
  const data = await res.json();
  const text = (((data.candidates || [])[0] || {}).content || { parts: [] }).parts.map((p) => p.text || "").join("");
  const out = JSON.parse(text);
  return { transcript: clip(String(out.transcript || "").replace(/\s+/g, " ").trim(), 600), lines: Array.isArray(out.commands) ? out.commands.map(String) : [] };
}

// Only lines our own parsers accept, once each, at most five, and only the ones that change something.
export function checkLines(lines) {
  const seen = new Set(), out = [];
  for (const raw of lines) {
    const line = String(raw || "").trim().replace(/\s+/g, " ");
    if (!line || seen.has(line)) continue;
    const cmd = availabilityCommand(line) || ownerCommand(line);
    if (!cmd || cmd.status || cmd.prices || cmd.notes) continue;
    seen.add(line); out.push(line);
    if (out.length === VOICE_MAX_COMMANDS) break;
  }
  return out;
}

// What the owner reads before "לאשר", one line per command.
export function describe(line) {
  const a = availabilityCommand(line);
  const forH = (h) => Number(h) === 1 ? "לשעה" : `ל-${h} שעות`;
  if (a) return a.avail === "busy" ? `באתר: באמצע עבודה, ${forH(a.hours)}` : a.avail === "free" ? "באתר: פנויים עכשיו"
    : a.avail === "urgent" ? `באתר: זמינים לקריאות דחופות, ${forH(a.hours)}` : "באתר: חזרה לשעות הרגילות";
  const c = ownerCommand(line);
  if (c && c.price) return `מחיר ${c.price.service}: ${c.price.value}`;
  if (c && c.learn) return `הצ׳אט יידע: ${c.learn}`;
  if (c && c.forget) return `למחוק את הערה מספר ${c.forget}`;
  return line;
}
