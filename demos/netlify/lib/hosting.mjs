// Hosting for the sites the builder publishes (0012_hosting.sql), through the Netlify API: no step by hand.
//   NETLIFY_TOKEN   a personal access token of the Netlify account that holds the client sites
//   SITES_DOMAIN    optional, our own domain for the first address, e.g. "example.co.il". Its DNS must be on Netlify DNS
//                   in the same account: then every site gets <slug>.<SITES_DOMAIN> and its certificate by itself.
//                   Without it a site lives at <name>.netlify.app.
// The first publish creates the site and deploys the files straight from the builder (no GitHub Action needed);
// every later publish, by כפיר or by the owner, deploys again. When the client has a domain of their own, כפיר types
// it in /build/admin/: it is added to the site at once, and the hourly check (reminders.mjs) makes it the main address
// as soon as its DNS points at Netlify. The old address stays as an alias that Netlify sends on to the new one.
import { createHash } from "node:crypto";
import dns from "node:dns/promises";

const API = "https://api.netlify.com/api/v1";
export const NETLIFY_IP = "75.2.60.5"; // Netlify's load balancer: the A record for a root domain
export const hostingOn = () => Boolean(process.env.NETLIFY_TOKEN);
const sitesDomain = () => String(process.env.SITES_DOMAIN || "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");

