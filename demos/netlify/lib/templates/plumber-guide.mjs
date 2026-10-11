// The plumber's questionnaire for the site builder: one question per topic, with answers to pick from.
// The owner picks instead of writing; whatever isn't listed they type. Answers go straight into the draft
// (/api/builder/answer) without the AI. The chat is still there for anything free-form.
//
// Facts stay the owner's: a price range here is only a suggestion the owner keeps, changes or removes
// before it shows. Lengths respect the template's FIELDS, SERVICES and TOWNS limits (tests check them).

// {when} is filled from the response time the owner picked: "תוך 15 דק׳", or "באותו יום".
export const GUIDE = {
  intro: "בכל שאלה בוחרים תשובה, ומה שלא מופיע כותבים בעצמכם. אפשר גם לכתוב לנו חופשי בכל רגע.",

  regions: [
    { label: "חדרה, עמק חפר והשרון", towns: ["חדרה", "עמק חפר", "נתניה", "פרדס חנה כרכור", "אור עקיבא", "קיסריה", "בנימינה", "כפר יונה", "זכרון יעקב"] },
    { label: "השרון", towns: ["נתניה", "כפר סבא", "רעננה", "הוד השרון", "הרצליה", "רמת השרון", "כפר יונה", "אבן יהודה", "תל מונד"] },
    { label: "תל אביב וגוש דן", towns: ["תל אביב-יפו", "רמת גן", "גבעתיים", "בני ברק", "חולון", "בת ים", "פתח תקווה", "קריית אונו", "אור יהודה", "יהוד-מונוסון"] },
    { label: "השפלה", towns: ["ראשון לציון", "רחובות", "נס ציונה", "יבנה", "גדרה", "באר יעקב", "רמלה", "לוד", "מזכרת בתיה"] },
    { label: "מודיעין והסביבה", towns: ["מודיעין", "שוהם", "לוד", "רמלה", "באר יעקב", "כפר רות"] },
    { label: "ירושלים והסביבה", towns: ["ירושלים", "מבשרת ציון", "בית שמש", "מעלה אדומים", "גבעת זאב", "אבו גוש", "צור הדסה"] },
    { label: "חיפה והקריות", towns: ["חיפה", "קריית ביאליק", "קריית מוצקין", "קריית ים", "קריית אתא", "טירת כרמל", "נשר", "עכו", "נהריה"] },
    { label: "העמקים והגליל", towns: ["עפולה", "נוף הגליל", "נצרת", "יקנעם", "מגדל העמק", "טבריה", "כרמיאל", "צפת", "קריית שמונה"] },
    { label: "אשדוד, אשקלון והסביבה", towns: ["אשדוד", "אשקלון", "קריית מלאכי", "גן יבנה", "יבנה", "גדרה", "קריית גת"] },
    { label: "באר שבע והנגב", towns: ["באר שבע", "עומר", "מיתר", "להבים", "אופקים", "נתיבות", "דימונה", "ירוחם", "ערד"] },
  ],

  // price: a common range, shown to the owner as a suggestion only.
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

  steps: [
    { id: "business_name", type: "text", field: "business_name", ask: "איך קוראים לעסק? כמו שהלקוחות מכירים אתכם.", placeholder: "למשל: אורן מים" },
    { id: "region", type: "region", ask: "באיזה אזור אתם עובדים?" },
    { id: "towns", type: "towns", ask: "לאילו ישובים אתם מגיעים? סמנו, ומה שחסר תוסיפו." },
    { id: "services", type: "services", ask: "מה אתם עושים הכי הרבה? סמנו עד 6, ומה שחסר תוסיפו." },
    { id: "prices", type: "prices", ask: "להציג מחירים? אלה טווחים מקובלים, לדוגמה בלבד. השאירו רק מה שנכון אצלכם, שנו או הורידו." },
    { id: "response_time", type: "pick", field: "response_time", ask: "תוך כמה זמן אתם באמת חוזרים ללקוח?",
      options: ["15 דק׳", "30 דק׳", "שעה", "שעתיים", "באותו יום"] },
    { id: "hours", type: "pick", field: "hours", optional: true, ask: "מתי אתם עובדים?",
      options: ["24/7", "א׳–ה׳ 8:00–18:00", "א׳–ה׳ 7:00–19:00", "א׳–ו׳ 7:00–20:00"] },
    { id: "years", type: "pick", field: "years", optional: true, ask: "כמה שנים אתם בתחום?",
      options: [{ label: "3 שנים", value: "3" }, { label: "5 שנים", value: "5" }, { label: "8 שנים", value: "8" }, { label: "10 שנים", value: "10" }, { label: "15 שנה", value: "15" }, { label: "20 שנה", value: "20" }],
      placeholder: "מספר שנים" },
    { id: "warranty", type: "pick", field: "warranty", optional: true, ask: "נותנים אחריות על העבודה?",
      options: ["3 חודשים", "6 חודשים", "12 חודשים", "24 חודשים"] },
    { id: "headline", type: "copy", ask: "איזו כותרת מתאימה לכם?",
      options: [
        { headline_1: "נזילה? סתימה?", headline_2: "מגיעים היום." },
        { headline_1: "אינסטלטור שעונה.", headline_2: "חוזרים {when}." },
        { headline_1: "סתימה, נזילה, דוד?", headline_2: "פותרים מהר ובניקיון." },
        { headline_1: "אינסטלציה בלי הפתעות", headline_2: "מחיר ברור מראש." },
      ] },
    { id: "intro", type: "copy", ask: "ואיזו פסקת פתיחה? היא מופיעה מתחת לכותרת.",
      options: [
        { intro: "כותבים לי מה קרה ואיפה, והפרטים מגיעים אליי לוואטסאפ. אני חוזר אליכם {when}." },
        { intro: "סתימה, נזילה או דוד: כותבים לי בקצרה, ואני חוזר {when} עם הערכת מחיר." },
        { intro: "מחיר ברור לפני שמתחילים, ועבודה נקייה. כתבו לי מה צריך, ואני חוזר {when}." },
      ] },
    { id: "photos", type: "photos", ask: "נשאר להוסיף תמונות: אחת שלכם ועד שלוש של העבודה. יש לכם תמונה של אותה עבודה לפני ואחרי? באתר היא תופיע עם פס להשוואה. הכול בכפתור \"תמונות וסרטון\" מתחת לשיחה. לא חובה, אבל לקוחות סומכים על מי שהם רואים." },
  ],
};

// "תוך 15 דק׳", but "באותו יום" as it is.
export const whenText = (response) => (!response ? "מהר" : /^באותו/.test(response) ? response : "תוך " + response);
