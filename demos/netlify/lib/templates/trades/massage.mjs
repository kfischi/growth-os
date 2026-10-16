// The massage therapist, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs massage
// Not an urgent trade: no urgency question. Therapeutic only. The guides say see a doctor first for anything medical,
// and the chat never asks for health details. The owner confirms every slot; never automatic booking.
export default {
  id: "massage",
  label: "מעסה",
  trade: "עיסוי ומסאז׳",
  guides: ["massage"],
  schema: "HealthAndBeautyBusiness",
  urgent: false,
  words: {
    jobs: "הטיפולים",
    col: "טיפול",
    time: "משך",
    open: "לקבוע טיפול",
    how: "מה קורה כשקובעים טיפול",
    status: "מקבלים מטופלים חדשים",
    subtitle: "עונה מיד, גם כשהידיים בטיפול",
    waHello: "אשמח לקבוע עיסוי.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "איזה עיסוי, כמה זמן, ובאילו ימים ושעות נוח לכם."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם באמצע טיפול."],
    ["שלב 3", "מתאמים טיפול", "בין טיפול לטיפול חוזרים אליכם ומאשרים יום ושעה."],
  ],
  chat: {
    issue: { label: "עיסוי", ask: "איזה עיסוי מתאים לכם?" },
    photo: null,
    extra: [
      { key: "length", label: "אורך", ask: "כמה זמן טיפול?", chips: ["45 דקות", "60 דקות", "90 דקות", "עוד לא יודעים"] },
      { key: "place", label: "מקום", ask: "בקליניקה או ביקור בית?", chips: ["בקליניקה", "ביקור בית", "לא משנה"] },
    ],
    urgency: null,
    priceNote: "טווח לפי המחירון. המחיר לפי אורך הטיפול.",
  },
  privacyWhat: "שם, טלפון, סוג העיסוי, אורך הטיפול, בקליניקה או בבית, והישוב",
  fields: {
    headline_1: "הגב תפוס? כתבו לי.",
    price_note: "מחירים לדוגמה · ביקור בית בתוספת",
    business_hint: "למשל: רוני עיסוי טיפולי",
    ba_hint: "מה רואים, למשל: חדר הטיפול והמיטה",
    video_hint: "מה רואים בסרטון, למשל: חדר הטיפול והמגבות",
  },
  guide: {
    services: [
      { name: "עיסוי גב ועורף", detail: "עורף, כתפיים וגב עליון", time: "45 דקות", price: "220 עד 280 ₪" },
      { name: "עיסוי גוף מלא", detail: "גב, רגליים, ידיים ועורף", time: "60 דקות", price: "280 עד 360 ₪" },
      { name: "עיסוי רקמות עמוק", detail: "לחץ חזק ואיטי על שרירים תפוסים", time: "60 דקות", price: "300 עד 380 ₪" },
      { name: "עיסוי ספורט", detail: "לפני תחרות או אחרי אימון", time: "60 דקות", price: "300 עד 380 ₪" },
      { name: "עיסוי הרפיה ארוך", detail: "לחץ רך, כל הגוף", time: "90 דקות", price: "400 עד 480 ₪" },
      { name: "עיסוי בהריון", detail: "באישור הרופא, בשכיבה על הצד", time: "60 דקות", price: "300 עד 360 ₪" },
      { name: "עיסוי באבנים חמות", detail: "אבני בזלת חמות על הגב", time: "75 דקות", price: "340 עד 420 ₪" },
      { name: "ביקור בית", detail: "מגיעים עם מיטה, מגבות ושמנים", price: "תוספת 80 עד 120 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 8:00–20:00", "א׳–ו׳ 9:00–19:00", "א׳–ה׳ 10:00–21:00"],
    warranty: null,
    headlines: [
      { headline_1: "הגב תפוס? כתבו לי.", headline_2: "חוזרים {when}." },
      { headline_1: "עיסוי גב, ספורט והרפיה", headline_2: "בקליניקה או בבית." },
      { headline_1: "60 דקות בלי טלפון", headline_2: "הצ׳אט עונה בינתיים." },
      { headline_1: "איפה כואב לכם?", headline_2: "מספרים בצ׳אט." },
    ],
    intros: [
      { intro: "כותבים איזה עיסוי, כמה זמן ומתי נוח לכם, והפרטים מגיעים אליי לוואטסאפ. חוזרים אליכם {when} לתאם טיפול." },
      { intro: "בזמן טיפול הידיים עסוקות והטלפון בשקט. כתבו כאן מה כואב ומתי נוח לכם, וחוזרים אליכם {when}, בין טיפול לטיפול." },
      { intro: "רוצים לדעת כמה זה עולה? בצ׳אט יש טווח מהמחירון לפי אורך הטיפול. משאירים פרטים, וחוזרים אליכם {when}." },
    ],
    servicesAsk: "אילו עיסויים אתם נותנים, כמה זמן, ובכמה?",
    photosAsk: "תמונות של חדר הטיפול, המיטה, המגבות והשמנים. בלי מטופלים, ובלי שום פרט מזהה.",
  },
};
