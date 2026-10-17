// Dog training, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs. Check: node scripts/tests/trades.test.mjs dog-trainer
// Not an urgent trade. Never a promise that a dog will be "fixed". A bite or aggression toward people: a vet and a
// qualified behaviourist first (the guides say so).
export default {
  id: "dog-trainer",
  label: "מאלף כלבים",
  trade: "אילוף כלבים",
  guides: ["dog-trainer"],
  schema: "LocalBusiness",
  urgent: false,
  callbackStep: false,  // step 3 is the first session, not the call back
  words: {
    jobs: "האילופים והמחירים",
    col: "מה צריך",
    time: "משך",
    open: "לספר על הכלב",
    how: "מה קורה כשמספרים על הכלב",
    status: "מקבלים כלבים חדשים",
    subtitle: "הפרטים מגיעים אליי לוואטסאפ, גם באמצע שיעור",
    waHello: "אשמח לשמוע על אילוף לכלב שלי.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "גיל, גזע או גודל, מה הבעיה ואיפה היא קורית."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם באמצע שיעור."],
    ["שלב 3", "פגישת אבחון", "חוזר אליכם, וקובעים פגישת אבחון בבית או במגרש."],
  ],
  chat: {
    issue: { label: "מה צריך", ask: "מה הכלב עושה?" },
    photo: null,
    extra: [
      { key: "age", label: "גיל", ask: "בן כמה הכלב?", chips: ["גור עד 6 חודשים", "חצי שנה עד שנתיים", "מעל שנתיים"] },
      { key: "size", label: "גודל", ask: "מה הגודל?", chips: ["קטן", "בינוני", "גדול"] },
      { key: "where", label: "איפה", ask: "איפה זה קורה?", chips: ["בבית", "בטיולים", "גם וגם"] },
    ],
    urgency: null,
    priceNote: "התוכנית והמחיר המלא נקבעים אחרי פגישת האבחון.",
  },
  privacyWhat: "שם, טלפון, מה הכלב עושה, הגיל, הגודל, איפה זה קורה והישוב",
  fields: {
    headline_1: "הכלב מושך או נושך?",
    price_note: "מחירים לדוגמה · התוכנית אחרי פגישת אבחון",
    business_hint: "למשל: נועם אילוף כלבים",
    ba_hint: "מה רואים, למשל: הליכה ברצועה לפני ואחרי",
    video_hint: "מה רואים בסרטון, למשל: גור לומד לשבת",
  },
  guide: {
    services: [
      { name: "פגישת אבחון", detail: "מכירים את הכלב ובונים תוכנית", time: "60 עד 90 דקות", price: "200 עד 300 ₪" },
      { name: "מפגש אילוף", detail: "בבית שלכם או במגרש", time: "60 דקות", price: "250 עד 350 ₪" },
      { name: "חבילה של 6 מפגשים", detail: "תוכנית ומעקב בוואטסאפ", time: "6 מפגשים", price: "1,300 עד 1,800 ₪" },
      { name: "אילוף גורים", detail: "שם, רצועה, צרכים ונשיכות משחק", time: "4 מפגשים", price: "900 עד 1,300 ₪" },
      { name: "קבוצת גורים", detail: "6 מפגשים, עד 6 גורים", time: "6 מפגשים", price: "600 עד 850 ₪" },
      { name: "משמעת בסיסית", detail: "שב, ארצה, בוא והליכה ליד הרגל", time: "6 מפגשים", price: "1,300 עד 1,800 ₪" },
      { name: "בעיות התנהגות", detail: "נביחות, משיכה, חרדת נטישה. אחרי בדיקה אצל וטרינר", time: "לפי תוכנית", price: "לפי הצעת מחיר" },
      { name: "ביקור בית", detail: "כשהבעיה קורית בבית", time: "60 דקות", price: "תוספת 50 עד 100 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 7:00–20:00", "א׳–ו׳ 7:00–19:00", "א׳–ה׳ 16:00–21:00"],
    warranty: null,
    headlines: [
      { headline_1: "הכלב מושך או נושך?", headline_2: "ספרו לי בצ׳אט." },
      { headline_1: "גור חדש בבית?", headline_2: "מתחילים נכון." },
      { headline_1: "אילוף בבית או במגרש", headline_2: "חוזרים {when}." },
    ],
    intros: [
      { intro: "כותבים בצ׳אט גיל, גודל, מה הכלב עושה ואיפה, והפרטים מגיעים אליי לוואטסאפ. חוזר אליכם {when} לקבוע פגישת אבחון." },
      { intro: "גורים, משמעת ובעיות התנהגות, בבית שלכם או במגרש. ספרו לי על הכלב, ואחזור אליכם {when}." },
    ],
    servicesAsk: "אילו אילופים אתם נותנים, ובכמה?",
    photosAsk: "תמונות מהמגרש, מהציוד ומשיעורים. תמונות של כלבים ובעליהם רק באישור שלהם.",
  },
};
