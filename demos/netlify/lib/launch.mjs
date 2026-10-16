// The launch kit the owner sees in the builder once the site is live: what brings the first visitors in the first
// weeks, before Google ranks a new site. Their Google Business Profile, a WhatsApp status, a post for local groups and
// the address for each social network's bio, each with its own tagged link (0006_links.sql) on a נציג AI site, so the panel shows what each one brought.
// Texts in the owner's first person, from their own facts only. Nothing here promises customers.
import { getClient, addLink, linkUrl, db, q } from "./leads.mjs";
import { templateOf } from "./builder.mjs";
import { SOCIAL_KEYS, NETWORKS } from "./social.mjs";

const LINKS = { gbp: "פרופיל בגוגל", status: "סטטוס בוואטסאפ", groups: "קבוצות ופוסטים" };
// The site's address for each network's bio, with its own tagged link, so the panel shows what each network brought.
// The label is the link's name in the panel; "how" says where to paste it.
const SOCIAL_LINKS = {
  instagram: { label: "ביו באינסטגרם", how: "באינסטגרם: עריכת פרופיל, ואז ״קישורים״. הקישור יופיע בביו." },
  facebook: { label: "פייסבוק", how: "בדף העסק בפייסבוק: עריכת הפרטים, בשדה ״אתר״. אפשר גם בפוסט מוצמד." },
  tiktok: { label: "טיקטוק", how: "בטיקטוק: עריכת פרופיל, בשדה ״אתר״. אין שדה כזה? כתבו את הקישור בביו." },
  youtube: { label: "יוטיוב", how: "ביוטיוב: הגדרות הערוץ, ואז ״קישורים״. וגם בתיאור של כל סרטון." },
};
// The networks the owner gave; none given, all four (they may still have a profile they didn't mention).
const networksOf = (c) => { const have = SOCIAL_KEYS.filter((k) => c.social && c.social[k]); return have.length ? have : SOCIAL_KEYS; };
const yearsHe = (y) => { const n = Number(y); return !n ? "" : n === 1 ? "שנה אחת" : n <= 10 ? `${n} שנים` : `${n} שנה`; };
const first = (n) => String(n || "").trim().split(/\s+/)[0] || "";

// The tagged link per channel, made once (an existing one with the same name is reused).
async function tagged(slug, nets) {
  const client = await getClient(slug).catch(() => null);
  if (!client) return null;
  const have = await db("GET", `ls_links?client_slug=eq.${q(slug)}&select=code,label`);
  const out = {};
  const want = { ...LINKS, ...Object.fromEntries(nets.map((n) => ["social_" + n, SOCIAL_LINKS[n].label])) };
  for (const [k, label] of Object.entries(want)) {
    let row = have.find((l) => l.label === label);
    if (!row) { const r = await addLink(client, label); row = r.link || null; }
    if (row) out[k] = linkUrl(client, row.code);
  }
  return out;
}

export async function launchKit(d) {
  if (d.status !== "published" || !d.site_host) return null;
  const c = d.content, t = templateOf(d);
  const site = `https://${d.site_host}/`;
  const nets = networksOf(c);
  let links = null;
  if (d.package === "ai" && d.published_slug) { try { links = await tagged(d.published_slug, nets); } catch (e) { console.error("launch links", e.message); } }
  const url = (k) => (links && links[k]) || site;
  const trade = String(c.trade || t.label || "").trim(), area = String(c.area || "").trim(), owner = first(c.owner_name);
  const prices = (c.services || []).some((s) => s.price);
  const back = c.response_time ? `, ואני חוזר תוך ${String(c.response_time).trim()}` : "";
  const years = yearsHe(c.years);
  return {
    site,
    tracked: Boolean(links),
    gbp: {
      link: url("gbp"),
      steps: [
        "נכנסים ל-business.google.com עם חשבון הגוגל של העסק, ובוחרים ״להוסיף עסק״.",
        `קטגוריה: ${trade}.`,
        `אזור שירות: ${(c.towns || []).slice(0, 8).join(", ") || area}. בלי כתובת, אם אין חנות שלקוחות מגיעים אליה.`,
        ...(c.hours ? [`שעות פעילות: ${c.hours}.`] : []),
        "אתר: הקישור שלמטה. כך רואים בפאנל כמה הגיעו מגוגל.",
        "מעלים לפחות 5 תמונות של עבודות, ומבקשים מ-3 לקוחות אחרונים לכתוב ביקורת.",
      ],
    },
    status: { link: url("status"), text: `פתחתי אתר לעסק: ${trade}${area ? " ב" + area : ""}. אפשר לראות שם ${prices ? "מחירים, " : ""}לשלוח תמונה ולפנות בכל שעה${back}.\n${url("status")}` },
    // One link per network, for its bio. On a נוכחות site (no lead system) the plain address, same instructions.
    social: nets.map((n) => ({ id: n, name: NETWORKS[n].label, profile: (c.social && c.social[n]) || "", link: url("social_" + n), how: SOCIAL_LINKS[n].how })),
    groups: { link: url("groups"), text: `היי לכולם, אני ${owner || c.business_name}, ${trade}${area ? " ב" + area : ""}${years ? `, ${years} בתחום` : ""}. פתחתי אתר${prices ? " עם המחירים שלי" : ""}, ואפשר לפנות דרכו בכל שעה. שמרו אותו למקרה שתצטרכו:\n${url("groups")}` },
  };
}
