// The photo estimate (/api/estimate) against the fake Anthropic and Supabase of builder-fakes.mjs.
// Run: node scripts/tests/photo-estimate.test.mjs
import assert from "node:assert/strict";
import { T, ai, aiCalls, DEF } from "./builder-fakes.mjs";

const fn = (await import(new URL("../../demos/netlify/functions/photo-estimate.mjs", import.meta.url).href)).default;
const SITE = "https://service-pro-web.netlify.app";
const IMG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";
const call = async (body, { origin = SITE, ip = "9.9.9.1" } = {}) => {
  const r = await fn(new Request(SITE + "/api/estimate", { method: "POST", headers: { "content-type": "application/json", origin, "x-nf-client-connection-ip": ip }, body: JSON.stringify(body) }), {});
  return { status: r.status, ...(await r.json()) };
};
const PRICES = { "סתימה": "250 עד 450 ₪", "נזילה": "300 עד 650 ₪" };

// a demo: the page's own list, the model picks from it, the range is copied from the list
ai.queue.push({ seen: "ברז מטפטף מתחת לכיור.", service: "נזילה", urgent: false, advice: "שימו קערה מתחת לברז." });
let r = await call({ trade: "אינסטלציה", prices: PRICES, issue: "נזילה", image: IMG });
assert.equal(r.status, 200, JSON.stringify(r));
assert.equal(r.service, "נזילה"); assert.equal(r.range, "300 עד 650 ₪", "the range comes from the list, not from the model");
const sent = aiCalls.at(-1);
assert.equal(sent.messages[0].content[0].type, "image"); assert.match(sent.system[0].text, /נזילה: 300 עד 650 ₪/);
assert.match(sent.system[0].text, /Never mention a price/);

// a service the list doesn't have: no range
ai.queue.push({ seen: "לוח חשמל.", service: "החלפת לוח", urgent: true, advice: "אל תגעו, והתקשרו לחשמלאי." });
r = await call({ trade: "אינסטלציה", prices: PRICES, image: IMG }, { ip: "9.9.9.2" });
assert.equal(r.range, null); assert.equal(r.urgent, true);

// bad input and someone else's page
r = await call({ prices: PRICES, image: "data:text/html;base64,PGI+" }, { ip: "9.9.9.3" }); assert.equal(r.status, 400);
r = await call({ prices: PRICES, image: IMG }, { origin: "https://evil.example", ip: "9.9.9.4" }); assert.equal(r.status, 403, "a demo list only from our pages");

// a paying business: its list from chat_facts, the page's list ignored
T.ls_clients.push({ ...DEF.ls_clients(), slug: "oren-mayim", name: "אורן מים", chat_facts: "שירותים ומחירים:\n- סתימה בכיור: 250 עד 450 ₪\n- נזילה: 300 עד 650 ₪", allowed_origins: ["https://oren.co.il"] });
ai.queue.push({ seen: "כיור סתום.", service: "סתימה בכיור", urgent: false, advice: "" });
r = await call({ slug: "oren-mayim", prices: { "סתימה בכיור": "10 ₪" }, image: IMG }, { origin: "https://oren.co.il", ip: "9.9.9.5" });
assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(r.range, "250 עד 450 ₪", "the owner's own price, not the page's");
assert.doesNotMatch(aiCalls.at(-1).system[0].text, /10 ₪/);
r = await call({ slug: "oren-mayim", image: IMG }, { origin: "https://evil.example", ip: "9.9.9.6" }); assert.equal(r.status, 403);

// too many from one IP
for (let i = 0; i < 8; i++) { ai.queue.push({ seen: "x", service: null, urgent: false, advice: "" }); await call({ prices: PRICES, image: IMG }, { ip: "9.9.9.7" }); }
r = await call({ prices: PRICES, image: IMG }, { ip: "9.9.9.7" }); assert.equal(r.status, 429);
ai.queue.length = 0;

console.log("all photo estimate tests passed");
