// Designed cakes from a home kitchen, as the site builder knows the trade: the words, the chat, the questionnaire's
// answers to pick. Same shape and rules as trades/plumber.mjs (see its comment). Check: node scripts/tests/trades.test.mjs cakes
// Not an urgent trade: no urgency question. The chat always asks kosher needs and allergies, and promises nothing a home
// kitchen cannot keep (never "allergen free"); the kosher status on the site is the owner's own. The date is checked and
// confirmed in a call: an order is confirmed only after talking. Four extras: kosher and allergies may not be dropped.
export default {
  id: "cakes",
  label: "עוגות מעוצבות",
  trade: "עוגות מעוצבות וקינוחים",
  guides: ["cakes"],
  schema: "Bakery",
  urgent: false,
  greet: "היי, כאן {name}.\nכמה שאלות קצרות על החגיגה, ואחזור אליכם עם רעיון ומחיר.",
  words: {
    jobs: "המחירון",
    col: "מה מזמינים",
    time: "כמות",  // no service has a time: the quantity is in the name, so the chat's price line says it
    open: "להזמין עוגה",
    how: "מה קורה כשמזמינים עוגה",
    status: "מקבלת הזמנות",
    subtitle: "עונה מיד, גם כשאני ליד התנור",
    waHello: "אשמח להזמין עוגה.",
    lead: "פנייה",
    descEnd: "כותבים מה חוגגים ומקבלים רעיון ומחיר.",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מספרים בצ׳אט", "מה חוגגים, מתי, כמה אורחים, כשרות ואלרגיות. ותמונה של עוגה שאהבתם."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, גם כשאני ליד התנור."],
    ["שלב 3", "רעיון ומחיר", "אני חוזרת, בודקת את התאריך, ויחד סוגרים עיצוב, גודל ומחיר."],
  ],
  chat: {
    issue: { label: "מזמינים", ask: "מה תרצו להזמין?" },
    photo: "יש תמונה של עוגה שאהבתם? ככה אבין את הסגנון.",
    extra: [
      { key: "when", label: "מתי", ask: "מתי החגיגה?", chips: ["השבוע", "בשבוע הבא", "בעוד שבועיים ויותר", "עוד לא סגרנו"] },
      { key: "guests", label: "אורחים", ask: "בערך כמה אורחים?", chips: ["עד 10", "20", "30", "50", "יותר מ-50"] },
      { key: "kosher", label: "כשרות", ask: "כשרות: מה חשוב לכם?", chips: ["כשר רגיל מספיק", "צריך מהדרין", "צריך פרווה", "לא משנה לנו"] },
      { key: "allergy", label: "אלרגיות", ask: "יש אלרגיות בין האורחים? אגוזים, בוטנים, גלוטן, חלב, ביצים", chips: ["אין", "יש, אפרט בשיחה"] },
    ],
    urgency: null,
    priceNote: "טווח לדוגמה. המחיר הסופי אחרי שבוחרים עיצוב.",
  },
  privacyWhat: "שם, טלפון, מה מזמינים, מתי החגיגה, מספר האורחים, כשרות, אלרגיות והיישוב, ותמונה אם בחרתם לצרף",
  fields: {
    headline_1: "יש לכם חגיגה?",
    price_note: "מחירים לדוגמה · המחיר הסופי אחרי שבוחרים עיצוב",
    business_hint: "למשל: המתוקים של נוי",
    ba_hint: "מה רואים, למשל: העוגה לפני הקישוט ואחריו",
    video_hint: "מה רואים בסרטון, למשל: זילוף פרחים על עוגה",
  },
  guide: {
    services: [
      { name: "עוגה בקרם, ל-10 אורחים", detail: "קרם חלק, פרחים בזילוף ופירות טריים", price: "280 עד 360 ₪" },
      { name: "עוגה בבצק סוכר, ל-10 אורחים", detail: "דמות או נושא לפי בחירתכם, בעבודת יד", price: "340 עד 440 ₪" },
      { name: "עוגת נייקד, ל-10 אורחים", detail: "השכבות נראות מבחוץ, עם פירות ופרחים", price: "250 עד 330 ₪" },
      { name: "עוגה בקרם, שתי קומות, ל-30 אורחים", detail: "בערך 30 פרוסות", price: "600 עד 760 ₪" },
      { name: "קינוחים אישיים, מ-20 יחידות", detail: "כוסות מוס, טארטלטים ועוגות גבינה קטנות", price: "12 עד 18 ₪ ליחידה" },
      { name: "מגש מתוקים, 40 יחידות", detail: "עוגיות, כדורי שוקולד ומיני טארטים, מסודרים על מגש", price: "220 עד 300 ₪" },
      { name: "תוספת פיסטוק", detail: "בטעם העוגה או בקרם", price: "2 עד 3 ₪ לאורח" },
      { name: "משלוח", detail: "עד הבית או האולם, לפי המרחק", price: "40 עד 80 ₪" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 9:00–19:00", "א׳–ו׳ 9:00–18:00", "א׳–ה׳ 8:00–20:00"],
    warranty: null,
    headlines: [
      { headline_1: "יש לכם חגיגה?", headline_2: "העוגה עליי." },
      { headline_1: "עוגות מעוצבות", headline_2: "אני חוזרת {when}." },
      { headline_1: "יום הולדת, בר מצווה?", headline_2: "עוגה שמתאימה לחגיגה." },
      { headline_1: "הידיים בבצק?", headline_2: "הצ׳אט עונה בינתיים." },
    ],
    intros: [
      { intro: "כותבים לי מה חוגגים, מתי וכמה אורחים, והפרטים מגיעים אליי לוואטסאפ. אחזור אליכם {when} עם רעיון ומחיר." },
      { intro: "יש תמונה של עוגה שאהבתם? צרפו אותה בצ׳אט, וספרו על כשרות ואלרגיות. אחזור אליכם {when}." },
      { intro: "עוגות מעוצבות, קינוחים אישיים ומגשי מתוקים: כתבו לי בקצרה, ואחזור אליכם {when}. הזמנה מאושרת רק אחרי שדיברנו." },
    ],
    servicesAsk: "מה אתם אופים, ובכמה?",
    photosAsk: "תמונות של עוגות וקינוחים שהכנתם, ושל המטבח. תמונות של אורחים רק באישור שלהם.",
  },
};
