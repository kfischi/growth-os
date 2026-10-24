// The customer's language. The AI chats (the site's נציג AI, the demo's live one, the WhatsApp assistant) answer
// in the language the customer writes in, while everything for the owner (the lead's service and summary, the
// WhatsApp update) stays in Hebrew and says which language the customer used, so the owner calls back prepared.

// By script, from what the customer wrote: Arabic, Cyrillic (Russian), Latin (English). Hebrew wins a tie, and
// a message with no letters (a phone number) says nothing.
export function langOf(text) {
  const s = String(text || "");
  const n = (re) => (s.match(re) || []).length;
  const he = n(/[\u0590-\u05FF]/g), ar = n(/[\u0600-\u06FF]/g), ru = n(/[\u0400-\u04FF]/g), en = n(/[A-Za-z]/g);
  const top = Math.max(he, ar, ru, en);
  if (!top || he === top) return he ? "he" : null;
  return ar === top ? "ar" : ru === top ? "ru" : "en";
}

// The customer's language over a conversation: their latest message when it says enough (8 letters or more),
// else their last three together, so a short name in Latin letters ("Ivan 050...") doesn't turn a Russian
// conversation into English. Hebrew when nothing says.
const letters = (t) => (String(t || "").match(/[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FFA-Za-z]/g) || []).length;
export function langOfTurns(messages) {
  const mine = (messages || []).filter((m) => m && m.role === "user").map((m) => m.content);
  const last = mine.at(-1);
  if (letters(last) >= 8) return langOf(last);
  return langOf(mine.slice(-3).join(" ")) || "he";
}

const NAMES = { ar: "ערבית", ru: "רוסית", en: "אנגלית" };
// For the owner: "" for Hebrew, else " (הפנייה ברוסית)".
export const langNote = (lang) => (NAMES[lang] ? ` (הפנייה ב${NAMES[lang]})` : "");

// The few fixed lines the functions send without the model.
const LINES = {
  refusal: {
    he: "על זה אי אפשר לענות כאן. השאירו שם וטלפון, ונחזור אליכם.",
    ar: "لا يمكننا الإجابة على هذا هنا. اتركوا الاسم ورقم الهاتف وسنعود إليكم.",
    ru: "На этот вопрос здесь ответить не можем. Оставьте имя и телефон, и мы вам перезвоним.",
    en: "We can't answer that here. Leave your name and phone, and we'll get back to you.",
  },
  demoRefusal: {
    he: "על זה אי אפשר לענות כאן. אפשר לשאול על השירותים, המחירים והאזורים.",
    ar: "لا يمكننا الإجابة على هذا هنا. يمكنكم السؤال عن الخدمات والأسعار والمناطق.",
    ru: "На этот вопрос здесь ответить не можем. Спросите об услугах, ценах и районах.",
    en: "We can't answer that here. You can ask about the services, prices and areas.",
  },
  badPhone: {
    he: "המספר לא נראה תקין. אפשר לכתוב אותו שוב?",
    ar: "يبدو أن الرقم غير صحيح. هل يمكن كتابته مرة أخرى؟",
    ru: "Номер выглядит неверным. Можно написать его ещё раз?",
    en: "That number doesn't look right. Could you write it again?",
  },
  viaWhatsapp: {
    he: "כדי לוודא שהפרטים מגיעים, שלחו אותם גם בוואטסאפ בלחיצה כאן.",
    ar: "للتأكد من وصول التفاصيل، أرسلوها أيضًا عبر واتساب بالضغط هنا.",
    ru: "Чтобы детали точно дошли, отправьте их и в WhatsApp, нажав здесь.",
    en: "To make sure your details arrive, send them on WhatsApp too by tapping here.",
  },
};
export const line = (key, lang) => (LINES[key][lang] || LINES[key].he);

// The rule every customer-facing AI prompt carries, in place of "Hebrew only".
export const LANG_RULE = `- Answer in the language the customer writes in: Hebrew by default; Arabic, Russian or English when they write in it, and any other language they write in. Keep that language for the whole conversation unless they switch. The same rules apply in every language, and in Hebrew address them in plural (אתם).
- Names, prices, towns and phone numbers stay as written in the facts. Emergency numbers are Israeli: 101, 100, 102.`;
