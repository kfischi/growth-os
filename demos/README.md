# אתר הדמו והמחירון

אתר Netlify אחד עם שלושה עמודים:

| כתובת | קובץ | מה זה |
| --- | --- | --- |
| `/` | `index.html` | עמוד ראשי: הבעיה, לינק לדמו, איך זה עובד, מחירון ושאלות |
| `/leads-demo/` | `leads-demo/index.html` | דמו של עסק בדוי עם סימולציית וואטסאפ (פרטים ב-`leads-demo/README.md`) |
| `/ai-agent/` | `ai-agent/index.html` | הדגמת נציג AI: שיחה מתוסרטת בשלושה סוגי עסק, פאנל "מאחורי הקלעים" ודשבורד לבעל העסק |

## העלאה ל-Vercel (מומלץ)

1. vercel.com ← Add New ← Project ← Import את `kfischi/growth-os`.
2. **Root Directory:** `demos`. זה הצעד החשוב. בלעדיו Vercel יבנה את אפליקציית ה-Next.js שבשורש הריפו.
3. Framework Preset: **Other**. אין פקודת בנייה ואין Output Directory.
4. Deploy. הכתובת תהיה בסגנון `<project>.vercel.app`, ואפשר לשנות אותה ב-Settings ← Domains.
5. כל push לענף הראשי מעדכן את האתר. כל PR מקבל כתובת תצוגה מקדימה משלו.

ההגדרות (כותרות אבטחה ו-noindex לדמואים) נמצאות ב-`vercel.json`.

## העלאה ל-Netlify (חלופה)

1. Netlify ← Add new site ← Import from GitHub ← `growth-os`.
2. Base directory: `demos`. אין פקודת בנייה.
3. כל push לענף שמחובר מעדכן את האתר. ההגדרות ב-`netlify.toml`.

## לפני שמפרסמים

- [x] ב-`index.html`, באובייקט `CONFIG`: `whatsappNumber` מוגדר (972526359513).
- [ ] לבדוק מול חברת החשבונית לשכיר אם המחירים כוללים מע״מ, ולהוסיף הערה למחירון בהתאם.
- [ ] לפתוח את האתר בנייד ולעבור על כל כפתור.

`/leads-demo/` ו-`/ai-agent/` מסומנים `noindex`, כדי שגוגל לא יאנדקס עסקים בדויים. העמוד הראשי פתוח לאינדוקס.
