// Hair removal (laser and wax), as the site builder knows the trade: the words, the chat, the questionnaire's answers.
// Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs hair-removal
// Not an urgent trade: no urgency question. The clinic speaks as "אנחנו". The chat asks one doctor-first health
// question (yes or no, never details); the first meeting has a test on a small area before anything starts. Never
// permanent results or a number of sessions: a series of 6 is a package price, and results vary from person to person.
export default {
  id: "hair-removal",
  label: "הסרת שיער",
  trade: "הסרת שיער בלייזר ובשעווה",
  guides: ["hair-removal"],
  schema: "HealthAndBeautyBusiness",
  urgent: false,
  plural: true,  // the clinic speaks as "אנחנו": the chat says "אלינו", "אצלנו"
  greet: "היי, כאן {name} 👋\nאנחנו כנראה באמצע טיפול, אבל בצ׳אט הזה עונים מיד. כמה שאלות קצרות ונחזור אליכם לתאם.",
  words: {
    jobs: "המחירון",
    col: "אזור",
    time: "משך",
    open: "לתאם פגישה ראשונה",
    how: "מה קורה כשמתאמים פגישה",
    status: "מקבלים לקוחות חדשים",
    subtitle: "עונים מיד, גם כשאנחנו באמצע טיפול",
    waHello: "אשמח לתאם פגישה ראשונה להסרת שיער.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "לייזר או שעווה, אילו אזורים, ומתי נוח לכם."],
    ["שלב 2 · מיד", "הפרטים אצלנו", "הפרטים מגיעים אלינו בוואטסאפ, גם כשאנחנו באמצע טיפול."],
    ["שלב 3", "פגישה ראשונה", "חוזרים לתאם. בפגישה הראשונה בודקים אזור קטן, ורק אחר כך מתחילים."],
  ],
  chat: {
    issue: { label: "טיפול", ask: "איזה טיפול ואיזה אזור?" },
    photo: null,
    extra: [
      { key: "health", label: "בריאות", ask: "יש הריון, שיזוף אחרון, תרופה שרגישה לאור או מצב עור?", chips: ["לא, אף אחד מאלה", "כן, משהו מזה", "לא בטוחים"] },
      { key: "before", label: "טיפול קודם", ask: "הייתה לכם תגובה לטיפול קודם, בלייזר או בשעווה?", chips: ["לא", "אדמומיות שעברה", "תגובה חזקה יותר", "זה טיפול ראשון"] },
      { key: "slot", label: "שעות", ask: "באילו שעות נוח לכם?", chips: ["בוקר", "צהריים", "ערב", "לא משנה"] },
    ],
    urgency: null,
    priceNote: "מחיר לדוגמה. המחיר הסופי אחרי בדיקה בפגישה הראשונה.",
  },
  privacyWhat: "שם, טלפון, הטיפול והאזור, אם יש מגבלה בריאותית (כן או לא, בלי פרטים), תגובה בעבר, השעות הנוחות והיישוב",
  fields: {
    headline_1: "הסרת שיער בלי לחכות",
    price_note: "מחירים לדוגמה · סדרה היא מחיר חבילה, לא הבטחה",
    business_hint: "למשל: קליניקת אלמה",
    ba_hint: "מה רואים, למשל: חדר הטיפולים ומכשיר הלייזר",
    video_hint: "מה רואים בסרטון, למשל: חדר הטיפולים והמכשיר",
  },
  guide: {
    services: [
      { name: "לייזר: פנים, שפם וסנטר", detail: "לטיפול. סדרה של 6: 600 עד 1,000 ₪", price: "120 עד 200 ₪" },
      { name: "לייזר: בית השחי", detail: "לטיפול. סדרה של 6: 750 עד 1,100 ₪", price: "150 עד 220 ₪" },
      { name: "לייזר: קו ביקיני", detail: "לטיפול. סדרה של 6: 1,000 עד 1,400 ₪", price: "200 עד 280 ₪" },
      { name: "לייזר: ידיים מלאות", detail: "לטיפול. סדרה של 6: 1,500 עד 2,100 ₪", price: "300 עד 420 ₪" },
      { name: "לייזר: שוקיים", detail: "לטיפול. סדרה של 6: 1,600 עד 2,250 ₪", price: "320 עד 450 ₪" },
      { name: "לייזר: ירכיים", detail: "לטיפול. סדרה של 6: 1,900 עד 2,600 ₪", price: "380 עד 520 ₪" },
      { name: "לייזר: גב", detail: "לטיפול. סדרה של 6: 2,000 עד 3,000 ₪", price: "400 עד 600 ₪" },
      { name: "שעווה: פנים", detail: "שפם וסנטר", price: "40 עד 70 ₪" },
      { name: "שעווה: בית השחי", detail: "חוזרים בדרך כלל אחרי 3 עד 5 שבועות", price: "50 עד 70 ₪" },
      { name: "שעווה: קו ביקיני", detail: "חוזרים בדרך כלל אחרי 3 עד 5 שבועות", price: "80 עד 120 ₪" },
      { name: "שעווה: שוקיים", detail: "חוזרים בדרך כלל אחרי 3 עד 5 שבועות", price: "100 עד 140 ₪" },
      { name: "שעווה: גב", detail: "חוזרים בדרך כלל אחרי 3 עד 5 שבועות", price: "120 עד 180 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 9:00–20:00", "א׳–ה׳ 10:00–21:00", "א׳–ו׳ 9:00–19:00"],
    warranty: null,
    headlines: [
      { headline_1: "הסרת שיער בלי לחכות", headline_2: "חוזרים {when}." },
      { headline_1: "כמה עולה לייזר?", headline_2: "המחירון כאן בצ׳אט." },
      { headline_1: "לייזר ושעווה", headline_2: "לנשים ולגברים." },
      { headline_1: "משקפי מגן, טלפון בחוץ", headline_2: "הצ׳אט עונה בינתיים." },
    ],
    intros: [
      { intro: "כותבים לנו איזה טיפול ואיזה אזור, והפרטים מגיעים אלינו לוואטסאפ. נחזור אליכם {when} לתאם פגישה ראשונה." },
      { intro: "בפגישה הראשונה שיחה קצרה ובדיקה על אזור קטן, ורק אחריה מתחילים. כתבו לנו מה מעניין אתכם, ונחזור אליכם {when}." },
      { intro: "בזמן טיפול לייזר הטלפון נשאר בחוץ. כתבו כאן איזה אזור ומתי נוח לכם, ונחזור אליכם {when}, בין טיפול לטיפול." },
    ],
    servicesAsk: "אילו אזורים אתם מטפלים, בלייזר ובשעווה, ובכמה?",
    photosAsk: "תמונות של חדר הטיפולים, של המכשיר או של הקליניקה. בלי לקוחות, ובלי שום פרט מזהה.",
  },
};