async function nf(method, path, body, raw) {
  const res = await fetch(API + path, {
    method,
    headers: { authorization: "Bearer " + process.env.NETLIFY_TOKEN, "user-agent": "nechita-raka-builder", "content-type": raw ? "application/octet-stream" : "application/json" },
    body: raw || (body ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
const must = (r, what) => { if (!r.ok) throw new Error(`netlify ${what} ${r.status}: ${String((r.data && (r.data.message || r.data.errors && JSON.stringify(r.data.errors))) || "").slice(0, 200)}`); return r.data; };

// A domain as an owner may type it: "https://www.Oren-Mayim.co.il/" -> "oren-mayim.co.il" (www goes in as an alias).
export function cleanDomain(input) {
  let s = String(input || "").trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
  s = s.replace(/^www\./, "");
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(s)) return null;
  if (/(^|\.)netlify\.app$/.test(s) || (sitesDomain() && (s === sitesDomain() || s.endsWith("." + sitesDomain())))) return null;
  return s;
}

// The DNS records the client's registrar needs, to show and to send to the client.
export const dnsSteps = (domain, site) => [
  { type: "A", host: "@", value: NETLIFY_IP, note: domain },
  { type: "CNAME", host: "www", value: site.netlifyHost, note: "www." + domain },
];

async function ensureSubRecord(sub, netlifyHost) {
  const zones = must(await nf("GET", "/dns_zones"), "dns zones");
  const zone = (zones || []).find((z) => z.name === sitesDomain());
  if (!zone) throw new Error(`netlify dns: ${sitesDomain()} is not a DNS zone in this account`);
  const records = must(await nf("GET", `/dns_zones/${zone.id}/dns_records`), "dns records");
  if ((records || []).some((r) => r.hostname === sub)) return;
  const r = await nf("POST", `/dns_zones/${zone.id}/dns_records`, { type: "CNAME", hostname: sub, value: netlifyHost, ttl: 3600 });
  if (!r.ok && r.status !== 422) must(r, "dns record"); // 422: Netlify DNS made the record for the site itself meanwhile
}

/**
 * The site for a slug: created on the first call, found by its id afterwards.
 * Returns { siteId, netlifyHost, sub, host } where host is the address the site answers on now.
 * onMade({ site_id, site_netlify }) runs the moment a new site exists, before anything else can fail, so the caller
 * saves its id: a later failure (or a run cut off by its time limit) must never leave a site the next try can't find.
 */
export async function ensureSite(slug, known = {}, onMade = null) {
  const sub = sitesDomain() ? `${slug}.${sitesDomain()}` : null;
  const attachSub = async (site) => { // the CNAME and the certificate for <slug>.<SITES_DOMAIN>
    await ensureSubRecord(sub, hostOf(site));
    await nf("POST", `/sites/${site.id}/ssl`).catch(() => null); // Netlify DNS issues it by itself too; this only hurries it
  };
  if (known.site_id) {
    const r = await nf("GET", `/sites/${known.site_id}`);
    if (r.ok) {
      // A site made by a try that stopped before its address was saved: finish the address now.
      const attached = sub && (r.data.custom_domain === sub || (r.data.domain_aliases || []).includes(sub));
      if (attached && !known.site_sub) await attachSub(r.data);
      // Published before SITES_DOMAIN was set (a pilot on *.netlify.app): it moves to <slug>.<SITES_DOMAIN> at its next
      // publish. The netlify.app address keeps working and Netlify redirects it there. A client's own domain stays put.
      if (sub && !attached && !r.data.custom_domain) {
        const moved = must(await nf("PATCH", `/sites/${r.data.id}`, { custom_domain: sub }), "move to our domain");
        await attachSub(moved);
        return { siteId: moved.id, netlifyHost: hostOf(moved), sub, host: sub };
      }
      return { siteId: r.data.id, netlifyHost: hostOf(r.data), sub: known.site_sub || (attached ? sub : null), host: r.data.custom_domain || hostOf(r.data) };
    }
    if (r.status !== 404) must(r, "site");
  }
  let made = null;
  // A site an earlier try made but never saved (cut off right after creating it) already holds our address:
  // find it by that address (the API takes a domain in place of the id) instead of failing on the taken name.
  if (sub) {
    const r = await nf("GET", `/sites/${encodeURIComponent(sub)}`);
    if (r.ok && r.data && r.data.custom_domain === sub) made = r.data;
    else if (!r.ok && r.status !== 404) must(r, "site by address");
  }
  for (const name of made ? [] : [slug, `${slug}-site`, `${slug}-${createHash("sha1").update(slug + Date.now()).digest("hex").slice(0, 5)}`]) {
    const r = await nf("POST", "/sites", { name, ...(sub ? { custom_domain: sub } : {}) });
    if (r.ok) { made = r.data; break; }
    if (r.status !== 422) must(r, "create site"); // 422: the name is taken on Netlify, try the next one
  }
  if (!made) throw new Error("netlify: no free site name for " + slug);
  const netlifyHost = hostOf(made);
  if (onMade) await onMade({ site_id: made.id, site_netlify: netlifyHost });
  if (sub) await attachSub(made);
  return { siteId: made.id, netlifyHost, sub, host: sub || netlifyHost };
}
const hostOf = (s) => (s.default_domain || `${s.name}.netlify.app`).toLowerCase();

/**
 * Deploys a whole site: { "index.html": string | Buffer, "assets/a.js": ... }. Netlify asks only for the files it
 * doesn't have yet (by their SHA1), so a republish that changed one line uploads one file.
 */
export async function deploy(siteId, files) {
  const bufs = Object.entries(files).map(([p, c]) => ["/" + p.replace(/^\/+/, ""), Buffer.isBuffer(c) ? c : Buffer.from(String(c), "utf8")]);
  const digest = Object.fromEntries(bufs.map(([p, b]) => [p, createHash("sha1").update(b).digest("hex")]));
  const made = must(await nf("POST", `/sites/${siteId}/deploys`, { files: digest }), "deploy");
  const need = new Set(made.required || []);
  for (const [p, b] of bufs) {
    if (!need.has(digest[p])) continue;
    must(await nf("PUT", `/deploys/${made.id}/files${p.split("/").map(encodeURIComponent).join("/")}`, null, b), "upload " + p);
    need.delete(digest[p]);
  }
  return made.id;
}

// The client's own domain: added to the site at once, as an alias, so it works the moment its DNS is right.
export async function addDomain(siteId, domain) {
  const site = must(await nf("GET", `/sites/${siteId}`), "site");
  const aliases = new Set([...(site.domain_aliases || []), domain, "www." + domain]);
  must(await nf("PATCH", `/sites/${siteId}`, { domain_aliases: [...aliases] }), "add domain");
  return { netlifyHost: hostOf(site) };
}

// Does the domain point at this site yet? Only its root's A record counts: the root becomes the main address, and
// a root still pointing elsewhere would take the site down with it. A www that is ready alone keeps it waiting
// (it works meanwhile as an alias). netlifyHost stays in the signature for the callers and the tests.
export async function pointsHere(domain, _netlifyHost) {
  const a = await dns.resolve4(domain).catch(() => []);
  return a.includes(NETLIFY_IP);
}

// The swap: the client's domain becomes the main address; ours and www stay as aliases that redirect to it.
export async function makePrimary(siteId, domain, keep = []) {
  const site = must(await nf("GET", `/sites/${siteId}`), "site");
  const aliases = new Set([...(site.domain_aliases || []), ...keep, "www." + domain].filter(Boolean));
  aliases.delete(domain);
  must(await nf("PATCH", `/sites/${siteId}`, { custom_domain: domain, domain_aliases: [...aliases] }), "make primary");
  await nf("POST", `/sites/${siteId}/ssl`).catch(() => null);
}
