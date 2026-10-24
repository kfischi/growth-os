// Tiling and wall cladding, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs. Check: node scripts/tests/trades.test.mjs tiling
// Prices from demos/tiling/ (its list and calculator): labour only, without the tiles themselves; the final price
// only after measuring at home. The demo business speaks as "אנחנו".
const NEW = "ריצוף או חיפוי חדש", FIX = "תיקון אריחים", GROUT = "חידוש רובה";
export default {
  id: "tiling",
  label: "רצף",
  trade: "ריצוף וחיפוי",
  guides: ["tiling"],
  schema: "HomeAndConstructionBusiness",
  urgent: false,
  callbackStep: false,  // step 3 is the measuring visit and the closed price
  plural: true,  // the business speaks as "אנחנו": the chat says "אלינו", "אצלנו"
  words: {
    jobs: "מחירי עבודה",
    col: "עבודה",
    time: "משך",
    open: "לקבל מחיר",
    how: "מה קורה כשמבקשים מחיר",
    status: "מקבלים פניות",
    subtitle: "עונים מיד, גם כשאנחנו באמצע ריצוף",
    waHello: "אשמח להצעת מחיר לריצוף או לחיפוי.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · דקה", "מתארים בצ׳אט", "מה צריך, כמה מ״ר, אם יש ריצוף ישן, ותמונה של החדר."],
    ["שלב 2 · מיד", "הפרטים אצלנו", "הפרטים והתמונה מגיעים אלינו בוואטסאפ."],
    ["שלב 3", "מדידה ומחיר סגור", "מגיעים למדוד, וסוגרים מחיר לפני שמתחילים."],
  ],
  chat: {
    issue: { label: "מה צריך", ask: "מה צריך?" },
    photo: "יש תמונה של החדר או של האריחים? כך מגיעים למדידה מוכנים.",
    extra: [
      { key: "kind", label: "סוג", ask: "עבודה חדשה או תיקון?", chips: [NEW, FIX, GROUT] },
      { key: "size", label: "שטח", ask: "כמה מ״ר, בערך?", chips: ["עד 20 מ״ר", "20 עד 50 מ״ר", "יותר מ-50 מ״ר", "לא יודעים"],
        only: { key: "kind", is: [NEW] } },
      { key: "old", label: "ריצוף ישן", ask: "יש ריצוף או חיפוי ישן לפרק?", chips: ["כן, צריך לפרק", "לא, זה על מצע חדש", "לא יודעים"],
        only: { key: "kind", is: [NEW] } },
      { key: "tiles", label: "אריחים", ask: "האריחים כבר אצלכם?", chips: ["כבר קנינו", "עוד בוחרים", "רוצים עזרה בבחירה"],
        only: { key: "kind", is: [NEW] } },
      { key: "spare", label: "אריחים זהים", ask: "נשארו אריחים זהים מהעבודה הקודמת?", chips: ["כן, יש בבית", "לא, צריך למצוא דומים", "לא יודעים"],
        only: { key: "kind", is: [FIX] } },
      { key: "when", label: "מתי", ask: "מתי תרצו להתחיל?", chips: ["בהקדם", "בחודש הקרוב", "בעוד כמה חודשים", "רק בודקים מחיר"] },
    ],
    urgency: null,
    priceNote: "מחיר עבודה, בלי האריחים. המחיר הסופי אחרי מדידה.",
  },
  privacyWhat: "שם, טלפון, מה צריך, סוג העבודה, השטח, ריצוף ישן, האריחים, מתי והיישוב, ותמונה אם בחרתם לצרף",
  fields: {
    headline_1: "ריצוף חדש או אריח?",
    price_note: "מחירי עבודה, בלי האריחים · מחיר סופי אחרי מדידה",
    business_hint: "למשל: יניב ריצוף וחיפוי",
    ba_hint: "מה רואים ואיפה, למשל: חיפוי חדר רחצה, מודיעין",
    video_hint: "מה רואים בסרטון, למשל: הנחת אריח גדול בסלון",
  },
  guide: {
    services: [
      { name: "ריצוף", detail: "סלון, חדרים או כל הבית. כולל דבק, פלסים ורובה", price: "130 עד 200 ₪ למ״ר" },
      { name: "חיפוי באמבטיה", detail: "קירות במקלחת, בשירותים ובמטבח, עם פינות וחיתוכים", price: "150 עד 230 ₪ למ״ר" },
      { name: "ריצוף מרפסת", detail: "אריח לחוץ, עם שיפוע לניקוז. בלי איטום", price: "160 עד 250 ₪ למ״ר" },
      { name: "מדרגות", detail: "שלח ורום לכל מדרגה, עם פס נגד החלקה אם צריך", price: "250 עד 450 ₪ למדרגה" },
      { name: "החלפת אריחים שנסדקו או קמו", detail: "בלי לפרק את כל החדר", time: "חצי יום", price: "350 עד 800 ₪ עד 4 אריחים" },
      { name: "חידוש רובה", detail: "מוציאים רובה שחורה או סדוקה ומרבים מחדש", time: "יום עבודה", price: "600 עד 1,400 ₪ לחדר רחצה" },
    ],
    response: ["שעה", "שעתיים", "3 שעות", "באותו יום"],
    hours: ["א׳–ה׳ 7:00–17:00", "א׳–ה׳ 7:00–16:00", "א׳–ו׳ 7:00–14:00"],
    warranty: ["12 חודשים", "24 חודשים", "36 חודשים"],
    headlines: [
      { headline_1: "ריצוף חדש או אריח?", headline_2: "שולחים תמונה בצ׳אט." },
      { headline_1: "רצף שעונה.", headline_2: "חוזרים {when}." },
      { headline_1: "ריצוף, חיפוי, רובה", headline_2: "מחיר סגור אחרי מדידה." },
      { headline_1: "אריח קם בסלון?", headline_2: "מחליפים בלי לפרק הכול." },
    ],
    intros: [
      { intro: "כותבים בצ׳אט מה צריך וכמה מ״ר, ושולחים תמונה. הפרטים מגיעים אלינו לוואטסאפ, וחוזרים אליכם {when} עם זמן למדידה." },
      { intro: "סלון, אמבטיה, מרפסת או אריח אחד שקם: כתבו לנו בקצרה, וחוזרים {when}. המחיר הוא על העבודה, בלי האריחים." },
      { intro: "מחיר סגור אחרי מדידה בבית, לפני שמתחילים. שלחו לנו מה צריך ותמונה של החדר, וחוזרים {when}." },
    ],
    servicesAsk: "אילו עבודות ריצוף וחיפוי אתם עושים הכי הרבה, ובכמה למ״ר (עבודה בלבד)?",
    photosAsk: "תמונות של ריצוף וחיפוי שעשיתם, מקרוב ומרחוק. בלי פרטים של לקוחות.",
  },
};
