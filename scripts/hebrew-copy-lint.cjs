#!/usr/bin/env node
// Flags AI-sounding and bureaucratic Hebrew in pages and docs. See .claude/skills/hebrew-copy/SKILL.md.
// Usage: node scripts/hebrew-copy-lint.cjs <file-or-dir> [...more] [--strict]
// Scans .html, .md and .txt files. Prints file:line, the phrase, and a suggestion. --strict exits 1 on any hit.
const fs = require("fs");
const path = require("path");

const RULES = [
  [/בעידן ה|בעולם של היום|בעולם המודרני/, "פתיחה ריקה. למחוק ולהתחיל מהבעיה של הלקוח"],
  [/פתרונות? (מקיפ|כולל|מותאמ|חדשני)/, "להגיד מה בדיוק עושים"],
  [/מותאם אישית/, "להגיד במה זה מותאם, או למחוק"],
  [/חווי(ה|ית|ות) (בלתי נשכחת|מושלמת|ייחודית|לקוח)/, "שפת משרד פרסום. לכתוב מה הלקוח מקבל"],
  [/לשלב הבא|להזניק|להעצים|מהפכני|פורץ דרך|סינרגיה|ערך מוסף|אופטימלי/, "באזוורד מתורגם. תוצאה מוחשית במקום"],
  [/(צוות|שירות) (מקצועי|אמין|מנוסה|מסור)/, "כולם כותבים את זה. שם, שנות ניסיון, רישיון"],
  [/ברמה הגבוהה ביותר|ללא פשרות|ללא תחרות|הטובים ביותר/, "אי אפשר לבדוק. הבטחה שאפשר לבדוק"],
  [/המקום המושלם|הגעתם למקום הנכון/, "קלישאה. למחוק"],
  [/אל תהסס/, "רשמי ומתורגם. \"כתבו לנו\""],
  [/(^|[\s(])(אנו|הננו|הנכם|הינו|הינה|הינם)(?=[\s,.]|$)/, "רשמי. אנחנו / אתם / הוא, או למחוק"],
  [/במידה ו/, "\"אם\""],
  [/על מנת|בכדי/, "\"כדי\""],
  [/(^|\s)(לבצע|ביצוע) /, "פועל ביורוקרטי. הפועל עצמו: לנקות, לתקן, להתקין"],
  [/יש לציין|כמו כן|לאור זאת|(^|\s)אנא(?=\s)/, "ביורוקרטי. למחוק"],
  [/זה לא רק .{1,40}[,.] זה/, "תבנית AI: \"זה לא רק X, זה Y\""],
  [/(^|[\s.])לא עוד /, "תבנית AI: \"לא עוד X\""],
  [/בין אם .{1,60} ובין אם/, "ארוך ונוקשה. שני משפטים קצרים"],
  [/מגוון רחב/, "לא ברור. למנות שלושה שירותים"],
  [/יחס אישי/, "כולם כותבים. להראות במקום להגיד"],
  [/מגיע לכם את /, "שגיאה: \"מגיע לכם הטוב\" (בלי \"את\"), ועדיף למחוק"],
  [/בסופו של יום|לעשות את ההבדל|להיות שם בשבילכם/, "ניב מתורגם מאנגלית"],
  [/(^|\s)(ה)?מסע (שלכם|שלך|אל|לעבר)/, "\"מסע\" זו שפת AI"],
  [/לחצו כאן|לחץ כאן/, "כפתור עם פועל: \"לבדוק מחיר\""],
  [/עבורכם|עבורך|עבורנו/, "\"לכם\" / \"לך\" / \"לנו\""],
  [/את\/ה|לקוח\/ה|\b\/ה\b/, "בלי לוכסן מגדרי. רבים: אתם"],
  [/—/, "קו מפריד ארוך הוא סימן ל-AI. פסיק או נקודה"],
  [/!{2,}/, "סימן קריאה אחד לכל היותר"],
  [/[\u{2728}\u{1F680}\u{1F4AF}\u{1F525}\u{1F449}\u{2705}\u{1F31F}\u{1F4AA}\u{1F64C}]/u, "אמוג׳י כקישוט. למחוק"],
];

function walk(p, out) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(p)) if (!["node_modules", ".git", ".next"].includes(f)) walk(path.join(p, f), out);
  } else if (/\.(html?|md|txt)$/i.test(p)) out.push(p);
  return out;
}

// Drop CSS and markup but keep text, including strings inside <script> (chatbot copy lives there).
function textLines(src, file) {
  if (!/\.html?$/i.test(file)) return src.split("\n");
  return src
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ""))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ""))
    .replace(/<[^>\n]*>/g, " ")
    .split("\n");
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const targets = args.filter((a) => !a.startsWith("--"));
if (!targets.length) { console.error("usage: node scripts/hebrew-copy-lint.cjs <file-or-dir> [...] [--strict]"); process.exit(2); }

let hits = 0;
for (const t of targets) {
  for (const file of walk(t, [])) {
    const src = fs.readFileSync(file, "utf8");
    const lines = textLines(src, file);
    lines.forEach((line, i) => {
      if (!/[֐-׿]/.test(line) && !/—|!!/.test(line)) return;
      for (const [re, tip] of RULES) {
        const m = line.match(re);
        if (m) { hits++; console.log(`${file}:${i + 1}  "${m[0].trim()}"  →  ${tip}`); }
      }
    });
    if (/\.html?$/i.test(file) && /₪/.test(src) && /ש["״]ח/.test(src)) { hits++; console.log(`${file}  ₪ וש״ח באותו דף. לבחור אחד`); }
  }
}
console.log(hits ? `\n${hits} hits. Fix each one, or keep it with a reason.` : "Clean: no AI tells found.");
process.exit(strict && hits ? 1 : 0);
