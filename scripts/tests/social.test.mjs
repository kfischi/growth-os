// Social links (lib/social.mjs, templates/plumber.mjs): what owners type becomes a clean profile URL or is refused,
// and a site with profiles shows them as plain links on the main page, the service and area pages, and in sameAs.
// Run: node scripts/tests/social.test.mjs
import assert from "node:assert/strict";
import { SAMPLE } from "./builder-sample.mjs";
process.env.SUPABASE_URL ||= "https://x.supabase.co"; process.env.SUPABASE_SERVICE_KEY ||= "sb_secret_test";
const S = await import(new URL("../../demos/netlify/lib/social.mjs", import.meta.url).href);
const P = await import(new URL("../../demos/netlify/lib/templates/plumber.mjs", import.meta.url).href);
const B = await import(new URL("../../demos/netlify/lib/builder.mjs", import.meta.url).href);

/* ---------------- the parser ---------------- */
const ok = {
  instagram: [
    ["@shai.barber", "https://www.instagram.com/shai.barber/"],
    ["shai.barber", "https://www.instagram.com/shai.barber/"],
    ["instagram.com/Shai.Barber", "https://www.instagram.com/shai.barber/"],
    ["https://www.instagram.com/shai.barber/?igsh=MWx0Z3V4&utm_source=qr", "https://www.instagram.com/shai.barber/"],
    ["http://m.instagram.com/shai.barber#top", "https://www.instagram.com/shai.barber/"],
    ["  @shai.barber‏ ", "https://www.instagram.com/shai.barber/"],
  ],
  facebook: [
    ["facebook.com/ShaiBarber", "https://www.facebook.com/ShaiBarber"],
    ["https://m.facebook.com/ShaiBarber/?ref=page_internal", "https://www.facebook.com/ShaiBarber"],
    ["fb.com/ShaiBarber", "https://www.facebook.com/ShaiBarber"],
    ["he-il.facebook.com/ShaiBarber", "https://www.facebook.com/ShaiBarber"],
    ["ShaiBarber", "https://www.facebook.com/ShaiBarber"],
    ["https://www.facebook.com/profile.php?id=100089123456789&mibextid=ZbWKwL", "https://www.facebook.com/profile.php?id=100089123456789"],
    ["https://www.facebook.com/people/שי-ספר/100089123456789/", "https://www.facebook.com/profile.php?id=100089123456789"],
  ],
  tiktok: [
    ["@shai.barber", "https://www.tiktok.com/@shai.barber"],
    ["shai_barber", "https://www.tiktok.com/@shai_barber"],
    ["tiktok.com/@Shai.Barber?lang=he", "https://www.tiktok.com/@shai.barber"],
    ["https://www.tiktok.com/@shai.barber/video/7300000000000000000", "https://www.tiktok.com/@shai.barber"],
  ],
  youtube: [
    ["@ShaiBarber", "https://www.youtube.com/@ShaiBarber"],
    ["youtube.com/@ShaiBarber/videos", "https://www.youtube.com/@ShaiBarber"],
    ["https://m.youtube.com/channel/UCabcdefghijklmnopqrstuv?si=x", "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"],
  ],
};
for (const [net, list] of Object.entries(ok)) for (const [typed, want] of list) assert.equal(S.socialUrl(net, typed), want, `${net}: ${typed}`);
const bad = {
  instagram: ["javascript:alert(1)", "evil.com/shai", "https://instagram.com.evil.com/shai", "instagram.com", "instagram.com/p/Cx1", "instagram.com/reel/Cx1", "שי ספר", "@shai barber", "data:text/html,x", "https://user:pw@instagram.com/shai", "facebook.com/shai", "@a..b"],
  facebook: ["facebook.com/groups/123456", "facebook.com/sharer/sharer.php?u=x", "שי הספר", "@abc", "facebook.com", "tiktok.com/@shai", "ftp://facebook.com/ShaiBarber"],
  tiktok: ["tiktok.com/shai", "vm.tiktok.com/ZMabc", "tiktok.com/", "instagram.com/shai"],
  youtube: ["ShaiBarber", "youtu.be/dQw4w9WgXcQ", "youtube.com/watch?v=dQw4w9WgXcQ", "youtube.com/channel/abc", "youtube.com"],
};
for (const [net, list] of Object.entries(bad)) for (const typed of list) assert.equal(S.socialUrl(net, typed), null, `${net} refuses: ${typed}`);
assert.equal(S.socialUrl("instagram", ""), "", "nothing typed is nothing");
assert.equal(S.socialUrl("instagram", "   "), "");
assert.equal(S.socialUrl("myspace", "@x"), null, "only the four networks");
// Every clean URL reads back as itself (the page checks again before it shows one).
for (const [net, list] of Object.entries(ok)) for (const [, want] of list) assert.equal(S.socialUrl(net, want), want, "stable: " + want);

