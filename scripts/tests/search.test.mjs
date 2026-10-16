// lib/search.mjs against fakes of Google (OAuth and Search Console) and IndexNow.
// Run: node scripts/tests/search.test.mjs
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
Object.assign(process.env, {
  SITES_DOMAIN: "sites.example.co.il", LEADS_ADMIN_KEY: "admin-key-0123456789", GSC_PROPERTY: "sc-domain:sites.example.co.il",
  GSC_SERVICE_ACCOUNT: JSON.stringify({ client_email: "seo@proj.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }),
});
const calls = [];
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(url); calls.push([opt.method || "GET", u.host + u.pathname]);
  assert.ok(opt.signal, "every call has a timeout");
  if (u.host === "oauth2.googleapis.com") {
    const jwt = new URLSearchParams(String(opt.body)).get("assertion"); const [h, c, sig] = jwt.split(".");
    assert.ok(createVerify("RSA-SHA256").update(h + "." + c).verify(publicKey, Buffer.from(sig, "base64url")), "a JWT signed by the service account");
    const claim = JSON.parse(Buffer.from(c, "base64url"));
    assert.equal(claim.iss, "seo@proj.iam.gserviceaccount.com"); assert.equal(claim.scope, "https://www.googleapis.com/auth/webmasters");
    return new Response(JSON.stringify({ access_token: "ya29.test", expires_in: 3600 }));
  }
  if (u.host === "www.googleapis.com") {
    assert.equal(opt.headers.authorization, "Bearer ya29.test");
    assert.ok(u.pathname.startsWith("/webmasters/v3/sites/sc-domain%3Asites.example.co.il/"), u.pathname);
    if (opt.method === "PUT") return new Response("", { status: 200 });
    const q = JSON.parse(opt.body);
    assert.equal(q.dimensionFilterGroups[0].filters[0].expression, "https://oren.sites.example.co.il/");
    return new Response(JSON.stringify({ rows: [{ keys: ["2026-10-10"], impressions: 40, clicks: 2 }, { keys: ["2026-10-11"], impressions: 62, clicks: 3 }] }));
  }
  if (u.host === "api.indexnow.org") return new Response("", { status: 202 });
  throw new Error("unexpected " + url);
};
const S = await import(new URL("../../demos/netlify/lib/search.mjs", import.meta.url).href);

// IndexNow: a stable key per site, its file, and the ping.
const key = S.indexNowKey("oren.sites.example.co.il");
assert.match(key, /^[0-9a-f]{32}$/); assert.equal(S.indexNowKey("oren.sites.example.co.il"), key); assert.notEqual(S.indexNowKey("other.sites.example.co.il"), key);
assert.deepEqual(S.indexNowFile("oren.sites.example.co.il"), { [key + ".txt"]: key });
assert.equal(await S.pingIndexNow("oren.sites.example.co.il", ["", "guides.html"]), "sent");

// Search Console: only sites under our domain, one token for many calls.
assert.equal(S.inProperty("oren.sites.example.co.il"), true); assert.equal(S.inProperty("oren-mayim.co.il"), false, "a client's own domain is their own property");
assert.equal(await S.submitSitemap("oren-mayim.co.il"), "off");
assert.equal(await S.submitSitemap("oren.sites.example.co.il"), "sent");
assert.ok(calls.some(([m, p]) => m === "PUT" && p.includes("/sitemaps/https%3A%2F%2Foren.sites.example.co.il%2Fsitemap.xml")), "the sitemap of that site");
const g = await S.searchImpressions("oren.sites.example.co.il", 28, new Date("2026-10-15T09:00:00Z"));
assert.deepEqual(g, { impressions: 102, clicks: 5, daily: [{ day: "2026-10-10", impressions: 40, clicks: 2 }, { day: "2026-10-11", impressions: 62, clicks: 3 }] });
assert.equal(calls.filter(([, p]) => p.startsWith("oauth2")).length, 1, "the token is reused");
assert.equal(await S.searchImpressions("oren-mayim.co.il"), null);

// Without the service account: nothing is sent to Google.
delete process.env.GSC_SERVICE_ACCOUNT;
assert.equal(await S.submitSitemap("oren.sites.example.co.il"), "off");
console.log("all search tests passed");
