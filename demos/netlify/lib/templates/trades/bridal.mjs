// The bridal dress studio, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs bridal
// Not an urgent trade: no urgency question. Fittings by appointment only: the studio confirms every time itself, never
// automatic booking or free slots. The price is closed in writing after the first fitting, and the delivery date is set
// only after a fitting, never promised before. The chat asks no town: the bride comes to the studio.
// schema.org has no bridal shop type, so ClothingStore.
export default {
  id: "bridal",
  label: "סטודיו לשמלות כלה",
  trade: "שמלות כלה",
  guides: ["bridal"],
  schema: "ClothingStore",
  urgent: false,
  plural: true,  // the studio speaks as "אנחנו": the chat says "אלינו", "אצלנו"
  greet: "היי, כאן {name}.\nכמה שאלות קצרות על החתונה ועל השמלה, ונחזור אליכם לתאם מדידה.",
  words: {
    jobs: "המחירון",
    col: "שמלה",
    time: "מדידות",
    open: "לתאם מדידה",
    how: "מה קורה כשמתאמים מדידה",
    status: "מתאמים מדידות",
    subtitle: "עונים מיד, גם כשאנחנו באמצע מדידה",
    waHello: "אשמח לתאם מדידה לשמלת כלה.",
    lead: "פנייה",
    descEnd: "מתאמים מדידה ורואים טווח מחיר.",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "מתי החתונה, השכרה או עיצוב אישי, ואיזו גזרה אתם אוהבים."],
    ["שלב 2 · מיד", "הפרטים אצלנו", "הפרטים מגיעים אלינו בוואטסאפ, גם כשאנחנו באמצע מדידה."],
    ["שלב 3", "מתאמים מדידה", "אנחנו חוזרים אליכם, ואת שעת המדידה מאשרים בהודעה."],
  ],
  chat: {
    issue: { label: "שמלה", ask: "השכרה או עיצוב אישי, ובאיזו גזרה?" },
    photo: "יש תמונת השראה? שמלה שאהבתם, או פרט מסוים.",
    extra: [
      { key: "wedding", label: "חתונה", ask: "מזל טוב! מתי החתונה?", chips: ["פחות מ-3 חודשים", "3 עד 6 חודשים", "6 עד 12 חודשים", "יותר משנה", "עוד לא סגרנו"] },
      { key: "size", label: "מידה", ask: "באיזו מידה בערך? את המידות לוקחים במדידה.", chips: ["34 עד 36", "38 עד 40", "42 עד 44", "46 ומעלה", "מעדיפים לדלג"] },
      { key: "budget", label: "תקציב", ask: "מה התקציב בערך?", chips: ["עד 4,000 ₪", "4,000 עד 7,000 ₪", "7,000 עד 12,000 ₪", "מעל 12,000 ₪", "עוד לא יודעים"] },
    ],
    urgency: null,
    noCity: true,
    priceNote: "טווח לדוגמה. את המחיר סוגרים בכתב אחרי המדידה הראשונה.",
  },
  privacyWhat: "שם, טלפון, השמלה שמעניינת אתכם, מועד החתונה, המידה והתקציב בערך, ותמונת השראה אם בחרתם לצרף",
  fields: {
    headline_1: "שמלת כלה?",
    price_note: "מחירים לדוגמה · נסגרים בכתב אחרי מדידה",
    business_hint: "למשל: אטלייה נוגה",
    ba_hint: "מה רואים, למשל: השמלה לפני ההתאמה ואחריה, באישור הכלה",
    video_hint: "מה רואים בסרטון, למשל: הסטודיו ושמלות על הקולב",
  },
  guide: {
    services: [
      { name: "השכרת שמלה, גזרת A", detail: "כולל התאמות מידה וניקוי אחרי החתונה", time: "2 עד 3 מדידות", price: "2,800 עד 4,500 ₪" },
      { name: "השכרת שמלה, בתולת ים", detail: "כולל התאמות מידה וניקוי אחרי החתונה", time: "2 עד 3 מדידות", price: "3,500 עד 5,500 ₪" },
      { name: "השכרת שמלה, גזרה ישרה", detail: "כולל התאמות מידה וניקוי אחרי החתונה", time: "2 עד 3 מדידות", price: "2,500 עד 4,000 ₪" },
      { name: "השכרת שמלה, נסיכה", detail: "כולל התאמות מידה, תחתונית וניקוי", time: "2 עד 3 מדידות", price: "4,000 עד 6,500 ₪" },
      { name: "עיצוב אישי, גזרת A", detail: "סקיצה, בד לבחירה ו-4 עד 6 מדידות", time: "4 עד 6 מדידות", price: "7,000 עד 12,000 ₪" },
      { name: "עיצוב אישי, בתולת ים", detail: "סקיצה, בד לבחירה ו-4 עד 6 מדידות", time: "4 עד 6 מדידות", price: "8,500 עד 14,000 ₪" },
      { name: "עיצוב אישי, גזרה ישרה", detail: "סקיצה, בד לבחירה ו-4 עד 6 מדידות", time: "4 עד 6 מדידות", price: "6,000 עד 10,000 ₪" },
      { name: "עיצוב אישי, נסיכה", detail: "שכבות טול, סקיצה ו-4 עד 6 מדידות", time: "4 עד 6 מדידות", price: "10,000 עד 16,000 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 10:00–20:00", "א׳–ה׳ 10:00–19:00", "א׳–ה׳ 11:00–21:00"],
    warranty: null,
    headlines: [
      { headline_1: "שמלת כלה?", headline_2: "בוחרים גזרה ומתאמים." },
      { headline_1: "השכרה או עיצוב אישי", headline_2: "חוזרים {when}." },
      { headline_1: "מדידות בתיאום מראש", headline_2: "את השעה נאשר בהודעה." },
      { headline_1: "באמצע מדידה?", headline_2: "הצ׳אט עונה בינתיים." },
    ],
    intros: [
      { intro: "כותבים לנו מתי החתונה ואיזו שמלה אתם מחפשים, והפרטים מגיעים אלינו לוואטסאפ. נחזור אליכם {when} לתאם מדידה." },
      { intro: "בזמן מדידה אנחנו עם הכלה, לא עם הטלפון. כתבו כאן מה אתם מחפשים, ונחזור אליכם {when}." },
      { intro: "השכרה או עיצוב אישי: כתבו לנו בקצרה, ונחזור אליכם {when}. את מועד המסירה קובעים רק אחרי מדידה." },
    ],
    servicesAsk: "אילו שמלות אתם משכירים או מעצבים, ובכמה?",
    photosAsk: "תמונות של שמלות בסטודיו, של הבדים ושל פרטים קרוב. תמונות של כלות רק באישור שלהן.",
  },
};