/* ---------------- what the owner can save (the chat and the questionnaire) ---------------- */
const t = B.TEMPLATES.plumber;
let r = B.applyUpdate(t, SAMPLE, { social: { instagram: "@oren.mayim", facebook: "facebook.com/OrenMayim", tiktok: "", youtube: "" } });
assert.deepEqual(r.errors, []); assert.deepEqual(r.changed, ["social"]);
assert.deepEqual(r.content.social, { instagram: "https://www.instagram.com/oren.mayim/", facebook: "https://www.facebook.com/OrenMayim" });
const saved = r.content;
r = B.applyUpdate(t, saved, { social: { instagram: "https://www.instagram.com/oren.mayim/?igsh=1" } });
assert.deepEqual(r.changed, [], "the same profile again changes nothing");
r = B.applyUpdate(t, saved, { social: { tiktok: "@oren.mayim" } });
assert.equal(r.content.social.instagram, "https://www.instagram.com/oren.mayim/", "a network that isn't sent stays");
assert.equal(r.content.social.tiktok, "https://www.tiktok.com/@oren.mayim");
r = B.applyUpdate(t, saved, { social: { facebook: "" } });
assert.ok(!("facebook" in r.content.social), "an empty value removes it");
r = B.applyUpdate(t, saved, { social: { youtube: "javascript:alert(1)", tiktok: "@oren.mayim" } });
assert.equal(r.errors.length, 1); assert.match(r.errors[0], /^יוטיוב: זה לא נראה כמו פרופיל/);
assert.ok(!r.content.social.youtube, "a bad value is never stored");
r = B.applyUpdate(t, saved, { social: null }); assert.deepEqual(r.changed, [], "null leaves them as they are");
assert.ok(P.emptyContent("electrician").social && !Object.keys(P.emptyContent("plumber").social).length, "a new draft starts with none");

