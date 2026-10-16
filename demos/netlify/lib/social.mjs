// The owner's social profiles (content.social): Instagram, Facebook, TikTok and YouTube, as plain links on the site,
// `sameAs` in its JSON-LD, and a tagged link per network in the launch kit (lib/launch.mjs).
// Owners type all sorts of things ("@shai.barber", "instagram.com/shai.barber?igsh=…", "m.facebook.com/OrenMayim").
// socialUrl() turns what they typed into one clean https URL on the network's own host, or refuses it.
// No tracking: query strings and fragments are dropped (only Facebook's profile.php?id= is kept).

export const NETWORKS = {
  instagram: { label: "אינסטגרם", example: "@shai.barber" },
  facebook: { label: "פייסבוק", example: "facebook.com/ShaiBarber" },
  tiktok: { label: "טיקטוק", example: "@shai.barber" },
  youtube: { label: "יוטיוב", example: "@ShaiBarber" },
};
export const SOCIAL_KEYS = Object.keys(NETWORKS);

const HOSTS = {
  "instagram.com": "instagram", "instagr.am": "instagram",
  "facebook.com": "facebook", "fb.com": "facebook", "fb.me": "facebook",
  "tiktok.com": "tiktok",
  "youtube.com": "youtube",
};
// Paths on these hosts that are never a profile (a post, a reel, a group, a share link).
const NOT_PROFILE = {
  instagram: /^(p|reel|reels|tv|stories|explore|accounts|direct|about|legal|developer|web|s)$/i,
  facebook: /^(groups|events|sharer|sharer\.php|share|watch|login|login\.php|photo|photo\.php|photos|story\.php|permalink\.php|marketplace|home\.php|dialog|plugins|gaming|reel|reels|hashtag|help|policies|privacy|settings|messages|notifications|search|friends|bookmarks|business|ads|l\.php|video\.php|videos)$/i,
};
const USER = { instagram: /^[A-Za-z0-9._]{1,30}$/, tiktok: /^[A-Za-z0-9._]{2,24}$/, youtube: /^[A-Za-z0-9._-]{3,30}$/, facebook: /^[A-Za-z0-9.-]{5,50}$/ };

const tidy = (s) => String(s ?? "").replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g, "").trim();

function profile(net, user) {
  if (net === "instagram") return USER.instagram.test(user) && !/^\.|\.$|\.\./.test(user) ? `https://www.instagram.com/${user.toLowerCase()}/` : null;
  if (net === "tiktok") return USER.tiktok.test(user) && !/\.$/.test(user) ? `https://www.tiktok.com/@${user.toLowerCase()}` : null;
  if (net === "youtube") return USER.youtube.test(user) ? `https://www.youtube.com/@${user}` : null;
  if (net === "facebook") return USER.facebook.test(user) && /[A-Za-z]/.test(user) && !NOT_PROFILE.facebook.test(user) ? `https://www.facebook.com/${user}` : null;
  return null;
}

/**
 * What the owner typed for one network, as a clean profile URL.
 * Returns "" for nothing typed, the URL, or null when it isn't a profile on that network.
 */
export function socialUrl(net, raw) {
  if (!Object.hasOwn(NETWORKS, net)) return null;
  const s = tidy(raw);
  if (!s) return "";
  if (s.length > 300 || /\s/.test(s)) return null;
  // A handle: "@x" for any network, a bare "x" only where a username is all there is (Instagram, TikTok, Facebook).
  if (!/[/:]/.test(s) && !/\.(com|me|am)$/i.test(s)) {
    const at = s.startsWith("@"), user = at ? s.slice(1) : s;
    if (!at && net === "youtube") return null;
    if (net === "facebook" && at && !USER.facebook.test(user)) return null;
    return profile(net, user);
  }
  // A link, with or without https://.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(s);
  if (scheme && !/^https?$/i.test(scheme[1])) return null;
  let u;
  try { u = new URL(scheme ? s : "https://" + s.replace(/^\/+/, "")); } catch { return null; }
  if (u.username || u.password || (u.port && u.port !== "443" && u.port !== "80")) return null;
  // "www.", "m.", "he-il." and the like in front of the network's own domain.
  let host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host.split(".").length > 2) host = host.replace(/^(www|m|mobile|web|touch|mbasic|[a-z]{2}-[a-z]{2}|[a-z]{2})\./, "");
  if (HOSTS[host] !== net) return null;
  let parts;
  try { parts = u.pathname.split("/").filter(Boolean).map(decodeURIComponent); } catch { return null; }
  if (net === "instagram") return parts.length && !NOT_PROFILE.instagram.test(parts[0]) ? profile(net, parts[0]) : null;
  if (net === "tiktok") return parts.length && parts[0].startsWith("@") ? profile(net, parts[0].slice(1)) : null;
  if (net === "youtube") {
    if (parts[0] && parts[0].startsWith("@")) return profile(net, parts[0].slice(1));
    if (parts[0] === "channel" && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1] || "")) return `https://www.youtube.com/channel/${parts[1]}`;
    return null;
  }
  // Facebook: profile.php?id=…, /people/<name>/<id>, /pages/<name>/<id>, /p/<Name-id>, or the page's own name.
  if (/^profile\.php$/i.test(parts[0] || "")) { const id = u.searchParams.get("id") || ""; return /^\d{5,20}$/.test(id) ? `https://www.facebook.com/profile.php?id=${id}` : null; }
  if ((parts[0] === "people" || parts[0] === "pages") && /^\d{5,20}$/.test(parts[2] || "")) return `https://www.facebook.com/profile.php?id=${parts[2]}`;
  if (parts[0] === "p" && /-(\d{5,20})$/.test(parts[1] || "")) return `https://www.facebook.com/profile.php?id=${/-(\d{5,20})$/.exec(parts[1])[1]}`;
  if (parts[0] === "pg" && parts[1]) return profile(net, parts[1]);
  if (/^\d{5,20}$/.test(parts[0] || "")) return `https://www.facebook.com/profile.php?id=${parts[0]}`;
  return parts.length ? profile(net, parts[0]) : null;
}

/**
 * The networks in `update` (an object, keys that are missing stay as they are) applied on `current`.
 * Returns { social, errors } with a Hebrew line per value that isn't a profile.
 */
export function applySocial(current, update) {
  const social = { ...(current && typeof current === "object" ? current : {}) }, errors = [];
  for (const net of SOCIAL_KEYS) {
    if (!update || !Object.hasOwn(update, net) || update[net] == null) continue;
    const url = socialUrl(net, update[net]);
    if (url === null) { errors.push(`${NETWORKS[net].label}: זה לא נראה כמו פרופיל. אפשר להדביק את הקישור לפרופיל או לכתוב את שם המשתמש, למשל ${NETWORKS[net].example}.`); continue; }
    if (url) social[net] = url; else delete social[net];
  }
  return { social, errors };
}

// The profiles to show, in a fixed order, each checked again (only a clean URL ever reaches a page).
export function socialList(c) {
  const s = (c && c.social) || {};
  return SOCIAL_KEYS.map((net) => ({ net, label: NETWORKS[net].label, url: s[net] ? socialUrl(net, s[net]) : "" })).filter((x) => x.url);
}
