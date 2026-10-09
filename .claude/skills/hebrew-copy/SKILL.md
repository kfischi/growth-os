---
name: hebrew-copy
description: Write or fix Hebrew copy (headlines, page text, buttons, chatbot lines, WhatsApp messages, posts) so it sounds like a real Israeli professional and not like AI or a translation. Use before writing any Hebrew text a client or prospect will read, when reviewing a page's Hebrew, or when Kfir says the text sounds "AI", "גנרי", "מתורגם" or "לא ישראלי".
---

# Hebrew copy that sounds Israeli, not generated

The test: would the business owner say this sentence to a customer at the door, or in a WhatsApp voice note? If not, rewrite it.

## 1. The voice

- **Talk like a good tradesperson on WhatsApp.** Short, direct, warm, a little dry. Not an ad agency, and not English in Hebrew letters.
- **Specifics instead of adjectives.** "חוזר אליכם תוך רבע שעה, בחדרה והסביבה" beats "שירות מהיר ואמין". Use numbers, towns, names, hours, years in the trade, the warranty, the licence.
- **One idea per sentence.** Most sentences run 4 to 12 words. Cut every word that doesn't add a fact.
- **Spoken register.** אנחנו, אתם, כדי, אם. Not אנו, הנכם, על מנת, במידה ו.
- **Address the reader in plural (אתם)**, or use the infinitive on buttons ("לקבוע טכנאי"). Never write "את/ה" or "לקוח/ה".
- **Humour is allowed if it comes from the trade:** "סתימה לא מחכה ליום ראשון". Never puns for their own sake.
- **Write in the owner's voice.** A one-person business says "אני", not "אנחנו".

## 2. AI tells to remove

`node scripts/hebrew-copy-lint.cjs <file-or-dir>` flags most of these. Fix every hit, or leave it only with a reason.

| Remove | Why | Write instead |
| --- | --- | --- |
| בעידן הדיגיטלי, בעולם של היום | An empty opener | Delete it and start with the customer's problem |
| פתרון מקיף, פתרונות מותאמים אישית | Says nothing | What you actually do: "מנקים, מחטאים ומחליפים פילטר" |
| חוויה בלתי נשכחת, חוויית לקוח מושלמת | Ad-agency language | What the customer gets: "חוזרים הביתה והכול במקום" |
| צוות מקצועי, אמין ומנוסה | Everyone writes this | A name, years and a licence: "אורן, 12 שנה בשטח" |
| ברמה הגבוהה ביותר, ללא פשרות | Can't be checked | A promise you can check: "אחריות 12 חודשים" |
| הגעתם למקום הנכון, המקום המושלם עבורכם | A cliché | Delete it |
| לקחת את העסק לשלב הבא, להזניק, להעצים | Translated buzzwords | A concrete result: "פניות מסודרות בוואטסאפ" |
| לא עוד X. הכירו את Y / זה לא רק X, זה Y | A typical AI template | A plain statement |
| בין אם אתם... ובין אם... | Long and stiff | Two short sentences |
| מגוון רחב של שירותים | Vague | List three services |
| יחס אישי וחם | Everyone writes this | Show it: "אותה מנקה בכל פעם" |
| אל תהססו לפנות אלינו | Formal and translated | "כתבו לנו", "שאלה? וואטסאפ" |
| לחצו כאן | Not a verb that says what happens | "לבדוק מחיר", "לקבוע טכנאי" |
| בסופו של יום, לעשות את ההבדל, להיות שם בשבילכם | English idioms | Delete, or say what you mean |
| מסע, להעצים, סינרגיה, ערך מוסף | Jargon | Plain words |
| A long dash (—), "!!", emoji as bullets ✨🚀✅ | Marks of generated text | A comma or a full stop. One "!" at most |
| Three adjectives in a row: "מהיר, אמין ומקצועי" | A list with no proof | One fact |
| Questions as an opener: "מחפשים...? רוצים...?" | A template | One question in the customer's words, then the answer |

## 3. Before and after

