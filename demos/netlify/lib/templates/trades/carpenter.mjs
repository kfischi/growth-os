// The carpenter (kitchens, wardrobes, made-to-measure furniture and repairs), as the site builder knows the trade.
// Same shape and rules as trades/plumber.mjs. Check: node scripts/tests/trades.test.mjs carpenter
// Prices from demos/carpenter/ (its list and calculator): per running metre for kitchens and wardrobes, without the
// worktop, sink or appliances. The price in writing only after measuring at home.
const NEW = "בנייה חדשה", FIX = "תיקון";
export default {
  id: "carpenter",
  label: "נגר",
  trade: "נגרות",
  guides: ["carpenter"],
  schema: "HomeAndConstructionBusiness",
  urgent: false,
  callbackStep: false,  // step 3 is the measuring visit and the written price
  words: {
    jobs: "העבודות והמחירים",
    col: "עבודה",
    time: "משך",
    open: "לתאר מה צריך",
    how: "מה קורה כשמתארים מה צריך",
    status: "קובעים מדידות",
    subtitle: "עונה מיד, גם כשאני בנגרייה",
    waHello: "אשמח שתחזור אליי לגבי עבודת נגרות.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · דקה", "מתארים בצ׳אט", "מה צריך, באיזה אורך, איזה גימור, ותמונה של הקיר."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים והתמונה מגיעים אליי בוואטסאפ, גם כשאני בנגרייה."],
    ["שלב 3", "מדידה ומחיר בכתב", "אני מגיע למדוד, ואחרי השרטוט מקבלים מחיר בכתב."],
  ],
  chat: {
    issue: { label: "מה צריך", ask: "מה צריך?" },
    photo: "יש תמונה של הקיר, של שרטוט או של מה שנשבר? כך אני מגיע מוכן.",
    extra: [
      { key: "kind", label: "סוג", ask: "בנייה חדשה או תיקון?", chips: [NEW, FIX] },
      { key: "size", label: "אורך", ask: "כמה מטר בערך, לאורך הקיר?", chips: ["עד 2 מטר", "2 עד 4 מטר", "יותר מ-4 מטר", "עוד לא מדדנו"],
        only: { key: "kind", is: [NEW] } },
      { key: "finish", label: "גימור", ask: "איזה גימור אתם רואים?", chips: ["פורמייקה", "צבע (MDF צבוע)", "פורניר עץ", "עוד לא יודעים"],
        only: { key: "kind", is: [NEW] } },
      { key: "when", label: "מתי", ask: "מתי תרצו להתחיל?", chips: ["בחודש הקרוב", "בעוד חודשיים או שלושה", "רק בודקים מחיר"],
        only: { key: "kind", is: [NEW] } },
      { key: "soon", label: "מתי", ask: "מתי נוח לכם שאגיע?", chips: ["השבוע", "בשבועיים הקרובים", "לא דחוף"],
        only: { key: "kind", is: [FIX] } },
    ],
    urgency: null,
    priceNote: "המחיר הסופי בכתב, אחרי מדידה.",
  },
  privacyWhat: "שם, טלפון, מה צריך, בנייה או תיקון, האורך, הגימור, מתי והיישוב, ותמונה אם בחרתם לצרף",
  fields: {
    headline_1: "מטבח, ארון או מגירה?",
    price_note: "טווחי מחיר · המחיר הסופי בכתב אחרי מדידה",
    business_hint: "למשל: נגריית אלון",
    ba_hint: "מה רואים ואיפה, למשל: ארון קיר לחדר שינה, רחובות",
    video_hint: "מה רואים בסרטון, למשל: הרכבת מטבח בנס ציונה",
  },
  guide: {
    services: [
      { name: "מטבח בפורמייקה", detail: "ארונות תחתונים ועליונים, בלי משטח", price: "3,500 עד 4,800 ₪ למטר רץ" },
      { name: "מטבח בצבע או בפורניר", detail: "MDF צבוע או פורניר עץ, בלי משטח", price: "4,500 עד 6,500 ₪ למטר רץ" },
      { name: "ארון קיר, דלתות ציר", detail: "עד התקרה, והפנים לפי מה ששומרים בו", price: "1,800 עד 2,600 ₪ למטר רץ" },
      { name: "ארון קיר, דלתות הזזה", detail: "עד התקרה, והפנים לפי מה ששומרים בו", price: "2,200 עד 3,200 ₪ למטר רץ" },
      { name: "רהיט בהתאמה", detail: "ספרייה, מזנון, נישה או שולחן עבודה, לפי שרטוט", price: "2,500 עד 9,000 ₪" },
      { name: "צירים בולמים למטבח קיים", detail: "הדלתות נסגרות בשקט, לפי כמות הצירים", time: "חצי יום", price: "600 עד 1,200 ₪" },
      { name: "תיקון מגירה או ציר", detail: "מגירה שיצאה מהמסילה, ציר שנתלש מהדלת", time: "עד שעה", price: "250 עד 450 ₪" },
      { name: "תיקון דלת פנים", detail: "דלת שלא נסגרת, משפשפת ברצפה, ידית רופפת", time: "עד שעה", price: "250 עד 500 ₪" },
    ],
    response: ["שעה", "שעתיים", "3 שעות", "באותו יום", "עד מחר"],
    hours: ["א׳–ה׳ 7:00–17:00", "א׳–ה׳ 8:00–18:00", "א׳–ו׳ 7:00–14:00"],
    warranty: ["12 חודשים", "24 חודשים", "5 שנים"],
    headlines: [
      { headline_1: "מטבח, ארון או מגירה?", headline_2: "מחיר בכתב אחרי מדידה." },
      { headline_1: "נגר שעונה.", headline_2: "חוזר {when}." },
      { headline_1: "מטבחים וארונות", headline_2: "לפי המידה של הקיר." },
      { headline_1: "מגירה נתקעה?", headline_2: "שולחים תמונה בצ׳אט." },
    ],
    intros: [
      { intro: "כותבים לי מה צריך ושולחים תמונה של הקיר, והפרטים מגיעים אליי לוואטסאפ. אחזור אליכם {when} עם זמן למדידה." },
      { intro: "מטבח, ארון קיר או ציר שנתלש: כתבו לי בקצרה, ואחזור {when}. את המחיר אני נותן בכתב אחרי מדידה בבית." },
      { intro: "מדידה בבית, שרטוט ומחיר בכתב לפני הייצור. שלחו לי מה צריך ותמונה, ואחזור אליכם {when}." },
    ],
    servicesAsk: "אילו עבודות נגרות אתם עושים הכי הרבה, ובכמה למטר רץ?",
    photosAsk: "תמונות של מטבחים, ארונות ורהיטים שבניתם, מכמה זוויות. בלי פרטים של לקוחות.",
  },
};
