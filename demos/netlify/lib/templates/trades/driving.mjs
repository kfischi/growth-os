// The driving teacher, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs driving
// Not an urgent trade: no urgency question. The teacher confirms every lesson himself; the site never books by itself,
// and never promises passing the test. Prices are per lesson, samples the owner keeps or changes.
export default {
  id: "driving",
  label: "מורה לנהיגה",
  trade: "לימודי נהיגה",
  guides: ["driving"],
  schema: "DrivingSchool",
  urgent: false,
  words: {
    jobs: "המחירון",
    col: "שיעור",
    time: "משך",
    open: "לקבוע שיעור",
    how: "מה קורה כשקובעים שיעור",
    status: "מקבלים תלמידים חדשים",
    subtitle: "עונה מיד, גם כשאני באמצע שיעור",
    waHello: "אשמח לשמוע על שיעורי נהיגה.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "איזה רישיון, מאיפה לאסוף ומתי נוח לכם."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם כשאני באמצע שיעור."],
    ["שלב 3", "שעה פנויה", "בין שיעור לשיעור אני חוזר אליכם עם שעה פנויה."],
  ],
  chat: {
    issue: { label: "רישיון", ask: "איזה רישיון לומדים, אוטומט או ידני?" },
    photo: null,
    extra: [
      { key: "stage", label: "שלב", ask: "זה שיעור ראשון, או שכבר התחלתם ללמוד?", chips: ["שיעור ראשון", "כבר התחלתי ללמוד", "יש לי רישיון, רענון"] },
      { key: "age", label: "גיל", ask: "בן או בת כמה מי שילמד?", chips: ["17", "18 עד 25", "מעל 25"] },
      { key: "days", label: "מתי", ask: "באילו ימים ושעות נוח לכם?", chips: ["בוקר", "אחרי בית הספר", "ערב", "שישי בבוקר"] },
    ],
    urgency: null,
    priceNote: "מחיר לשיעור לפי המחירון.",
  },
  privacyWhat: "שם, טלפון, סוג הרישיון, שלב הלימוד, גיל, מאיפה לאסוף ומתי נוח ללמוד",
  fields: {
    headline_1: "מתחילים ללמוד נהיגה?",
    price_note: "מחירים לדוגמה · מחיר לשיעור לפי המחירון",
    business_hint: "למשל: גיל לימודי נהיגה",
    ba_hint: "מה רואים, למשל: הרכב, מבפנים ומבחוץ",
    video_hint: "מה רואים בסרטון, למשל: הרכב והמגרש לתרגול חנייה",
  },
  guide: {
    services: [
      { name: "שיעור נהיגה, רכב פרטי B", detail: "מתחילים מאפס, אחרי התיאוריה", time: "40 דקות", price: "150 עד 180 ₪" },
      { name: "שיעור על אוטומט", detail: "בלי מצמד ובלי גיר", time: "40 דקות", price: "150 עד 180 ₪" },
      { name: "שיעור על ידני", detail: "גיר ומצמד מהשיעור הראשון", time: "40 דקות", price: "160 עד 190 ₪" },
      { name: "שיעור כפול", detail: "שני שיעורים ברצף, לנסיעה ארוכה", time: "80 דקות", price: "300 עד 360 ₪" },
      { name: "רענון נהיגה", detail: "יש רישיון, אבל לא נהגתם הרבה זמן", time: "40 דקות", price: "170 עד 220 ₪" },
      { name: "שיעור לפני מבחן חוזר", detail: "מתרגלים בדיוק את מה שחסר במבחן", time: "40 דקות", price: "150 עד 180 ₪" },
      { name: "איסוף מבית הספר", detail: "השיעור מתחיל בשער, ונגמר בבית", time: "40 דקות", price: "150 עד 180 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 7:00–21:00", "א׳–ו׳ 7:00–20:00", "א׳–ה׳ 8:00–19:00"],
    warranty: null,
    headlines: [
      { headline_1: "מתחילים ללמוד נהיגה?", headline_2: "אני חוזר {when}." },
      { headline_1: "אני באמצע שיעור", headline_2: "הצ׳אט עונה בינתיים." },
      { headline_1: "אוטומט או ידני", headline_2: "איסוף מהבית." },
      { headline_1: "רוצים שיעור נהיגה?", headline_2: "כותבים, ואני חוזר." },
    ],
    intros: [
      { intro: "כותבים לי איזה רישיון, מאיפה לאסוף ומתי נוח לכם, והפרטים מגיעים אליי לוואטסאפ. אחזור אליכם {when} עם שעה פנויה." },
      { intro: "בזמן שיעור אני לא עונה לטלפון. כתבו כאן מה צריך ומתי, ואחזור אליכם {when}, בין שיעור לשיעור." },
      { intro: "הורים של תלמידים בני 17, או מבוגרים שרוצים רענון: כתבו לי בקצרה, ואחזור אליכם {when} לקבוע." },
    ],
    servicesAsk: "אילו שיעורים אתם נותנים, ובכמה?",
    photosAsk: "תמונות של הרכב מבחוץ ומבפנים, או של המגרש שבו מתרגלים. תמונות של תלמידים רק באישור שלהם, ועד גיל 18 גם של ההורים.",
  },
};
