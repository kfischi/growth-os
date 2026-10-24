// The site's scripted chat in the customer's language (lib/builder.mjs chatLangs, the template's chatLines, leadbot.js).
// Against the fake Anthropic of builder-fakes.mjs, then the real leadbot.js in a browser.
// Run from demos/: node ../scripts/tests/chat-langs.test.mjs   (the browser part needs NODE_PATH with playwright)
import assert from "node:assert/strict";
import { ai, aiCalls } from "./builder-fakes.mjs";

const B = await import(new URL("../../demos/netlify/lib/builder.mjs", import.meta.url).href);
const P = await import(new URL("../../demos/netlify/lib/templates/plumber.mjs", import.meta.url).href);

const content = { ...B.TEMPLATES.plumber.emptyContent(), business_name: "אורן מים", trade: "אינסטלציה", area: "חדרה", owner_name: "אורן לוי", whatsapp: "0501111111",
  headline_1: "נזילה?", intro: "כותבים בצ׳אט, ואני חוזר אליכם.", services: [{ name: "סתימה", price: "250 עד 450 ₪" }, { name: "נזילה", price: "300 עד 650 ₪" }], towns: ["חדרה", "נתניה"], response_time: "שעה" };
const d = { id: "aaaa1111-0000-0000-0000-000000000000", template: "plumber", package: "ai", content, photos: {} };

// the lines: the greeting, the questions, the owner's services as buttons, the town's example; never the crisis trades
const lines = P.chatLines(content);
assert.ok(lines.includes("סתימה") && lines.includes("משהו אחר") && lines.includes("למשל: חדרה") && lines.some((l) => l.startsWith("היי, כאן אורן")), JSON.stringify(lines));
assert.equal(new Set(lines).size, lines.length, "each line once");
assert.deepEqual(P.chatLines({ ...content, trade_id: "psychologist" }), [], "the crisis trades keep Hebrew only");

// off (the default in the fakes): no call
assert.equal(await B.chatLangs(d), null); assert.equal(aiCalls.length, 0);
delete process.env.CHAT_LANGS;

// presence or no key: no call either
assert.equal(await B.chatLangs({ ...d, package: "presence" }), null); assert.equal(aiCalls.length, 0);

// on: one call, the answer laid against the lines in order
const fake = (l) => lines.map((x, i) => `${l}:${i}`);
ai.queue.push(JSON.stringify({ ru: fake("ru"), ar: fake("ar"), en: lines.slice(1) /* one short: dropped */ }));
const langs = await B.chatLangs(d);
assert.equal(aiCalls.length, 1);
assert.match(aiCalls[0].system[0].text, /Never add, drop or soften a fact, a safety instruction or an emergency number/);
assert.equal(langs.ru["סתימה"], "ru:" + lines.indexOf("סתימה")); assert.ok(langs.ar); assert.equal(langs.en, undefined, "a language with the wrong count is left out");
// the same lines again (the deploy after the repo commit): from the cache, no second call
assert.equal(await B.chatLangs(d), langs); assert.equal(aiCalls.length, 1);

// the site: the dictionary goes into the chat, only for lines the chat still shows
const site = B.siteFiles(d, "oren-mayim", "", { ...langs, ru: { ...langs.ru, "שורה ישנה": "старое" } })["index.html"];
assert.match(site, /i18n: \{"ru":\{/); assert.ok(!site.includes("старое"), "a stale line is dropped");
const plain = B.siteFiles(d, "oren-mayim", "", null)["index.html"];
assert.ok(!/i18n:/.test(plain), "without translations the chat is Hebrew only");
const draft = P.render(content, { mode: "draft", langs })["index.html"];
assert.ok(!/i18n:/.test(draft), "a draft has no language row");

// a failed call publishes in Hebrew, never throws
ai.mode = "down";
assert.equal(await B.chatLangs({ ...d, content: { ...content, towns: ["כפר יונה"] } }), null);
ai.mode = "ok";
process.env.CHAT_LANGS = "off";

// --- the real leadbot.js: the row, the translated lines, Hebrew values for the owner
let chromium;
try { ({ chromium } = (await import("node:module")).createRequire(import.meta.url)("playwright")); } // require reads NODE_PATH, import doesn't
catch { console.log("chat-langs: playwright not found, browser part skipped"); }
if (chromium) {
  const fs = await import("node:fs");
  const bot = fs.readFileSync(new URL("../../demos/shared/leadbot.js", import.meta.url), "utf8");
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await page.setContent(`<!doctype html><html lang="he" dir="rtl"><body><script>${bot}</script><script>
    window.done = null;
    LeadBot.init({ whatsapp: "972501111111", name: "אורן", initial: "א", launcher: "לפתוח קריאה", greet: "שלום",
      i18n: { ru: { "שלום": "Здравствуйте", "מה צריך?": "Что нужно?", "סתימה": "Засор", "תקלה": "Неисправность", "שם": "Имя", "איך קוראים לכם?": "Как вас зовут?", "טלפון": "Телефон", "לאיזה מספר לחזור?": "Номер?" } },
      steps: [{ key: "issue", label: "תקלה", ask: "מה צריך?", chips: ["סתימה", "נזילה"] }, { key: "name", label: "שם", ask: "איך קוראים לכם?", input: "text" }, { key: "phone", label: "טלפון", ask: "לאיזה מספר לחזור?", input: "tel" }],
      summary: (d) => "קריאה: " + d.issue + "\\nשם: " + d.name, closing: () => "תודה!", onDone: (d, text) => { window.done = { d, text }; } });
  </script></body></html>`);
  await page.click(".lb-launch");
  assert.equal(await page.locator(".lb-langs button").count(), 2, "Hebrew and the one language with lines");
  await page.click('.lb-langs button[data-lang="ru"]');
  await page.waitForSelector(".lb-chips button");
  assert.equal(await page.getAttribute(".lb-panel", "dir"), "ltr");
  assert.match(await page.locator(".lb-msg").first().innerText(), /Здравствуйте/);
  assert.deepEqual(await page.locator(".lb-chips button").allInnerTexts(), ["Засор", "נזילה"], "a chip without a translation stays Hebrew");
  await page.click(".lb-chips button >> nth=0");
  await page.waitForSelector(".lb-form.on"); await page.fill("#lb-input", "Ирина"); await page.press("#lb-input", "Enter");
  await page.waitForFunction(() => document.querySelector(".lb-form.on") && /Номер/.test(document.body.innerText));
  await page.fill("#lb-input", "12"); await page.press("#lb-input", "Enter");
  await page.waitForFunction(() => /Номер выглядит неполным/.test(document.body.innerText));
  await page.fill("#lb-input", "0546666666"); await page.press("#lb-input", "Enter");
  await page.waitForFunction(() => window.done);
  const done = await page.evaluate(() => window.done);
  assert.equal(done.d.issue, "סתימה", "the value stays Hebrew for the owner");
  assert.match(done.text, /^קריאה: סתימה\nשם: Ирина/); assert.match(done.text, /\(הפנייה ברוסית\)$/);
  assert.match(await page.locator(".lb-card").innerText(), /Засор/, "the customer's own summary in their language");
  assert.match(await page.locator(".lb-wa").innerText(), /WhatsApp/);
  // no dictionary: no row
  await page.setContent(`<!doctype html><html lang="he" dir="rtl"><body><script>${bot}</script><script>LeadBot.init({ whatsapp: "1", name: "x", greet: "שלום", steps: [], summary: () => "" });</script></body></html>`);
  assert.equal(await page.locator(".lb-langs").count(), 0);
  await browser.close();
}

console.log("all chat language tests passed");
