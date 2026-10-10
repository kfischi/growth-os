// Netlify Function: counts a visit to a business's site. POST /api/visit/<client-slug>
// Sent once per browser session by LeadForm.visit() (shared/leadform.js), with navigator.sendBeacon.
// Body (text): { page, referrer, source?, campaign? }. Only a number per day and source is kept:
// no IP, no cookie, nothing that identifies the visitor. Answers 204 whatever happens, so a page never waits on it.
import { configured, getClient, recordVisit, rateLimiter, clientIp } from "../lib/leads.mjs";

const once = new Map(); // ip+slug -> time, so a reload or a second tab is not a second visit (per function instance)
const flood = rateLimiter(60, 10 * 60 * 1000);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime/i;
const done = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export default async (req, context) => {
  if (req.method !== "POST" || !configured()) return done();
  if (BOT.test(req.headers.get("user-agent") || "")) return done();
  const slug = context.params && context.params.client;
  const ip = clientIp(req);
  if (flood(ip)) return done();
  const key = ip + "|" + slug, last = once.get(key);
  if (last && Date.now() - last < 30 * 60_000) return done();

  try {
    const client = await getClient(slug);
    if (!client || !client.active) return done();
    // Only the business's own site counts: its domain, or this site (the demos and the drafts).
    const origin = req.headers.get("origin");
    let own = false;
    try { own = !!origin && (new URL(origin).host === new URL(req.url).host || (client.allowed_origins || []).includes(origin)); } catch { /* bad origin */ }
    if (!own) return done();

    let body = {};
    try { body = JSON.parse((await req.text()).slice(0, 2000)) || {}; } catch { /* empty or junk: count it as direct */ }
    once.set(key, Date.now());
    if (once.size > 20000) once.clear();
    await recordVisit(client, { page: String(body.page || ""), referrer: String(body.referrer || ""), source: String(body.source || ""), campaign: String(body.campaign || "") });
  } catch (e) {
    console.error("visit", e.message);
  }
  return done();
};

export const config = { path: "/api/visit/:client" };
