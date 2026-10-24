// Aluminium (windows, sliding doors, nets and shower enclosures), as the site builder knows the trade.
// Same shape and rules as trades/plumber.mjs. Check: node scripts/tests/trades.test.mjs aluminum
// Prices from demos/aluminum/ (its list and calculator): repairs by sample price per sash or opening; a new window
// or door per square metre, the final price only after measuring.
const NEW = "חלון, דלת או רשת חדשים", FIX = "תיקון", SHOWER = "מקלחון";
export default {
  id: "aluminum",
  label: "אלומיניום",
  trade: "אלומיניום",
  guides: ["aluminum"],
  schema: "HomeAndConstructionBusiness",
  urgent: false,
  words: {
    jobs: "העבודות והמחירים",
    col: "עבודה",
    time: "משך",
    open: "לתאר מה צריך",
    how: "מה קורה כשמתארים מה צריך",
    status: "מקבלים פניות",
    subtitle: "עונה מיד, גם כשאני על סולם",
    waHello: "יש לי עבודת אלומיניום ואשמח שתחזור אליי.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מתארים בצ׳אט", "מה צריך, איזה חלון, באיזו קומה, ותמונה של המסילה."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם כשאני על סולם."],
    ["שלב 3", "אני חוזר וקובע", "קובעים זמן הגעה. חלון חדש מקבל מחיר בכתב אחרי מדידה."],
  ],
  chat: {
    issue: { label: "מה צריך", ask: "מה צריך?" },
    photo: "יש תמונה של החלון, של המסילה או של המקום? כך אני מגיע עם החלק הנכון.",
    extra: [
      { key: "kind", label: "סוג", ask: "תיקון, חדש או מקלחון?", chips: [FIX, NEW, SHOWER] },
      { key: "window", label: "איזה חלון", ask: "איזה חלון?", chips: ["חלון הזזה", "דלת הזזה למרפסת", "חלון ציר או נטוי", "לא בטוחים"],
        only: { key: "kind", is: [FIX] } },
      { key: "count", label: "כמה פתחים", ask: "כמה פתחים?", chips: ["אחד", "2 עד 3", "4 ומעלה"], only: { key: "kind", is: [NEW] } },
      { key: "shape", label: "מקלחון", ask: "איזה מקלחון?", chips: ["חזית ישרה", "פינתי", "עוד לא יודעים"], only: { key: "kind", is: [SHOWER] } },
      { key: "floor", label: "קומה", ask: "באיזו קומה?", chips: ["קרקע", "1 עד 4", "5 ומעלה"], only: { key: "kind", is: [FIX, NEW] } },
      { key: "when", label: "מתי", ask: "מתי תרצו?", chips: ["השבוע", "בחודש הקרוב", "לפני החורף", "רק בודקים מחיר"] },
    ],
    urgency: null,
    priceNote: "המחיר הסופי אחרי מדידה.",
  },
  privacyWhat: "שם, טלפון, מה צריך, סוג העבודה, החלון, כמה פתחים, הקומה, מתי והיישוב, ותמונה אם בחרתם לצרף",
  fields: {
    headline_1: "החלון לא זז?",
    price_note: "טווחי מחיר · חלון חדש במחיר בכתב אחרי מדידה",
    business_hint: "למשל: רז אלומיניום",
    ba_hint: "מה רואים ואיפה, למשל: דלת הזזה למרפסת, אשדוד",
    video_hint: "מה רואים בסרטון, למשל: החלפת גלגלות בחלון הזזה",
  },
  guide: {
    services: [
      { name: "החלפת גלגלות", detail: "חלון או דלת הזזה כבדים, תקועים או קופצים", time: "עד שעה לכנף", price: "180 עד 350 ₪ לכנף" },
      { name: "ידית ונעילה", detail: "ידית שבורה, חלון או דלת למרפסת שלא ננעלים", time: "עד שעה", price: "150 עד 350 ₪ לפתח" },
      { name: "רשת נגללת", detail: "נגד יתושים, לפי המידה של החלון הקיים", price: "350 עד 650 ₪ ליחידה" },
      { name: "מקלחון, חזית ישרה", detail: "זכוכית מחוסמת לפי מידה", price: "1,400 עד 2,000 ₪" },
      { name: "מקלחון פינתי", detail: "זכוכית מחוסמת לפי מידה", price: "2,000 עד 2,800 ₪" },
      { name: "חלון הזזה חדש", detail: "פרופיל, זכוכית ורשת, כולל פירוק של הישן", price: "1,300 עד 2,200 ₪ למ״ר" },
      { name: "דלת הזזה למרפסת", detail: "ויטרינה גדולה, על מסילה כפולה או משולשת", price: "1,500 עד 2,600 ₪ למ״ר" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 7:30–17:30", "א׳–ה׳ 8:00–18:00", "א׳–ו׳ 7:00–14:00"],
    warranty: ["6 חודשים", "12 חודשים", "24 חודשים"],
    headlines: [
      { headline_1: "החלון לא זז?", headline_2: "שולחים תמונה בצ׳אט." },
      { headline_1: "איש אלומיניום שעונה.", headline_2: "חוזר {when}." },
      { headline_1: "גלגלות, ידית, רשת?", headline_2: "מגיע עם החלק הנכון." },
      { headline_1: "חלון חדש או מקלחון?", headline_2: "מחיר בכתב אחרי מדידה." },
    ],
    intros: [
      { intro: "כותבים לי מה צריך ושולחים תמונה של החלון או של המסילה, והפרטים מגיעים אליי לוואטסאפ. אחזור אליכם {when} עם זמן הגעה." },
      { intro: "חלון תקוע, ידית שבורה או רשת קרועה: כתבו לי בקצרה, ואחזור {when}. חלון חדש מקבל מחיר בכתב אחרי מדידה." },
    ],
    servicesAsk: "אילו עבודות אלומיניום אתם עושים הכי הרבה, ובכמה?",
    photosAsk: "תמונות של חלונות, דלתות ומקלחונים שהתקנתם או תיקנתם. בלי פרטים של לקוחות.",
  },
};
