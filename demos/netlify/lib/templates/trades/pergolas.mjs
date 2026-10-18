// Pergolas and awnings, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Same shape and rules as trades/plumber.mjs. Check: node scripts/tests/trades.test.mjs pergolas
// Prices are per square metre; the final price only after a measuring visit. Permits: say check with the local
// authority, never a legal promise.
export default {
  id: "pergolas",
  label: "פרגולות וסוככים",
  trade: "פרגולות וסוככים",
  guides: ["pergolas"],
  schema: "HomeAndConstructionBusiness",
  urgent: false,
  callbackStep: false,  // step 3 is the estimate and the measuring visit
  plural: true,  // the business speaks as "אנחנו": the chat says "אלינו", "אצלנו"
  greet: "היי, כאן {name} 👋\nאנחנו כנראה באמצע התקנה, אבל בצ׳אט הזה עונים מיד. כמה שאלות קצרות ונחזור אליכם.",
  words: {
    jobs: "הסוגים והמחירים",
    col: "סוג",
    time: "התקנה",
    open: "לבקש הצעת מחיר",
    how: "מה קורה כשמבקשים הצעה",
    status: "מקבלים הזמנות",
    subtitle: "חוזרים עם הערכה וביקור מדידה",
    waHello: "אשמח להצעת מחיר לפרגולה.",
    lead: "פנייה",
  },
  steps: [
    ["שלב 1 · 30 שניות", "מתארים בצ׳אט", "סוג, מקום ומידות בערך, ותמונה של המקום."],
    ["שלב 2 · מיד", "הפרטים אצלנו", "הפרטים מגיעים אלינו בוואטסאפ, גם כשאנחנו בהתקנה."],
    ["שלב 3", "הערכה וביקור מדידה", "חוזרים עם הערכת מחיר, ומחיר סופי אחרי מדידה."],
  ],
  chat: {
    issue: { label: "סוג", ask: "איזו פרגולה מעניינת אתכם?" },
    photo: "יש תמונה של המקום? כך רואים את הקיר ואת הגישה.",
    extra: [
      { key: "where", label: "איפה", ask: "איפה היא תעמוד?", chips: ["מרפסת", "גינה", "גג", "חזית של עסק"] },
      { key: "size", label: "גודל", ask: "מה הגודל, בערך?", chips: ["עד 10 מ״ר", "10 עד 20 מ״ר", "20 עד 35 מ״ר", "מעל 35 מ״ר"] },
    ],
    urgency: null,
    priceNote: "מחיר למ״ר. המחיר הסופי אחרי ביקור מדידה.",
  },
  privacyWhat: "שם, טלפון, סוג הפרגולה, המקום, הגודל והישוב, ותמונה אם בחרתם לצרף",
  fields: {
    headline_1: "צל במרפסת ובגינה",
    price_note: "מחירים למ״ר · מחיר סופי אחרי ביקור מדידה",
    business_hint: "למשל: אופק פרגולות",
    ba_hint: "מה רואים ואיפה, למשל: מרפסת לפני הפרגולה ואחריה",
    video_hint: "מה רואים בסרטון, למשל: פרגולה ביוקלימטית נסגרת",
  },
  guide: {
    services: [
      { name: "פרגולת אלומיניום", detail: "בלי תחזוקה, שלבים פתוחים או כיסוי", time: "יום עד יומיים", price: "850 עד 1,300 ₪ למ״ר" },
      { name: "פרגולת עץ", detail: "אורן או אלון, שמן פעם בשנה או שנתיים", time: "יום עד יומיים", price: "700 עד 1,100 ₪ למ״ר" },
      { name: "סוכך חשמלי", detail: "נפתח ונסגר בשלט, לשמש", time: "חצי יום", price: "600 עד 1,000 ₪ למ״ר" },
      { name: "פרגולה ביוקלימטית", detail: "שלבים שמסתובבים: צל, אוורור או סגור לגשם", time: "יומיים עד שלושה", price: "2,200 עד 3,500 ₪ למ״ר" },
      { name: "כיסוי לפרגולה קיימת", detail: "פוליקרבונט או לוחות מבודדים, עם שיפוע ומרזב", time: "יום עבודה", price: "250 עד 450 ₪ למ״ר" },
      { name: "החלפת בד לסוכך", detail: "בד חדש על הזרועות הקיימות", time: "חצי יום", price: "1,200 עד 2,800 ₪" },
      { name: "מנוע לסוכך קיים", detail: "מנוע ושלט במקום ידית", time: "חצי יום", price: "1,100 עד 2,000 ₪" },
      { name: "פרגולה לחזית של עסק", detail: "מסעדה, חנות או בית קפה", time: "לפי גודל", price: "לפי הצעת מחיר" },
    ],
    response: ["30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["א׳–ה׳ 7:30–18:00", "א׳–ו׳ 7:00–16:00", "א׳–ה׳ 8:00–19:00"],
    warranty: ["12 חודשים", "3 שנים", "5 שנים"],
    headlines: [
      { headline_1: "צל במרפסת ובגינה", headline_2: "חוזרים {when}." },
      { headline_1: "פרגולה? סוכך?", headline_2: "שולחים מידות בצ׳אט." },
      { headline_1: "אלומיניום, עץ, סוכך", headline_2: "מחיר אחרי מדידה." },
    ],
    intros: [
      { intro: "כותבים בצ׳אט סוג, מקום ומידות בערך, והפרטים מגיעים אלינו לוואטסאפ. חוזרים אליכם {when} עם הערכה וביקור מדידה." },
      { intro: "פרגולת אלומיניום או עץ, סוכך חשמלי או ביוקלימטית. שלחו תמונה של המקום, וחוזרים {when}." },
    ],
    servicesAsk: "אילו פרגולות וסוככים אתם מתקינים, ובכמה למ״ר?",
    photosAsk: "תמונות של פרגולות שהתקנתם, מכמה זוויות. בלי פרטים של לקוחות.",
  },
};
