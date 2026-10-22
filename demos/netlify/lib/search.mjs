// Telling the search engines about a client site the moment it is published, and how Google sees it since.
//   IndexNow (Bing, Yandex, Seznam, Naver): every publish sends the site's pages; the key file is part of the deploy.
//     Nothing to set up. Google doesn't read IndexNow.
//   Google Search Console, optional:
//     GSC_SERVICE_ACCOUNT  the JSON key of a Google Cloud service account (Search Console API turned on)
//     GSC_PROPERTY         the property it is a full user of, e.g. "sc-domain:multilanding.co.il": a Domain property
//                          for SITES_DOMAIN covers every <slug>.<SITES_DOMAIN> site at once, verified once by DNS.
//     Then every publish submits the site's sitemap, and the owner's panel shows how many times the site appeared in
//     Google and how many clicks it got (searchImpressions), a few days behind, as Google reports it.
import { createHash, createSign } from "node:crypto";

const TIMEOUT = 10000;
const sitesDomain = () => String(process.env.SITES_DOMAIN || "").trim().toLowerCase();

// A key per site, stable, not guessable from the slug alone (IndexNow keys are public, they only prove ownership).
export const indexNowKey = (host) => createHash("sha256").update("indexnow:" + host + ":" + String(process.env.LEADS_ADMIN_KEY || "").trim()).digest("hex").slice(0, 32);
// The file that goes up with the site: /<key>.txt holding the key.
export const indexNowFile = (host) => ({ [indexNowKey(host) + ".txt"]: indexNowKey(host) });

/** Sends the site's pages to IndexNow. pages: paths like "", "guides.html". Returns "sent" or the reason it wasn't. */
export async function pingIndexNow(host, pages) {
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, signal: AbortSignal.timeout(TIMEOUT),
      body: JSON.stringify({ host, key: indexNowKey(host), keyLocation: `https://${host}/${indexNowKey(host)}.txt`, urlList: pages.slice(0, 1000).map((p) => `https://${host}/${p}`) }),
    });
    return res.ok || res.status === 202 ? "sent" : "status " + res.status;
  } catch (e) { return "failed: " + e.message; }
}

/* ---------------- Google Search Console (a service account, JWT) ---------------- */

const gscOn = () => Boolean(process.env.GSC_SERVICE_ACCOUNT && process.env.GSC_PROPERTY);
// Only sites under our own domain belong to the property. A client's own domain is their own property.
export const inProperty = (host) => gscOn() && Boolean(sitesDomain()) && (host === sitesDomain() || host.endsWith("." + sitesDomain()));
const b64url = (b) => Buffer.from(b).toString("base64url");
let cached = { token: "", until: 0 };

async function token(now = Date.now()) {
  if (cached.token && cached.until > now + 60_000) return cached.token;
  const sa = JSON.parse(process.env.GSC_SERVICE_ACCOUNT);
  const iat = Math.floor(now / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters", aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 }));
  const sig = createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(TIMEOUT),
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error("gsc token " + res.status);
  cached = { token: data.access_token, until: now + (data.expires_in || 3600) * 1000 };
  return cached.token;
}
const api = (path) => `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(process.env.GSC_PROPERTY)}${path}`;

/** Submits https://<host>/sitemap.xml to Search Console. Returns "sent", "off" or the reason. */
export async function submitSitemap(host) {
  if (!inProperty(host)) return "off";
  try {
    const res = await fetch(api(`/sitemaps/${encodeURIComponent(`https://${host}/sitemap.xml`)}`), { method: "PUT", headers: { authorization: "Bearer " + await token() }, signal: AbortSignal.timeout(TIMEOUT) });
    return res.ok ? "sent" : "status " + res.status;
  } catch (e) { return "failed: " + e.message; }
}

/**
 * How the site did in Google search over the last `days` days: { impressions, clicks, daily: [{ day, impressions, clicks }] },
 * or null when Search Console isn't set up for it. Google reports a few days late, and a new site starts at zero.
 */
export async function searchImpressions(host, days = 28, now = new Date()) {
  if (!host || !inProperty(host)) return null;
  const day = (d) => d.toISOString().slice(0, 10);
  const res = await fetch(api("/searchAnalytics/query"), {
    method: "POST", headers: { authorization: "Bearer " + await token(), "content-type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT),
    body: JSON.stringify({
      startDate: day(new Date(now - days * 86_400_000)), endDate: day(now), dimensions: ["date"], rowLimit: 500,
      dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: `https://${host}/` }] }],
    }),
  });
  if (!res.ok) throw new Error("gsc query " + res.status);
  const rows = ((await res.json()).rows || []).map((r) => ({ day: r.keys[0], impressions: r.impressions || 0, clicks: r.clicks || 0 }));
  return { impressions: rows.reduce((n, r) => n + r.impressions, 0), clicks: rows.reduce((n, r) => n + r.clicks, 0), daily: rows };
}
