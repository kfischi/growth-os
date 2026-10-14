// The site builder's questionnaire, for any trade: one question per topic, with answers to pick from.
// The owner picks instead of writing; whatever isn't listed they type. Answers go straight into the draft
// (/api/builder/answer) without the AI. The chat is still there for anything free-form.
//
// Facts stay the owner's: a price range here is only a suggestion the owner keeps, changes or removes
// before it shows. The trade's own answers (services, response times, hours, warranty, headlines, intros)
// come from trades/<id>.mjs; lengths respect the template's FIELDS, SERVICES and TOWNS limits (tests check them).

// {when} is filled from the response time the owner picked: "תוך 15 דק׳", or "באותו יום".
const REGIONS = [
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
];

export function guideFor(T) {
  const g = T.guide;
  return {
    intro: "בכל שאלה בוחרים תשובה, ומה שלא מופיע כותבים בעצמכם. אפשר גם לכתוב לנו חופשי בכל רגע.",
    regions: REGIONS,
    // price: a common range, shown to the owner as a suggestion only.
    services: g.services,
    steps: [
      { id: "style", type: "style", ask: "קודם כול, איך האתר ייראה? בוחרים תבנית וצבעים, ורואים את זה מיד באתר. אפשר להחליף בכל רגע." },
      { id: "business_name", type: "text", field: "business_name", ask: "איך קוראים לעסק? כמו שהלקוחות מכירים אתכם.", placeholder: (T.fields && T.fields.business_hint) || "למשל: אורן מים" },
      { id: "region", type: "region", ask: "באיזה אזור אתם עובדים?" },
      { id: "towns", type: "towns", ask: g.townsAsk || "לאילו ישובים אתם מגיעים? סמנו, ומה שחסר תוסיפו." },
      { id: "services", type: "services", ask: g.servicesAsk || "מה אתם עושים הכי הרבה? סמנו עד 6, ומה שחסר תוסיפו." },
      { id: "prices", type: "prices", ask: "להציג מחירים? אלה טווחים מקובלים, לדוגמה בלבד. השאירו רק מה שנכון אצלכם, שנו או הורידו." },
      { id: "response_time", type: "pick", field: "response_time", ask: "תוך כמה זמן אתם באמת חוזרים ללקוח?", options: g.response },
      { id: "hours", type: "pick", field: "hours", optional: true, ask: "מתי אתם עובדים?", options: g.hours },
      { id: "years", type: "pick", field: "years", optional: true, ask: "כמה שנים אתם בתחום?",
        options: [{ label: "3 שנים", value: "3" }, { label: "5 שנים", value: "5" }, { label: "8 שנים", value: "8" }, { label: "10 שנים", value: "10" }, { label: "15 שנה", value: "15" }, { label: "20 שנה", value: "20" }],
        placeholder: "מספר שנים" },
      ...(g.warranty ? [{ id: "warranty", type: "pick", field: "warranty", optional: true, ask: "נותנים אחריות על העבודה?", options: g.warranty }] : []),
      { id: "headline", type: "copy", ask: "איזו כותרת מתאימה לכם?", options: g.headlines },
      { id: "intro", type: "copy", ask: "ואיזו פסקת פתיחה? היא מופיעה מתחת לכותרת.", options: g.intros },
      { id: "photos", type: "photos", ask: g.photosAsk || "נשאר להוסיף תמונות: אחת שלכם ועד שלוש של העבודה. יש לכם תמונה של אותה עבודה לפני ואחרי? באתר היא תופיע עם פס להשוואה. הכול בכפתור \"תמונות וסרטון\" מתחת לשיחה. לא חובה, אבל לקוחות סומכים על מי שהם רואים." },
    ],
  };
}


// "תוך 15 דק׳", but "באותו יום" as it is.
export const whenText = (response) => (!response ? "מהר" : /^באותו/.test(response) ? response : "תוך " + response);
