// The live נציג AI on a demo page (/api/demo-chat/<demo>) against the fake Anthropic of builder-fakes.mjs.
// Run: node scripts/tests/demo-chat.test.mjs
import assert from "node:assert/strict";
import { ai, aiCalls, T, DEF } from "./builder-fakes.mjs";

const fn = (await import(new URL("../../demos/netlify/functions/demo-chat.mjs", import.meta.url).href)).default;
const SITE = "https://service-pro-web.netlify.app";
const call = async (demo, body, { origin = SITE, ip = "8.8.8.1" } = {}) => {
  const headers = { "content-type": "application/json", "x-nf-client-connection-ip": ip };
  if (origin) headers.origin = origin;
  const r = await fn(new Request(SITE + "/api/demo-chat/" + demo, { method: "POST", headers, body: JSON.stringify(body) }), { params: { demo } });
  return { status: r.status, ...(await r.json()) };
};
const ask = (text) => ({ messages: [{ role: "user", content: text }] });

// an answer from the business's own facts
ai.queue.push("סתימה עולה בדרך כלל 250 עד 450 ₪. המחיר הסופי אחרי אבחון.");
let r = await call("plumber", ask("כמה עולה סתימה?"));
assert.equal(r.status, 200, JSON.stringify(r)); assert.match(r.reply, /250 עד 450/);
const sys = aiCalls.at(-1).system[0].text;
assert.match(sys, /סתימה: 250 עד 450 ₪/, "the demo's own prices"); assert.match(sys, /don't know/, "it says when it doesn't know");
assert.match(sys, /fictional/); assert.match(sys, /not sent anywhere/, "a lead left here goes nowhere");

// a name and phone: the marker is removed, nothing is stored, the page hears it was a demo lead
ai.queue.push("תודה דנה. זו הדגמה, אז הפרטים לא נשלחו. [[lead:דנה|0501234567|פתיחת סתימה|סתימה במטבח בחדרה]]");
r = await call("plumber", { messages: [{ role: "user", content: "סתימה" }, { role: "assistant", content: "מה השם והטלפון?" }, { role: "user", content: "דנה 0501234567" }] }, { ip: "8.8.8.2" });
assert.equal(r.lead, "demo"); assert.doesNotMatch(r.reply, /\[\[lead/);

// only from our own pages, only known demos, short messages
r = await call("plumber", ask("היי"), { origin: "https://evil.example", ip: "8.8.8.3" }); assert.equal(r.status, 403);
r = await call("plumber", ask("היי"), { origin: null, ip: "8.8.8.4" }); assert.equal(r.status, 403, "no Origin, no answer");
r = await call("nope", ask("היי"), { ip: "8.8.8.5" }); assert.equal(r.status, 404);
r = await call("plumber", ask("א".repeat(301)), { ip: "8.8.8.6" }); assert.equal(r.status, 400);

// a long conversation: the page sends up to 19 messages; the server keeps the last 11 instead of failing
const long = []; for (let i = 0; i < 9; i++) long.push({ role: "user", content: "שאלה " + i }, { role: "assistant", content: "תשובה " + i });
long.push({ role: "user", content: "ועוד שאלה" });
ai.queue.push("תשובה");
r = await call("plumber", { messages: long }, { ip: "8.8.8.7" }); assert.equal(r.status, 200, JSON.stringify(r));
let sentMsgs = aiCalls.at(-1).messages; assert.equal(sentMsgs.length, 11); assert.equal(sentMsgs[0].role, "user"); assert.equal(sentMsgs.at(-1).content, "ועוד שאלה");
// an earlier question that was too long (it failed then, and stays in the page's history) doesn't block the next
ai.queue.push("תשובה");
r = await call("plumber", { messages: [{ role: "user", content: "א".repeat(500) }, { role: "assistant", content: "הנציג לא זמין" }, { role: "user", content: "כמה עולה סתימה?" }] }, { ip: "8.8.8.8" });
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(aiCalls.at(-1).messages[0].content.length, 300);
// the server-side fallback goes only with an Opus model (the default here); another model gets none
assert.equal(aiCalls.at(-1).fallbacks, "default");
process.env.CHAT_MODEL = "claude-sonnet-5-5";
const sonnet = (await import(new URL("../../demos/netlify/functions/demo-chat.mjs?sonnet", import.meta.url).href)).default;
delete process.env.CHAT_MODEL;
ai.queue.push("תשובה");
let rs = await sonnet(new Request(SITE + "/api/demo-chat/plumber", { method: "POST", headers: { "content-type": "application/json", origin: SITE, "x-nf-client-connection-ip": "8.8.8.10" }, body: JSON.stringify(ask("היי")) }), { params: { demo: "plumber" } });
assert.equal(rs.status, 200); assert.equal(aiCalls.at(-1).model, "claude-sonnet-5-5"); assert.equal(aiCalls.at(-1).fallbacks, undefined, "no fallback outside Opus");

// the per-IP limit
for (let i = 0; i < 15; i++) { ai.queue.push("תשובה"); await call("plumber", ask("שאלה " + i), { ip: "8.8.8.9" }); }
r = await call("plumber", ask("עוד אחת"), { ip: "8.8.8.9" }); assert.equal(r.status, 429);

// --- the home page chat (chat.mjs): our own origin only, the per-IP limit from lib/leads.mjs
const home = (await import(new URL("../../demos/netlify/functions/chat.mjs", import.meta.url).href)).default;
const hcall = (body, { origin = SITE, ip = "7.7.7.1" } = {}) => home(new Request(SITE + "/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip, ...(origin ? { origin } : {}) }, body: JSON.stringify(body) }));
ai.queue.push("שתי חבילות. [[pricing]]");
let hr = await hcall(ask("כמה זה עולה?")); assert.equal(hr.status, 200); assert.match((await hr.json()).reply, /pricing/);
assert.equal(aiCalls.at(-1).fallbacks, "default");
hr = await hcall(ask("היי"), { origin: "https://evil.example", ip: "7.7.7.2" }); assert.equal(hr.status, 403);
for (let i = 0; i < 30; i++) { ai.queue.push("תשובה"); await hcall(ask("שאלה " + i), { ip: "7.7.7.3" }); }
hr = await hcall(ask("עוד"), { ip: "7.7.7.3" }); assert.equal(hr.status, 429);

// --- a paying business's chat (client-chat.mjs): an Origin from its allowed_origins, and a daily cap per business
T.ls_clients.push({ ...DEF.ls_clients(), slug: "dana-clean", name: "דנה ניקיון", package: "ai", active: true, chat_facts: "ניקיון דירות", allowed_origins: ["https://dana.co.il"] });
process.env.CLIENT_CHAT_DAILY = "2";
const cchat = (await import(new URL("../../demos/netlify/functions/client-chat.mjs", import.meta.url).href)).default;
const ccall = (body, { origin = "https://dana.co.il", ip = "6.6.6.1", method = "POST" } = {}) => cchat(new Request(SITE + "/api/chat/dana-clean", { method, headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip, ...(origin ? { origin } : {}) }, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) }), { params: { client: "dana-clean" } });
let cr = await ccall(null, { method: "OPTIONS" }); assert.equal(cr.status, 204); assert.equal(cr.headers.get("access-control-allow-origin"), "https://dana.co.il");
cr = await ccall(ask("היי"), { origin: null }); assert.equal(cr.status, 403, "no Origin, no answer");
cr = await ccall(ask("היי"), { origin: "https://evil.example" }); assert.equal(cr.status, 403);
ai.queue.push("אפשר לעזור בניקיון דירות.", "עוד תשובה");
cr = await ccall(ask("מה אתם עושים?")); assert.equal(cr.status, 200);
cr = await ccall(ask("ועוד?")); assert.equal(cr.status, 200);
cr = await ccall(ask("ושוב?")); assert.equal(cr.status, 429, "past the daily cap the page shows its offline line");
assert.equal((await cr.json()).error, "busy");
delete process.env.CLIENT_CHAT_DAILY;
ai.queue.length = 0;

console.log("all demo chat tests passed");
