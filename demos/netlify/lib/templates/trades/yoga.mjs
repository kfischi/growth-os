// A yoga and pilates studio, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs. Check: node scripts/tests/trades.test.mjs yoga
// Not an urgent trade. The owner confirms every class; never free spots, a booked class or scarcity. Anything about
// health (pregnancy, injuries, the back) says ask a doctor first, and the chat asks no health details.
export default {
  id: "yoga",
  label: "סטודיו יוגה ופילאטיס",
  trade: "יוגה ופילאטיס",
  guides: ["yoga"],
  schema: "ExerciseGym",
  urgent: false,
  callbackStep: false,  // step 3 is the class, confirmed after a class: no response time on it
  greet: "היי, כאן {name} 👋\nאני כנראה באמצע שיעור, אבל בצ׳אט הזה עונים מיד. כמה שאלות קצרות ואני חוזרת אליכם.",
  words: {
    jobs: "השיעורים והמחירים",
    col: "שיעור",
    time: "משך",
    open: "לקבוע שיעור ניסיון",
    how: "מה קורה כשקובעים שיעור",
    status: "מקבלים מתאמנים חדשים",
    subtitle: "עונה מיד, גם באמצע שיעור",
    waHello: "אשמח לשמוע על שיעור ניסיון.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "יוגה או פילאטיס, איזה ניסיון יש, ובאילו שעות נוח."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם באמצע שיעור."],
    ["שלב 3", "מאשרים שיעור", "אחרי השיעור אני חוזרת אליכם ומאשרת יום ושעה."],
  ],
  chat: {
    issue: { label: "שיעור", ask: "איזה שיעור מעניין אתכם?" },
    photo: null,
    extra: [
      { key: "kind", label: "יוגה או פילאטיס", ask: "יוגה או פילאטיס?", chips: ["יוגה", "פילאטיס מזרן", "פילאטיס מכשירים", "עוד לא יודעים"] },
      { key: "level", label: "ניסיון", ask: "איזה ניסיון יש לכם?", chips: ["מתחילים", "קצת ניסיון", "מתרגלים קבוע"] },
      { key: "slot", label: "שעות", ask: "באילו שעות נוח לכם?", chips: ["בוקר", "צהריים", "ערב", "שישי בבוקר"] },
    ],
    urgency: null,
    noCity: true,
    priceNote: "מחירים לדוגמה. את השיעור מאשרים אחרי שחוזרים אליכם.",
  },
  privacyWhat: "שם, טלפון, סוג השיעור, יוגה או פילאטיס, הניסיון והשעות הנוחות",
  fields: {
    headline_1: "נושמים. מתחזקים.",
    price_note: "מחירים לדוגמה · שיעור ניסיון במחיר מוזל",
    business_hint: "למשל: סטודיו אלה יוגה ופילאטיס",
    ba_hint: "מה רואים, למשל: הסטודיו בבוקר, לפני השיעור",
    video_hint: "מה רואים בסרטון, למשל: הסטודיו והמכשירים",
  },
  guide: {
    services: [
      { name: "שיעור ניסיון", detail: "שיעור ראשון, בקבוצה", time: "60 דקות", price: "40 עד 70 ₪" },
      { name: "שיעור יוגה בקבוצה", detail: "ויניאסה, האטה או יוגה רכה", time: "60 עד 75 דקות", price: "70 עד 90 ₪" },
      { name: "פילאטיס מזרן בקבוצה", detail: "חיזוק מרכז הגוף, על מזרן", time: "55 דקות", price: "70 עד 90 ₪" },
      { name: "פילאטיס מכשירים", detail: "על רפורמר, בקבוצה קטנה", time: "55 דקות", price: "110 עד 150 ₪" },
      { name: "כרטיסייה של 10 שיעורים", detail: "יוגה או פילאטיס מזרן, בתוקף 4 חודשים", time: "10 שיעורים", price: "600 עד 800 ₪" },
      { name: "מנוי חודשי", detail: "עד שני שיעורים בשבוע", time: "לחודש", price: "350 עד 480 ₪" },
      { name: "שיעור פרטי", detail: "יוגה או פילאטיס, לפי מה שאתם צריכים", time: "55 דקות", price: "220 עד 300 ₪" },
      { name: "שיעור זוגי", detail: "שניים באותו שיעור", time: "55 דקות", price: "150 עד 190 ₪ לאדם" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 7:00–21:00", "א׳–ו׳ 7:00–20:00", "א׳–ה׳ 8:00–21:30"],
    warranty: null,
    headlines: [
      { headline_1: "נושמים. מתחזקים.", headline_2: "בקבוצות קטנות." },
      { headline_1: "יוגה או פילאטיס?", headline_2: "מתחילים בשיעור ניסיון." },
      { headline_1: "הגב מבקש תנועה?", headline_2: "חוזרים {when}." },
      { headline_1: "שיעור ראשון? בכיף.", headline_2: "מתחילים לאט." },
    ],
    intros: [
      { intro: "כותבים בצ׳אט יוגה או פילאטיס, איזה ניסיון יש ובאילו שעות נוח, והפרטים מגיעים אליי לוואטסאפ. חוזרת אליכם {when}." },
      { intro: "מתחילים או מתרגלים קבוע, על מזרן או על רפורמר. ספרו לי בקצרה, וחוזרת אליכם {when} לקבוע שיעור ניסיון." },
      { intro: "קבוצות קטנות ושיעור ניסיון במחיר מוזל. כתבו לי מה מעניין אתכם, ואחזור אליכם {when}." },
    ],
    servicesAsk: "אילו שיעורים, כרטיסיות ומנויים יש בסטודיו, ובכמה?",
    photosAsk: "תמונות של הסטודיו, המזרנים והמכשירים. תמונות של מתאמנים רק באישור שלהם.",
  },
};
