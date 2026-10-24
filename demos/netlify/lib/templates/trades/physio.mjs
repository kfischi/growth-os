// The physiotherapist, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs physio
// Not an urgent trade: no urgency question. One doctor-first health question; chest pain or a hard fall is 101 first
// (the greet says so, and the "red-flags" guide shows on the main page). Never a diagnosis or a promise of healing.
// The owner confirms every slot herself.
export default {
  id: "physio",
  label: "פיזיותרפיסט",
  trade: "פיזיותרפיה",
  guides: ["physio"],
  schema: "Physiotherapy",
  urgent: false,
  greet: "היי, כאן {name}.\nכמה שאלות קצרות, ואחזור אליכם בין טיפול לטיפול. כאב בחזה או נפילה קשה? קודם מד״א 101.",
  words: {
    jobs: "הטיפולים והמחירים",
    col: "טיפול",
    time: "משך",
    open: "לבקש טיפול",
    how: "מה קורה כשמבקשים טיפול",
    status: "מקבלים מטופלים חדשים",
    subtitle: "עונה מיד, גם כשאני עם מטופל",
    waHello: "אשמח לקבוע טיפול פיזיותרפיה.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "מה כואב, מאז מתי, ובאילו שעות נוח לכם. בלי לחכות על הקו."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם באמצע טיפול."],
    ["שלב 3", "מתאמים טיפול", "בין טיפול לטיפול אני חוזרת אליכם ומאשרת יום ושעה."],
  ],
  chat: {
    issue: { label: "מה מביא", ask: "מה מביא אתכם?" },
    photo: null,
    extra: [
      { key: "since", label: "מאז", ask: "ומאז מתי זה?", chips: ["כמה ימים", "כמה שבועות", "יותר משלושה חודשים"] },
      { key: "health", label: "בריאות", ask: "יש כאב בחזה, נימול שמחמיר או כאב חזק אחרי נפילה?", chips: ["לא", "כן, אפנה קודם לרופא"] },
      { key: "place", label: "מקום", ask: "בקליניקה, או ביקור בית?", chips: ["בקליניקה", "ביקור בית", "לא משנה"] },
      { key: "slot", label: "שעות", ask: "באיזה זמן ביום נוח לכם?", chips: ["בוקר", "צהריים", "ערב"] },
    ],
    urgency: null,
    priceNote: "טווח לפי המחירון. בטיפול הראשון בודקים ובונים תוכנית.",
  },
  privacyWhat: "שם, טלפון, מה מביא אתכם, מאז מתי, תשובה לשאלת בריאות אחת, בקליניקה או בבית, השעות הנוחות והיישוב",
  fields: {
    headline_1: "כואב לזוז?",
    price_note: "מחירים לדוגמה לטיפול פרטי · ביקור בית לפי המרחק",
    business_hint: "למשל: מיכל אורן פיזיותרפיה",
    ba_hint: "מה רואים, למשל: חדר הטיפול והציוד לתרגול",
    video_hint: "מה רואים בסרטון, למשל: תרגיל לחיזוק הברך בקליניקה",
  },
  guide: {
    services: [
      { name: "טיפול ראשון והערכה", detail: "שאלות, בדיקת תנועה וכוח, ותרגילים לבית", time: "60 דקות", price: "300 עד 380 ₪" },
      { name: "טיפול המשך", detail: "טיפול ידני ותרגול, ובודקים מה השתנה", time: "45 דקות", price: "250 עד 320 ₪" },
      { name: "כאב גב או עורף", detail: "תנועה, יציבה ותרגילים לעבודה מול מסך", time: "45 דקות", price: "250 עד 320 ₪" },
      { name: "שיקום אחרי ניתוח", detail: "לפי מה שהמנתח הרשה, עם מכתב השחרור", time: "45 דקות", price: "250 עד 320 ₪" },
      { name: "פציעת ספורט", detail: "ברך, קרסול או כתף, וחזרה הדרגתית לאימון", time: "45 דקות", price: "250 עד 320 ₪" },
      { name: "ביקור בית", detail: "אחרי ניתוח, או כשקשה לצאת מהבית. עם ציוד", time: "45 דקות", price: "350 עד 450 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 8:00–20:00", "א׳–ו׳ 8:00–19:00", "א׳–ה׳ 9:00–21:00"],
    warranty: null,
    headlines: [
      { headline_1: "כואב לזוז?", headline_2: "ספרו לי מה קרה." },
      { headline_1: "גב, ברך, אחרי ניתוח", headline_2: "בקליניקה או בבית." },
      { headline_1: "פיזיותרפיה קרוב לבית", headline_2: "חוזרת {when}." },
      { headline_1: "איפה כואב לכם?", headline_2: "מספרים בצ׳אט." },
    ],
    intros: [
      { intro: "כותבים מה כואב ומאז מתי, והפרטים מגיעים אליי לוואטסאפ. בין טיפול לטיפול אני חוזרת אליכם {when} לתאם." },
      { intro: "בזמן טיפול אני עם המטופל, לא עם הטלפון. כאן מספרים מה קרה ומתי נוח לכם, ואני חוזרת אליכם {when}." },
      { intro: "גב תפוס, פציעת ספורט או שיקום אחרי ניתוח: כתבו לי בקצרה, ראו טווח מחיר, ואני חוזרת אליכם {when}." },
    ],
    servicesAsk: "אילו טיפולים אתם נותנים, כמה זמן כל אחד, ובכמה?",
    photosAsk: "תמונות של הקליניקה, מיטת הטיפול והציוד לתרגול, ותמונה שלכם. בלי מטופלים, ובלי שום פרט מזהה.",
  },
};
