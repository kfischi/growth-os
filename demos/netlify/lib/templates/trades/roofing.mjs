// Waterproofing and roofs, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs. Check: node scripts/tests/trades.test.mjs roofing
// Urgent in the rainy season. Water near electricity: the electrician, never "touch it". Never go up on a wet roof.
// A shared roof goes through the building's committee (נציגות).
export default {
  id: "roofing",
  label: "איטום וגגות",
  trade: "איטום וגגות",
  guides: ["roofing"],
  schema: "RoofingContractor",
  urgent: true,
  callbackStep: false,  // step 3 is the inspection and the price: a time next to it would read as the inspection
  plural: true,  // the business speaks as "אנחנו"
  greet: "היי, כאן {name} 👋\nאנחנו כנראה על גג, אבל בצ׳אט הזה עונים מיד. כמה שאלות קצרות ונחזור אליכם.",
  words: {
    jobs: "העבודות הנפוצות",
    col: "מה צריך",
    time: "זמן עבודה",
    open: "לפתוח קריאה",
    how: "מה קורה כשפותחים קריאה",
    status: "מקבלים קריאות",
    subtitle: "חוזרים אליכם עם זמן בדיקה",
    waHello: "יש לי נזילה ואשמח שתחזרו אליי.",
    lead: "קריאה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מתארים בצ׳אט", "איפה דולף, איזה בניין ואיזה גג. אפשר לצרף תמונה."],
    ["שלב 2 · מיד", "הפרטים אצלנו", "הפרטים מגיעים אלינו בוואטסאפ, גם כשאנחנו על גג."],
    ["שלב 3", "בדיקה ומחיר", "חוזרים עם זמן בדיקה. את המחיר נותנים אחרי שרואים."],
  ],
  chat: {
    issue: { label: "מה צריך", ask: "מה צריך?" },
    photo: "יש תמונה של הכתם, של הנזילה או של הגג? כך מגיעים מוכנים.",
    extra: [
      { key: "spot", label: "איפה דולף", ask: "איפה רואים את המים?", chips: ["תקרה", "קיר", "סביב חלון", "הגג עצמו"] },
      { key: "building", label: "בניין", ask: "איזה בניין?", chips: ["בית פרטי", "דירה מתחת לגג", "גג משותף בבניין"] },
      { key: "roof", label: "גג", ask: "איזה גג?", chips: ["בטון", "רעפים", "פאנלים או איסכורית", "לא יודעים"] },
    ],
    urgency: { label: "דחיפות", ask: "כמה זה דחוף?", chips: ["מטפטף עכשיו", "אחרי כל גשם", "רק כתם"],
      tip: { id: "leak-now", text: "בינתיים: מרחיקים מכשירי חשמל מהמים. מים ליד שקעים? מורידים את המפסק וקוראים לחשמלאי. לא עולים לגג רטוב." } },
    urgentNote: "גג משותף? את העבודה מתאמים עם הנציגות של הבניין.",
    priceNote: "המחיר הסופי אחרי בדיקה בגג.",
  },
  privacyWhat: "שם, טלפון, מה צריך, איפה דולף, הבניין, סוג הגג, הדחיפות והיישוב, ותמונה אם בחרתם לצרף",
  fields: {
    headline_1: "דולף מהתקרה?",
    price_note: "טווחי מחיר · המחיר הסופי אחרי בדיקה",
    business_hint: "למשל: שחר איטום וגגות",
    ba_hint: "מה רואים ואיפה, למשל: גג בטון לפני האיטום ואחריו",
    video_hint: "מה רואים בסרטון, למשל: פריסת יריעות על גג",
  },
  guide: {
    services: [
      { name: "איתור נזילה", detail: "מוצאים מאיפה המים נכנסים", time: "עד שעתיים", price: "400 עד 800 ₪" },
      { name: "איטום גג ביריעות ביטומניות", detail: "יריעות מולחמות וצבע מגן", time: "1 עד 3 ימים", price: "90 עד 140 ₪ למ״ר" },
      { name: "איטום ביריעה נוזלית", detail: "שכבה מרוחה, עם רשת בפינות ובסדקים", time: "1 עד 2 ימים", price: "70 עד 120 ₪ למ״ר" },
      { name: "איטום בפוליאוריאה", detail: "ציפוי בהתזה, בלי תפרים", time: "1 עד 2 ימים", price: "160 עד 260 ₪ למ״ר" },
      { name: "תיקון רעפים", detail: "רעפים שבורים, יריעה מתחת ומרזבים", time: "יום עבודה", price: "800 עד 2,500 ₪" },
      { name: "איטום מרפסת", detail: "מרפסת שמטפטפת לשכנים מלמטה", time: "2 עד 5 ימים", price: "2,500 עד 6,000 ₪" },
      { name: "ניקוי מרזבים וניקוז", detail: "לפני החורף, כולל בדיקה של הגג", time: "עד שעתיים", price: "350 עד 700 ₪" },
      { name: "איטום גג משותף", detail: "מול הנציגות, עם הצעה מפורטת", time: "לפי גודל", price: "לפי הצעת מחיר" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 7:00–18:00", "א׳–ו׳ 7:00–19:00", "24/7"],
    warranty: ["5 שנים", "7 שנים", "10 שנים"],
    headlines: [
      { headline_1: "דולף מהתקרה?", headline_2: "חוזרים {when}." },
      { headline_1: "איטום לפני החורף", headline_2: "בדיקה לפני מחיר." },
      { headline_1: "נזילה מהגג?", headline_2: "שולחים תמונה בצ׳אט." },
    ],
    intros: [
      { intro: "כותבים בצ׳אט איפה דולף ואיזה גג, ושולחים תמונה. הפרטים מגיעים אלינו לוואטסאפ, וחוזרים אליכם {when} עם זמן בדיקה." },
      { intro: "גג בטון, רעפים או מרפסת. את המחיר נותנים אחרי בדיקה בגג. כתבו לנו, וחוזרים {when}." },
    ],
    servicesAsk: "אילו עבודות איטום אתם עושים, ובכמה?",
    photosAsk: "תמונות של גגות לפני ואחרי איטום, ושל העבודה עצמה. בלי פרטים של לקוחות.",
  },
};