/* ---------------- the site ---------------- */
const social = { instagram: "https://www.instagram.com/oren.mayim/", facebook: "https://www.facebook.com/OrenMayim", tiktok: "https://www.tiktok.com/@oren.mayim", youtube: "https://www.youtube.com/@OrenMayim" };
const content = { ...SAMPLE, trade_id: "plumber", social, regions: [
  { name: "חדרה", towns: ["חדרה"], response: "", note: "אני גר בחדרה ומגיע לרוב הקריאות בעיר תוך 20 דקות. בבניינים הישנים כאן החלפתי עשרות דודים וצנרת." },
] };
const url = "https://oren-mayim.sites.example.co.il/";
const files = P.render(content, { mode: "site", url });
const index = files["index.html"];
const links = (html) => [...html.matchAll(/<a href="([^"]+)" target="_blank" rel="noopener" aria-label="([^"]+)"><svg/g)].map((m) => [m[2], m[1]]);
assert.deepEqual(links(index), [["אינסטגרם", social.instagram], ["פייסבוק", social.facebook], ["טיקטוק", social.tiktok], ["יוטיוב", social.youtube]], "four plain links in a fixed order");
assert.match(index, /<div class="social"><p>עקבו אחרינו<\/p>/);
const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(index)[1]);
assert.deepEqual(ld.sameAs, Object.values(social), "sameAs in the LocalBusiness JSON-LD");
for (const f of [P.servicePage(SAMPLE.services[0].name), P.areaPage("חדרה")]) {
  assert.ok(files[f], f);
  assert.equal(links(files[f]).length, 4, "the links on " + f);
}
assert.ok(!/<iframe|connect\.facebook|instagram\.com\/embed|tiktok\.com\/embed/.test(index), "no embeds, no pixels");
assert.match(P.chatFacts(content), /ברשתות: אינסטגרם https:\/\/www\.instagram\.com\/oren\.mayim\//, "the chats know them");
// The repo copy (no address) and the draft show them too.
assert.equal(links(P.render(content, { mode: "site" })["index.html"]).length, 4);
assert.equal(links(P.render(content, { mode: "draft" })["index.html"]).length, 4);
// Something that slipped into the stored content is checked again: only a clean profile reaches the page.
const sneaky = P.render({ ...content, social: { instagram: 'javascript:alert(1)"><script>x</script>', facebook: "https://evil.com/OrenMayim", youtube: "https://www.youtube.com/@OrenMayim" } }, { mode: "site", url })["index.html"];
assert.deepEqual(links(sneaky), [["יוטיוב", social.youtube]]); assert.ok(!sneaky.includes("javascript:") && !sneaky.includes("evil.com"));
// One network only: one link, one sameAs.
const one = P.render({ ...SAMPLE, trade_id: "plumber", social: { instagram: social.instagram } }, { mode: "site", url })["index.html"];
assert.equal(links(one).length, 1); assert.match(one, /"sameAs":\["https:\/\/www\.instagram\.com\/oren\.mayim\/"\]/);
// None: no row, no sameAs.
const none = P.render({ ...SAMPLE, trade_id: "plumber" }, { mode: "site", url })["index.html"];
assert.ok(!none.includes('class="social"') && !none.includes("sameAs"));
// Every look and palette: the icons are white on the contact section's deep colour on the main page, and the
// look's link colour on white on the service and area pages. WCAG AA asks 3:1 for icons; they keep 4.5:1.
const L = await import(new URL("../../demos/netlify/lib/templates/looks.mjs", import.meta.url).href);
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
assert.equal(Object.keys(L.LOOKS).length, 10);
for (const [id, look] of Object.entries(L.LOOKS)) for (const [pid, pal] of Object.entries(look.palettes)) {
  assert.ok(contrast("#ffffff", pal.deep) >= 4.5, `${id}/${pid}: icons on the contact section`);
  assert.ok(contrast(L.themeColor(look, pal), "#ffffff") >= 4.5, `${id}/${pid}: icons on the service pages`);
  const page = P.render({ ...content, look: id, palette: pid }, { mode: "site", url })["index.html"];
  assert.equal(links(page).length, 4, `${id}/${pid}: the links show`);
}

/* ---------------- the launch kit on a נוכחות site: the plain address, the same instructions ---------------- */
const { launchKit } = await import(new URL("../../demos/netlify/lib/launch.mjs", import.meta.url).href);
const kit = (c) => launchKit({ status: "published", site_host: "oren-mayim.sites.example.co.il", package: "presence", template: "plumber", content: c });
let k = await kit({ ...SAMPLE, social: { instagram: social.instagram } });
assert.equal(k.tracked, false);
assert.deepEqual(k.social.map((x) => [x.id, x.link]), [["instagram", url]], "only the network the owner has");
assert.match(k.social[0].how, /בביו/);
k = await kit({ ...SAMPLE });
assert.deepEqual(k.social.map((x) => x.name), ["אינסטגרם", "פייסבוק", "טיקטוק", "יוטיוב"], "none given: all four");
for (const [rt, want] of [["שעה", "ואני חוזר תוך שעה."], ["תוך שעה", "ואני חוזר תוך שעה."], ["באותו יום", "ואני חוזר באותו יום."]]) {
  k = await kit({ ...SAMPLE, response_time: rt });
  assert.ok(k.status.text.includes(want), `the status reads right for "${rt}": ${k.status.text}`);
}
console.log("all social link tests passed");

// The chat never clears a profile by sending an empty string; the questionnaire can.
{
  const { modelSocial } = await import(new URL("../../demos/netlify/lib/builder.mjs", import.meta.url).href);
  const out = modelSocial({ reply: "x", social: { instagram: "", facebook: "https://facebook.com/x", tiktok: "  ", youtube: null } });
  if (out.social.instagram !== null || out.social.tiktok !== null || out.social.facebook !== "https://facebook.com/x") throw new Error("modelSocial must turn empty strings into null");
  console.log("model never clears a profile: ok");
}
