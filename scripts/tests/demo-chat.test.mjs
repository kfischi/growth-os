// The live נציג AI on a demo page (/api/demo-chat/<demo>) against the fake Anthropic of builder-fakes.mjs.
// Run: node scripts/tests/demo-chat.test.mjs
import assert from "node:assert/strict";
import { ai, aiCalls } from "./builder-fakes.mjs";

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

// the per-IP limit
for (let i = 0; i < 15; i++) { ai.queue.push("תשובה"); await call("plumber", ask("שאלה " + i), { ip: "8.8.8.9" }); }
r = await call("plumber", ask("עוד אחת"), { ip: "8.8.8.9" }); assert.equal(r.status, 429);
console.log("all demo chat tests passed");
