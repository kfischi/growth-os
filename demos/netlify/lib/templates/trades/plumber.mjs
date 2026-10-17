// The plumber, as the site builder knows the trade: the words, the chat, the questionnaire's answers to pick.
// Every trade has a file like this one (trades/<id>.mjs, listed in trades/index.mjs) and the same shape.
// Rules for every trade (tests check the lengths):
//   - Hebrew short and plain, plural to the visitor; the owner speaks in first person ("אני חוזר").
//   - Prices are common ranges, suggestions only: the owner keeps, changes or removes them. Never a promise.
//   - Lengths: service name 46, detail 60, time 18, price 24; headline lines 22 each; intro 180 with {when};
//     trade 24; chips under 30 characters. No yellow anywhere (the looks handle colour).
//   - chat.urgency.chips[0] is the urgent answer: it shows the tip and skips "when to call back".
//   - A tip's id must be an item of the trade's guides (shared/guides/<file>.json).
//   - words.lead is a feminine noun ("קריאה", "פנייה"): "ה<lead> אצלי", "<lead> חדשה מהאתר".
//   - Optional: greet (the chat's first line, with {name}, 160), crisis (a crisis line shown on top and in the
//     chat, for trades that may meet people in distress), words.descEnd (the meta description's last sentence),
//     guide.townsAsk / servicesAsk / photosAsk, chat.noCity (no "which town" question), chat.urgentNote.
//   - Optional: callbackStep: false when step 3 isn't the call back (a first session, a visit, a slot): the site then
//     puts no response time on it. plural: true when the business speaks as "אנחנו" (the chat says "אלינו", "אצלנו").
//   - An extra question may have only: { key, is: [...] }: asked only when an earlier extra's answer is one of those
//     (security: the company's site and scope only after "לעסק או לפרויקט").
//   - Check: node scripts/tests/trades.test.mjs <id>
export default {
  id: "plumber",
  label: "אינסטלטור",                 // who the owner is, in the builder's list of trades
  trade: "אינסטלציה",                 // the default for content.trade (24)
  guides: ["plumber"],               // shared/guides/<name>.json, merged in order
  schema: "Plumber",                 // schema.org type for LocalBusiness
  urgent: true,                      // a trade with real emergencies: the urgency question, emergency mode
  words: {
    jobs: "הקריאות הנפוצות",          // the price list's title
    col: "תקלה",                      // the price list's first column
    time: "זמן טיפול",                // its time column
    open: "לפתוח קריאה",             // the chat button and the main call to action
    how: "מה קורה כשפותחים קריאה",    // the steps' title
    status: "מקבלים קריאות",          // the dispatch board's status line
    subtitle: "עונה מיד, גם כשאני בשטח",
    waHello: "יש לי תקלה ואשמח שתחזור אליי.",
    lead: "קריאה",                    // one enquiry, in the owner's alert and the chat's summary
  },
  steps: [
    ["שלב 1 · 30 שניות", "מתארים בצ׳אט", "מה התקלה, כמה דחוף ואיפה. בלי לחכות על הקו."],
    ["שלב 2 · מיד", "הפרטים אצלי", "הפרטים מגיעים אליי בוואטסאפ, מסודרים."],
    ["שלב 3", "אני חוזר וקובע", "קובעים שעה, ומסכמים את המחיר לפני העבודה."],
  ],
  chat: {
    issue: { label: "תקלה", ask: "מה צריך?" },
    photo: "יש תמונה של התקלה? זה עוזר לתת מחיר מדויק יותר.",
    extra: [],                       // trade questions after the photo: [{ key, label, ask, chips }]
    urgency: { label: "דחיפות", ask: "כמה זה דחוף?", chips: ["עכשיו, יש מים על הרצפה", "היום", "השבוע"],
      tip: { id: "leak", text: "עד שנגיע: סגרו את הברז הראשי. אם המים קרובים לחשמל, הורידו קודם את המפסק בלוח." } },
    urgentNote: "עד שאגיע: סגרו את הברז הראשי.",
    priceNote: "המחיר הסופי אחרי אבחון.",
  },
  privacyWhat: "שם, טלפון, סוג השירות, הדחיפות והישוב, ותמונה אם בחרתם לצרף",
  fields: {
    headline_1: "נזילה? סתימה?",
    price_note: "טווחי מחיר · המחיר הסופי נקבע אחרי אבחון",
    business_hint: "למשל: אורן מים",
    ba_hint: "מה רואים ואיפה, למשל: ניקוי סתימה בכיור, חדרה",
    video_hint: "מה רואים בסרטון, למשל: פתיחת סתימה במטבח",
  },
  guide: {
    services: [
      { name: "סתימה בכיור, באסלה או בניקוז", detail: "פתיחה במכונה, בלי לשבור", time: "עד שעה", price: "250 עד 450 ₪" },
      { name: "נזילה מתחת לכיור או מצנרת", detail: "החלפת אטמים, חיבורים וקטעי צנרת", time: "שעה עד שעתיים", price: "300 עד 650 ₪" },
      { name: "דוד חשמל או שמש", detail: "גוף חימום, טרמוסטט, החלפת דוד", time: "שעה עד שלוש", price: "350 עד 2,800 ₪" },
      { name: "איתור נזילה בלי הרס", detail: "מצלמה תרמית ומכשור אקוסטי", time: "שעתיים", price: "650 עד 1,200 ₪" },
      { name: "החלפת ברז או סוללה", detail: "ברזים במטבח, באמבטיה ובמקלחת", time: "עד שעה", price: "200 עד 450 ₪" },
      { name: "התקנה או החלפה של אסלה", detail: "כולל מיכל הדחה וחיבורים", time: "שעה עד שעתיים", price: "450 עד 900 ₪" },
      { name: "תיקון מיכל הדחה", detail: "החלפת מנגנון, אטמים או מיכל", time: "עד שעה", price: "200 עד 400 ₪" },
      { name: "פתיחת קו ביוב", detail: "פתיחה במכונה וצילום הקו לפי הצורך", time: "שעה עד שלוש", price: "450 עד 1,200 ₪" },
      { name: "התקנת מסנן מים", detail: "מתחת לכיור או בכניסה לבית", time: "עד שעה", price: "300 עד 700 ₪" },
      { name: "חיבור מכונת כביסה או מדיח", detail: "חיבור מים וניקוז", time: "עד שעה", price: "200 עד 350 ₪" },
      { name: "החלפת צנרת בדירה", detail: "צנרת מים חמים וקרים", time: "לפי היקף", price: "לפי הצעת מחיר" },
    ],
    response: ["15 דק׳", "30 דק׳", "שעה", "שעתיים", "באותו יום"],
    hours: ["24/7", "א׳–ה׳ 8:00–18:00", "א׳–ה׳ 7:00–19:00", "א׳–ו׳ 7:00–20:00"],
    warranty: ["3 חודשים", "6 חודשים", "12 חודשים", "24 חודשים"],
    headlines: [
      { headline_1: "נזילה? סתימה?", headline_2: "מגיעים היום." },
      { headline_1: "אינסטלטור שעונה.", headline_2: "חוזרים {when}." },
      { headline_1: "סתימה, נזילה, דוד?", headline_2: "פותרים מהר ובניקיון." },
      { headline_1: "אינסטלציה בלי הפתעות", headline_2: "מחיר ברור מראש." },
    ],
    intros: [
      { intro: "כותבים לי מה קרה ואיפה, והפרטים מגיעים אליי לוואטסאפ. אני חוזר אליכם {when}." },
      { intro: "סתימה, נזילה או דוד: כותבים לי בקצרה, ואני חוזר {when} עם הערכת מחיר." },
      { intro: "מחיר ברור לפני שמתחילים, ועבודה נקייה. כתבו לי מה צריך, ואני חוזר {when}." },
    ],
  },
};