| Generated | Israeli |
| --- | --- |
| אינסטלציה מקצועית ואמינה בשירות 24/7 — כי מגיע לכם שקט נפשי! | נזילה? סתימה? כתבו עכשיו, ואורן חוזר אליכם תוך רבע שעה. |
| חוויית ניקיון ברמה אחרת! צוות מסור שיהפוך את ביתכם לפנינה ✨ | אותה מנקה, כל שבוע, באותה שעה. חוזרים הביתה והכול במקום. |
| הגיע הזמן להפוך לגרסה הטובה ביותר של עצמך! 💪 | שלושה אימונים בשבוע, 55 דקות, בסטודיו בחדרה. מתחילים באימון היכרות. |
| אנו מתמחים במגוון רחב של עבודות שיפוץ ברמת גימור גבוהה ללא פשרות | מטבח בשבעה שבועות. לוח זמנים בכתב לפני שמתחילים, ועדכון בוואטסאפ בכל יום חמישי. |
| שלום! אני העוזר הווירטואלי של העסק. איך אוכל לעזור לך היום? 😊 | היי, כאן אורן. שלוש שאלות קצרות, ואני חוזר אליכם. |
| לפרטים נוספים לחצו כאן | לבדוק מחיר |
| במידה ותרצו לקבל הצעת מחיר, אנא מלאו את הטופס | רוצים מחיר? ארבע שאלות בצ׳אט. |

Write only promises the business really keeps. "חוזר תוך רבע שעה" goes on the page only if the owner agreed to it. House rule: never promise more clients, bookings or income.

## 4. Formulas that work

- **The problem in the customer's words, then the next step:** "המזגן מטפטף? מתארים בצ׳אט, וטכנאי חוזר היום."
- **Proof through specifics:** years in the trade, area, licence, warranty, number of jobs (only true ones).
- **Price openness:** a range written in words ("250 עד 450 ₪"), plus "המחיר הסופי אחרי אבחון".
- **Local:** town names, "חדרה והסביבה", the kibbutz or moshav name. People hire someone from nearby.
- **Lower the risk:** "בלי התחייבות", "מחיר סגור לפני שמתחילים", "אחריות 12 חודשים" (only if true).

## 5. Lengths

| Element | Maximum |
| --- | --- |
| Hero headline (H1) | 8 words |
| Line under the headline | 25 words |
| Button | 3 words, starting with a verb |
| First WhatsApp message to a business | 50 words |
| First line of a Facebook post | 12 words |
| Google Ads | Headline 30 characters, description 90 characters |
| Chatbot message | 2 lines |

## 6. Correct Hebrew

- **Full spelling, consistently:** תוכנית, צהריים, שיפוצים, אינסטלטור, מייל, אימון.
- **Bureaucratic words to replace:**
  - הינו/הינה/הינם → הוא/היא/הם, or drop it
  - במידה ו → אם
  - על מנת, בכדי → כדי
  - לבצע ניקוי → לנקות
  - עבורכם → לכם
  - מספר (meaning "a few") → כמה
  - כמו כן, יש לציין, לאור זאת, אנא → delete
- **Common grammar mistake:** "מגיע לכם את הטוב ביותר" → "מגיע לכם הטוב ביותר" (better still, delete it).
- **Geresh and gershayim on pages:** צ׳אט, מ״ר, ש״ח, using ׳ and ״. In a WhatsApp message a plain ' and " are fine.
- **Numbers:** digits for prices, times and anything from 10 up. Write ranges in words ("8:00 עד 10:00") so they don't flip in RTL.
- **Currency:** "250 ₪" with a space. Don't mix ₪ and ש״ח on the same page.

## 7. Process

1. In one line: who is reading, and what they want right now (for example, "יש לה מים על הרצפה, והיא רוצה לדעת מתי מישהו מגיע").
2. Write the draft as if transcribing a voice note from the owner.
3. Run `node scripts/hebrew-copy-lint.cjs <file>` and fix the hits.
4. Cut 30 percent.
5. Read it aloud. Anything you wouldn't say to a customer gets rewritten.
6. Check against the house rules in `CLAUDE.md`: no overpromising, no yellow, plural address.
