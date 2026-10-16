// The event photographer, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs (see its comment). Not urgent: no emergency question; the date is what
// matters, and the honest nudge is "one event a day", never fake scarcity. Check: node scripts/tests/trades.test.mjs photographer
// schema.org has no photographer type under LocalBusiness, so ProfessionalService.
export default {
  id: "photographer",
  label: "צלם אירועים",
  trade: "צילום אירועים",
  guides: ["photographer"],
  schema: "ProfessionalService",
  urgent: false,
  words: {
    jobs: "חבילות צילום",
    col: "אירוע",
    time: "שעות צילום",
    open: "לבדוק תאריך",
    how: "מה קורה כשבודקים תאריך",
    status: "מקבלים אירועים חדשים",
    subtitle: "עונה מיד, גם כשאני באמצע אירוע",
    waHello: "אשמח לבדוק אם התאריך שלנו פנוי.",
    lead: "פנייה",
    descEnd: "בודקים תאריך ומקבלים תיק עבודות.",
  },
  steps: [
    ["שלב 1 · 30 שניות", "כותבים בצ׳אט", "איזה אירוע, מתי ואיפה. אם התאריך עוד לא סגור, גם זה בסדר."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, ואני בודק ביומן."],
    ["שלב 3", "תשובה ותיק עבודות", "אני חוזר עם תשובה על התאריך, ושולח אירוע מלא לראות."],
  ],
  chat: {
    issue: { label: "אירוע", ask: "איזה אירוע, ומתי הוא?" },
    photo: null,
    extra: [
      { key: "guests", label: "אורחים", ask: "בערך כמה אורחים?", chips: ["עד 100", "100 עד 250", "250 עד 400", "מעל 400"] },
      { key: "portfolio", label: "תיק עבודות", ask: "לשלוח לכם תיק עבודות בוואטסאפ?", chips: ["שלחו לי תיק עבודות", "לא צריך, תודה"] },
    ],
    urgency: null,
    priceNote: "המחיר לפי שעות הצילום ומספר האורחים.",
  },
  privacyWhat: "שם, טלפון, סוג האירוע, התאריך, המקום, מספר האורחים והישוב",
  fields: {
    headline_1: "יש לכם תאריך?",
    price_note: "מחירים לדוגמה · לפי שעות ומספר אורחים",
    business_hint: "למשל: יונתן צילום",
    ba_hint: "מה רואים, למשל: תמונה לפני העריכה ואחריה",
    video_hint: "מה רואים בסרטון, למשל: רגעים מחתונה בגן אירועים",
  },
  guide: {
    services: [
      { name: "חתונה", detail: "מההתארגנות ועד הרחבה, גלריה ערוכה", time: "6 עד 8 שעות", price: "6,500 עד 11,000 ₪" },
      { name: "חתונה עם צלם שני", detail: "שני צדדים בהתארגנות, קהל ובמה יחד", time: "6 עד 8 שעות", price: "9,000 עד 14,000 ₪" },
      { name: "בר או בת מצווה", detail: "טקס, קבלת פנים ומשפחה", time: "3 עד 5 שעות", price: "3,200 עד 5,500 ₪" },
      { name: "ברית או בריתה", detail: "הטקס, המשפחה והאורחים", time: "שעה עד שעתיים", price: "1,200 עד 2,000 ₪" },
      { name: "אירוע חברה", detail: "כנס, ערב צוות או השקה", time: "לפי שעות", price: "700 עד 1,000 ₪ לשעה" },
      { name: "הצעת נישואין", detail: "צילום מוסתר ברגע ההצעה", time: "שעה", price: "800 עד 1,400 ₪" },
      { name: "צילומי זוגיות", detail: "בחוץ, בשקיעה או בעיר", time: "שעה וחצי", price: "900 עד 1,600 ₪" },
      { name: "צילומי משפחה", detail: "בבית, בפארק או בים", time: "שעה", price: "750 עד 1,300 ₪" },
      { name: "אלבום מודפס", detail: "30 על 30 ס״מ, 40 עמודים, עיצוב איתכם", time: "4 עד 6 שבועות", price: "1,400 עד 2,600 ₪" },
      { name: "מגנטים באירוע", detail: "עמדת הדפסה ותמונה לכל אורח", time: "לפי שעות", price: "לפי הצעת מחיר" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 10:00–20:00", "א׳–ו׳ 9:00–21:00", "א׳–ה׳ 9:00–18:00"],
    warranty: null,
    headlines: [
      { headline_1: "יש לכם תאריך?", headline_2: "אבדוק אם הוא פנוי." },
      { headline_1: "צלם אירועים", headline_2: "חוזר אליכם {when}." },
      { headline_1: "חתונה, בר מצווה, ברית", headline_2: "צילום מכל הערב." },
      { headline_1: "ביום אחד, אירוע אחד", headline_2: "כדאי לבדוק מוקדם." },
    ],
    intros: [
      { intro: "כותבים לי איזה אירוע ומתי, והפרטים מגיעים אליי לוואטסאפ. אבדוק ביומן ואחזור אליכם {when}, עם תיק עבודות." },
      { intro: "ביום אחד אני מצלם אירוע אחד. כתבו לי את התאריך, ואחזור אליכם {when} עם תשובה." },
      { intro: "חתונה, בר מצווה, ברית או אירוע חברה: כתבו לי בקצרה מה מתוכנן, ואחזור אליכם {when}." },
    ],
    servicesAsk: "אילו אירועים אתם מצלמים, ומה כלול בכל חבילה?",
    photosAsk: "תמונות מאירועים שצילמתם, תמונה שלכם עם המצלמה, ודף מאלבום. תמונות של אורחים רק באישור בעלי האירוע.",
  },
};
