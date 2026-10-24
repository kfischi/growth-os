// The barber, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs barber
// Not an urgent trade: no urgency question. The barber confirms every slot himself; the site never books by itself.
// schema.org has no BarberShop type, so the site is a HairSalon.
export default {
  id: "barber",
  label: "ספר",
  trade: "ספרות",
  guides: ["barber"],
  schema: "HairSalon",
  urgent: false,
  callbackStep: false,  // step 3 is the slot: a time next to it would read as a free slot
  words: {
    jobs: "המחירון",
    col: "שירות",
    time: "משך",
    open: "לבקש תור",
    how: "מה קורה כשמבקשים תור",
    status: "מקבלים לקוחות חדשים",
    subtitle: "עונה מיד, גם כשאני באמצע תספורת",
    waHello: "אשמח לתור לתספורת.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "תספורת, זקן או שניהם, ומתי נוח לכם להגיע."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם כשהמכונה ביד."],
    ["שלב 3", "שעה פנויה", "בין לקוח ללקוח אני חוזר אליכם עם שעה פנויה ומאשר."],
  ],
  chat: {
    issue: { label: "מה עושים", ask: "מה עושים הפעם?" },
    photo: null,
    extra: [
      { key: "day", label: "מתי", ask: "מתי נוח לכם להגיע?", chips: ["היום", "מחר", "השבוע", "לא משנה"] },
      { key: "slot", label: "שעות", ask: "ובאיזה זמן ביום?", chips: ["בוקר", "צהריים", "ערב"] },
      { key: "first", label: "ביקור", ask: "הייתם אצלי בעבר?", chips: ["פעם ראשונה", "כבר הייתי"] },
    ],
    urgency: null,
    priceNote: "טווח לפי המחירון. המחיר הסופי לפי השיער.",
  },
  privacyWhat: "שם, טלפון, מה רוצים לעשות, מתי נוח להגיע, אם הייתם כבר במספרה והיישוב",
  fields: {
    headline_1: "יש תור היום?",
    price_note: "מחירים לדוגמה · המחיר הסופי לפי השיער",
    business_hint: "למשל: המספרה של שי",
    ba_hint: "מה רואים, למשל: פייד לפני ואחרי, באישור הלקוח",
    video_hint: "מה רואים בסרטון, למשל: הכיסא, המראה והכלים",
  },
  guide: {
    services: [
      { name: "תספורת גבר", detail: "מכונה ומספריים, כולל שטיפה", time: "30 דקות", price: "70 עד 90 ₪" },
      { name: "פייד", detail: "מעבר הדרגתי בצדדים, קו חד", time: "40 דקות", price: "80 עד 100 ₪" },
      { name: "תספורת וזקן", detail: "תספורת, עיצוב זקן וקווים", time: "45 דקות", price: "100 עד 130 ₪" },
      { name: "זקן בלבד", detail: "עיצוב, קווים ומגבת חמה", time: "20 דקות", price: "40 עד 60 ₪" },
      { name: "תספורת ילד", detail: "עד גיל 12", time: "25 דקות", price: "50 עד 70 ₪" },
      { name: "צבע או גוונים", detail: "אחרי בדיקת רגישות", time: "45 עד 90 דקות", price: "120 עד 250 ₪" },
      { name: "סידור גבות", detail: "במספריים ובתער", time: "10 דקות", price: "20 עד 40 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 9:00–20:00", "א׳–ו׳ 9:00–19:00", "א׳–ה׳ 10:00–21:00"],
    warranty: null,
    headlines: [
      { headline_1: "יש תור היום?", headline_2: "אני חוזר {when}." },
      { headline_1: "המכונה ביד", headline_2: "הצ׳אט עונה בינתיים." },
      { headline_1: "תספורת וזקן", headline_2: "בלי לחכות על הקו." },
      { headline_1: "רוצים תור?", headline_2: "כותבים, ואני חוזר." },
    ],
    intros: [
      { intro: "כותבים לי מה עושים ומתי נוח לכם, והפרטים מגיעים אליי לוואטסאפ. אחזור אליכם {when} עם שעה פנויה." },
      { intro: "רוצים לדעת כמה זה עולה? בצ׳אט יש טווח מהמחירון. כתבו מתי נוח לכם, ואחזור אליכם {when} לאשר שעה." },
      { intro: "בזמן תספורת אני לא עונה לטלפון. כתבו כאן מה רוצים ומתי, ואחזור אליכם {when}, בין לקוח ללקוח." },
    ],
    servicesAsk: "אילו שירותים אתם נותנים, ובכמה?",
    photosAsk: "תמונות של המספרה, של הכיסא והכלים או של תספורות שעשיתם. תמונות של לקוחות רק באישור שלהם.",
  },
};
