// Area pages on a published site (templates/plumber.mjs): a page only for an area the owner wrote about,
// each with its own words, in the sitemap and linked from the main page; never in a draft.
// Run: node scripts/tests/area-pages.test.mjs
import assert from "node:assert/strict";
import { SAMPLE } from "./builder-sample.mjs";
process.env.SUPABASE_URL ||= "https://x.supabase.co"; process.env.SUPABASE_SERVICE_KEY ||= "sb_secret_test";
const P = await import(new URL("../../demos/netlify/lib/templates/plumber.mjs", import.meta.url).href);
const B = await import(new URL("../../demos/netlify/lib/builder.mjs", import.meta.url).href);

const NOTE_A = "אני גר בחדרה ומגיע לרוב הקריאות בעיר תוך 20 דקות. בבניינים הישנים כאן החלפתי עשרות דודים וצנרת.";
const NOTE_B = "בעמק חפר אני עובד בעיקר במושבים: הרבה בתים פרטיים, צנרת חיצונית ודודי שמש על הגג.";
const t = B.TEMPLATES.plumber;

/* ---------------- what the owner can save ---------------- */
let r = B.applyUpdate(t, SAMPLE, { regions: [{ name: "חדרה", towns: ["חדרה"], note: NOTE_A, response: "20 דק׳" }, { name: "עמק חפר", towns: ["עמק חפר", "כפר יונה"], note: NOTE_B, response: "" }] });
assert.deepEqual(r.errors, []); assert.deepEqual(r.changed, ["regions"]); assert.equal(r.content.regions.length, 2);
r = B.applyUpdate(t, SAMPLE, { regions: [{ name: "א", towns: ["חדרה"], note: NOTE_A }, { name: "ב", towns: ["חדרה"], note: NOTE_A }] });
assert.match(r.errors[0], /לכל אזור צריך לכתוב משהו משלו/, "the same words on two pages are refused");
r = B.applyUpdate(t, SAMPLE, { regions: Array.from({ length: 6 }, (_, i) => ({ name: "אזור " + i, towns: ["חדרה"], note: NOTE_A + i })) });
assert.match(r.errors[0], /עד 5 אזורים/);
r = B.applyUpdate(t, SAMPLE, { regions: [{ name: "x".repeat(31), towns: [], note: "" }] }); assert.match(r.errors[0], /שם אזור עד 30/);
r = B.applyUpdate(t, SAMPLE, { regions: null }); assert.deepEqual(r.changed, [], "null leaves them as they are");

/* ---------------- the published site ---------------- */
const content = { ...SAMPLE, trade_id: "plumber", regions: [
  { name: "חדרה", towns: ["חדרה"], note: NOTE_A, response: "20 דק׳" },
  { name: "עמק חפר", towns: ["עמק חפר", "כפר יונה"], note: NOTE_B, response: "" },
  { name: "השרון", towns: ["נתניה"], note: "קצר מדי", response: "" }, // too short a note: no page
] };
const url = "https://oren-mayim.sites.example.co.il/";
const files = P.render(content, { mode: "site", url });
const areaFiles = Object.keys(files).filter((f) => f.startsWith("area-"));
assert.equal(areaFiles.length, 2, "a page only for an area with the owner's own words");
const a = files[P.areaPage("חדרה")], b = files[P.areaPage("עמק חפר")];
assert.ok(a && b);
assert.match(a, /<title>אינסטלציה בחדרה · אורן מים<\/title>/);
assert.ok(a.includes(NOTE_A) && !a.includes(NOTE_B) && b.includes(NOTE_B), "each page carries its own words");
assert.match(a, /<th>זמן חזרה<\/th><td>20 דק׳<\/td>/, "the area's own response time");
assert.match(b, /<th>זמן חזרה<\/th><td>15 דק׳<\/td>/, "else the business's");
assert.match(a, new RegExp(`<link rel="canonical" href="${url}${P.areaPage("חדרה")}">`));
assert.ok(!/noindex/.test(a), "area pages are for Google");
assert.match(a, /"areaServed":\[\{"@type":"City","name":"חדרה"\}\]/);
assert.match(a, /BreadcrumbList/);
assert.ok(a.includes(`href="${P.areaPage("עמק חפר")}"`), "links to the other areas");
assert.ok(a.includes(P.servicePage(SAMPLE.services[0].name)), "and to the services");
for (const f of areaFiles) assert.ok(files["sitemap.xml"].includes(url + f), "in the sitemap: " + f);
assert.ok(files["index.html"].includes(`href="${P.areaPage("חדרה")}"`), "the main page links to them");
assert.ok(!files["index.html"].includes("השרון</a>"), "no link to an area without a page");
assert.match(P.chatFacts(content), /אזור חדרה: חדרה, חוזרים תוך 20 דק׳\. אני גר בחדרה/, "the chats know the areas too");
// A draft shows the links but makes no pages.
const draft = P.render(content, { mode: "draft" });
assert.equal(Object.keys(draft).filter((f) => f.startsWith("area-")).length, 0);
assert.match(draft["index.html"], /class="area-links"/);
// No areas: no pages, no links.
const plain = P.render({ ...SAMPLE, trade_id: "plumber" }, { mode: "site", url });
assert.equal(Object.keys(plain).filter((f) => f.startsWith("area-")).length, 0);
assert.ok(!plain["index.html"].includes(`class="area-links"`));
console.log("all area page tests passed");
