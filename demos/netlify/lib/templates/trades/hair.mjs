// The women's hair stylist, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs hair
// Not an urgent trade: no urgency question. She confirms every slot herself: the chat collects days and hours, never
// books, and never shows a free slot. A first colour gets a patch test 48 hours before; after a past reaction to
// colour, a dermatologist first (the guides "patch-test" and "reaction" say so).
export default {
  id: "hair",
  label: "מעצבת שיער",
  trade: "עיצוב שיער",
  guides: ["hair"],
  schema: "HairSalon",
  urgent: false,
  greet: "היי, כאן {name} 👋\nאני כנראה באמצע צבע, אבל בצ׳אט הזה עונים מיד. כמה שאלות קצרות ואחזור אליכם לתאם.",
  words: {
    jobs: "המחירון",
    col: "טיפול",
    time: "משך",
    open: "לבקש תור",
    how: "מה קורה כשמבקשים תור",
    status: "מקבלת לקוחות חדשות",
    subtitle: "עונה מיד, גם כשאני באמצע צבע",
    waHello: "אשמח לקבוע תור לשיער.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "איזה טיפול, מה אורך השיער ומתי נוח לכם. אפשר לצרף תמונה."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם כשהידיים שלי בכפפות."],
    ["שלב 3", "מאשרים תור", "בין לקוחה ללקוחה אני חוזרת, ואת היום והשעה אני מאשרת בעצמי."],
  ],
  chat: {
    issue: { label: "טיפול", ask: "מה עושים לשיער?" },
    photo: "יש תמונה של השיער היום, או תמונת השראה? כך הטווח מדויק יותר.",
    extra: [
      { key: "length", label: "אורך", ask: "מה אורך השיער היום?", chips: ["קצר", "עד הכתפיים", "ארוך", "ארוך מאוד"] },
      { key: "colour", label: "צבע בעבר", ask: "צבעתם בעבר, או שזה צבע ראשון?", chips: ["צבעתי בעבר בלי בעיה", "צבע ראשון", "הייתה לי תגובה לצבע", "לא צובעים הפעם"] },
      { key: "slot", label: "שעות", ask: "באילו שעות נוח לכם?", chips: ["בוקר", "צהריים", "אחר הצהריים", "לא משנה"] },
    ],
    urgency: null,
    priceNote: "טווח לפי המחירון. המחיר לפי אורך השיער ועוביו.",
  },
  privacyWhat: "שם, טלפון, הטיפול, אורך השיער, אם צבעתם בעבר, תמונה אם צירפתם, השעות הנוחות והיישוב",
  fields: {
    headline_1: "מה עושים לשיער הפעם?",
    price_note: "מחירים לדוגמה · בצבע ובהחלקה לפי אורך ועובי",
    business_hint: "למשל: שירה לוי עיצוב שיער",
    ba_hint: "מה רואים, למשל: גוונים לפני ואחרי, באישור הלקוחה",
    video_hint: "מה רואים בסרטון, למשל: פן אחרי צבע, מאחור",
  },
  guide: {
    services: [
      { name: "תספורת ופן", detail: "חפיפה, תספורת וייבוש", time: "שעה", price: "180 עד 280 ₪" },
      { name: "פן", detail: "חפיפה וייבוש, חלק או גלי", time: "30 עד 45 דקות", price: "90 עד 140 ₪" },
      { name: "צבע שורש", detail: "עד 3 סנטימטרים של צמיחה, עם פן", time: "שעה וחצי", price: "250 עד 320 ₪" },
      { name: "צבע מלא", detail: "לפי אורך השיער", time: "שעתיים", price: "300 עד 600 ₪" },
      { name: "גוונים", detail: "גוונים עדינים או בלונד מעבר, לפי אורך", time: "2 עד 3 שעות", price: "450 עד 850 ₪" },
      { name: "החלקה", detail: "לפי אורך ועובי. שואלים מה יש בחומר", time: "3 עד 4 שעות", price: "700 עד 1,600 ₪" },
      { name: "תסרוקת ערב", detail: "לאירוע, בסטודיו", time: "שעה", price: "250 עד 400 ₪" },
      { name: "כלה: ניסיון ויום החתונה", detail: "ניסיון כחודש לפני, ותסרוקת ביום עצמו", price: "1,400 עד 2,200 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 9:00–19:00", "א׳–ו׳ 9:00–19:00", "א׳–ה׳ 10:00–20:00"],
    warranty: null,
    headlines: [
      { headline_1: "מה עושים לשיער הפעם?", headline_2: "אני חוזרת {when}." },
      { headline_1: "כמה עולים גוונים?", headline_2: "הטווח כאן בצ׳אט." },
      { headline_1: "צבע, גוונים והחלקה", headline_2: "עונים {when}." },
      { headline_1: "הידיים שלי בצבע", headline_2: "הצ׳אט עונה בינתיים." },
    ],
    intros: [
      { intro: "כותבים לי איזה טיפול ומה אורך השיער, והפרטים מגיעים אליי לוואטסאפ. אחזור אליכם {when}, ואת התור אני מאשרת בעצמי." },
      { intro: "רוצים לדעת כמה זה עולה? בצ׳אט יש טווח מהמחירון לפי אורך השיער, ואפשר לצרף תמונה. כתבו לי, ואחזור אליכם {when}." },
      { intro: "באמצע צבע הידיים שלי בכפפות, והטלפון בצד. כתבו כאן מה מעניין אתכם, ואחזור אליכם {when}, בין לקוחה ללקוחה." },
    ],
    servicesAsk: "אילו טיפולים אתם עושים, ובכמה?",
    photosAsk: "תמונות של עבודות, של המספרה או של הכיסא מול המראה. לקוחות רק באישור שלהן, ועדיף מאחור.",
  },
};
