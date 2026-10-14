// Schema.org JSON-LD for a business's site, from the facts the owner gave in the builder, so Google
// understands what the business is, where it works, when it is open and what it charges.
// Only facts: nothing is added that the owner didn't say (no ratings, no address, no opening hours guessed).

// The trade, as Google knows it. Anything else is a home services business.
const TYPES = [
  [/אינסטל/, "Plumber"],
  [/חשמל/, "Electrician"],
  [/מנעול/, "Locksmith"],
  [/מיזוג|מזגנ/, "HVACBusiness"],
  [/צבע|צביעה/, "HousePainter"],
  [/גגות|איטום גג/, "RoofingContractor"],
  [/שיפוצ|קבלן/, "GeneralContractor"],
];
export function schemaType(trade) {
  const t = String(trade || "");
  const hit = TYPES.find(([re]) => re.test(t));
  return hit ? hit[1] : "HomeAndConstructionBusiness";
}

// "24/7", or the questionnaire's "א׳–ה׳ 8:00–18:00". Anything else: no hours in the schema.
const DAY = { "א": "Su", "ב": "Mo", "ג": "Tu", "ד": "We", "ה": "Th", "ו": "Fr", "ש": "Sa" };
const ORDER = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export function openingHours(text) {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  if (/^24\/7$|^24 שעות/.test(t)) return { "@type": "OpeningHoursSpecification", dayOfWeek: ORDER.map(dayName), opens: "00:00", closes: "23:59" };
  const m = /^([א-ש])['׳]?\s*[–-]\s*([א-ש])['׳]?\s+(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/.exec(t);
  if (!m || !DAY[m[1]] || !DAY[m[2]]) return null;
  const a = ORDER.indexOf(DAY[m[1]]), b = ORDER.indexOf(DAY[m[2]]);
  if (b < a || +m[3] > 23 || +m[5] > 24 || +m[4] > 59 || +m[6] > 59) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return { "@type": "OpeningHoursSpecification", dayOfWeek: ORDER.slice(a, b + 1).map(dayName), opens: `${pad(m[3])}:${m[4]}`, closes: `${pad(m[5])}:${m[6]}` };
}
function dayName(d) { return { Su: "Sunday", Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday" }[d]; }

// "250 עד 450 ₪", "1,200 ₪", "מ-300 ₪". Anything else (for example "לפי הצעת מחיר"): no price.
export function priceRange(text) {
  const nums = (String(text || "").match(/\d[\d,]*/g) || []).map((n) => Number(n.replace(/,/g, ""))).filter((n) => n > 0);
  if (!nums.length || nums.length > 2 || !/₪|ש"ח|ש״ח|שקל/.test(text)) return null;
  const [min, max] = nums.length === 2 ? nums : [nums[0], nums[0]];
  if (max < min) return null;
  return min === max
    ? { "@type": "PriceSpecification", price: min, priceCurrency: "ILS" }
    : { "@type": "PriceSpecification", minPrice: min, maxPrice: max, priceCurrency: "ILS" };
}

/**
 * The JSON-LD object for the site.
 * @param c        the template's content
 * @param o.phone  "+972…" to call, or ""
 * @param o.image  an absolute URL of the owner's photo, or ""
 * @param o.url    the site's address, or ""
 */
export function localBusiness(c, { phone = "", image = "", url = "", description = "", type = "" } = {}) {
  const s = (v) => String(v || "").trim();
  const towns = (c.towns || []).map(s).filter(Boolean);
  const hours = openingHours(c.hours);
  const offers = (c.services || []).filter((x) => s(x.name)).map((x) => {
    const price = priceRange(x.price);
    return {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s(x.name), ...(s(x.detail) ? { description: s(x.detail) } : {}) },
      ...(price ? { priceSpecification: price } : {}),
    };
  });
  return {
    "@context": "https://schema.org",
    "@type": type || schemaType(c.trade),
    name: s(c.business_name),
    ...(description ? { description } : {}),
    ...(url ? { url } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(image ? { image } : {}),
    ...(s(c.owner_name) ? { founder: { "@type": "Person", name: s(c.owner_name) } } : {}),
    ...(towns.length || s(c.area) ? { areaServed: towns.length ? towns : s(c.area) } : {}),
    ...(hours ? { openingHoursSpecification: [hours] } : {}),
    ...(offers.length ? { hasOfferCatalog: { "@type": "OfferCatalog", name: s(c.trade) || "שירותים", itemListElement: offers } } : {}),
    knowsLanguage: "he",
  };
}
