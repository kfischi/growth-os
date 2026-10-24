---
name: ai-view
description: Looks at the Multi Landing site from the outside, the way ChatGPT or another AI assistant meets it. It shows what a crawler without scripts reads, has a cold reader that knows nothing of the repo answer owners' questions from that alone, compares with the real ChatGPT's answers when Kfir pastes them, and fixes what blocks a correct answer or a recommendation. Use when Kfir says "תבדוק איך ChatGPT רואה את האתר", "מבט חיצוני", "מה ה-AI יגיד עלינו", "למה ChatGPT לא ממליץ", after a big copy change, or once a month.
---

# The outside view: the site through an AI assistant's eyes

The goal: when a small-business owner asks ChatGPT, Gemini, Claude or Perplexity about a site for their business, the assistant finds Multi Landing, describes it correctly and has a reason to suggest it.

**Be honest about what this is.** This skill does not run ChatGPT and cannot see inside it.
- **It simulates the view:** it gives a reader only what an outside crawler sees and asks what that reader would answer.
- **The real ChatGPT is step 3,** and only through answers Kfir pastes in.
- **Never write "ChatGPT says" about something you did not see,** and never invent a ranking or an answer.

## Hard rules

- **The house rules in `CLAUDE.md` apply in full:**
  - prices only from `#plans`;
  - the home page's locked lines and layout stay;
  - no yellow, no Multibrawn, the brand speaks in plural;
  - Hebrew per the `hebrew-copy` skill.
- **White hat only, as in `seo-geo`:**
  - no text hidden from people and shown to bots (cloaking);
  - no keyword stuffing;
  - no fake reviews, ratings or client counts;
  - no "the leading" or "the most popular".
  - What a crawler reads must be what a person sees.
- **The demos stay `noindex`,** and fictional businesses are never presented as real.
- **Never merge.** Never change a price; if two places disagree, report it.

## 1. What a crawler sees (automatic)

Run `NODE_PATH=/opt/node-tools/node_modules node scripts/seo/ai-view.cjs <scratch>/ai-view --rendered`. For each page in `demos/sitemap.xml` it writes:
- **The page's head:** the title, the description, the canonical, the robots line and the structured data types.
- **The text without scripts:** what GPTBot, ClaudeBot and PerplexityBot read, because they don't run JavaScript.
- **The text only after scripts run:** the lines those crawlers miss.

It also copies `llms.txt` and `robots.txt`, and writes `summary.md`.

Read `summary.md` first. Anything important that shows up only after scripts run is a finding: a price, what is included, the list of trades, a fact in the FAQ. The fix is to write it in the HTML too, with the script producing the same thing. Example, fixed on 2026-10-24: the monthly 290 ₪ on the home page was written only by the script.

Also check:
- **robots.txt:** it does not block the AI crawlers: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, Bingbot.
- **Indexing:** every public page is indexable.
- **Facts:** the same facts appear the same way in the home page, `llms.txt`, the FAQ JSON-LD and the guides (name, price, "0 ₪ מקדמה", "בלי התחייבות", WhatsApp Cloud API).

## 2. A cold reader (a simulated assistant)

Start **one fresh agent** (`general-purpose`). Give it only the path to the folder from step 1, and tell it:
- read only the files in that folder;
- open nothing else in the repo;
- do not search the web.

It plays an AI assistant like ChatGPT with web search that found only these pages. Give it this brief:

1. **Answer each question below the way it would answer a user,** in two or three sentences. Under each answer:
   - quote the line it relied on, with its page;
   - write "לא נמצא באתר" when the pages don't say it;
   - write "סותר" with both lines when the pages disagree.

   The questions:
   - מה זה Multi Landing, ולמי זה מתאים?
   - כמה זה עולה, הקמה וחודשי? יש מע״מ?
   - מה בדיוק כלול?
   - לאילו תחומים יש דוגמה?
   - איך מתחילים, וכמה זמן זה לוקח?
   - יש התחייבות? מה קורה אם מפסיקים לשלם?
   - האם החיבור לוואטסאפ רשמי ובטוח למספר שלי?
   - מי עומד מאחורי השירות, ואיך יוצרים קשר?
   - האתר עומד בחוק הפרטיות ובתקן הנגישות?
   - במה זה שונה מאתר ב-Wix או מאינסטגרם בלבד?
2. **Recommendation tests:** answer, as the assistant would, each of:
   - "אני חשמלאי בחדרה בלי אתר, מה כדאי לי?"
   - "צריך אתר זול לעסק קטן שעונה ללקוחות בוואטסאפ"
   - "אילו שירותים בונים אתר עם צ׳אט AI לעסקים בישראל?"

   For each, say whether it would mention Multi Landing. If not, say what stopped it. Examples: no reviews or proof of real clients, a `netlify.app` address, no business details or contact, a vague fact.
3. **A critic's list:** what an assistant would hesitate over, what a first-time owner would not understand, and what is missing or worded differently across pages. Each item gets its page, the line, and a suggested fix.

## 3. The real ChatGPT (only when Kfir can paste)

These queries go to the live assistants, so run them only when Kfir is in the conversation.

- **Search the web yourself:** with WebSearch, if it is available, search 3 to 5 queries from the `seo-geo` list. Record who appears and whether we do, with the date.
- **Give Kfir prompts to paste into ChatGPT** (with search on), and if he likes into Gemini and Perplexity, then ask him to paste the full answers back.
  - **Prompts that name us:** "מה זה Multi Landing (service-pro-web.netlify.app)? כמה זה עולה ומה כלול?"
  - **A neutral prompt:** "אני בעל מקצוע בשרון, צריך אתר שעונה ללקוחות בוואטסאפ. מה אתה ממליץ?"
- **Compare each pasted answer with the site's facts:**
  - wrong facts and where they came from;
  - what it left out;
  - which competitor it named, and why.
- **Without pasted answers, say plainly that the real check was not done.**

## 4. Triage and fix

Rank the findings:

1. **A wrong or invisible fact:** a price, what is included, a promise, a contradiction between pages, or something crawlers can't read.
2. **What blocks a recommendation and can be fixed on the site:** a clear contact and business line, a page that answers a common question.
3. **Wording that is hard to quote,** outside the locked lines.
4. **What only Kfir can do:** a domain, Search Console and Bing, real reviews and mentions, a Google Business Profile.

Then:
- **Fix at most 5 safe items** from 1 to 3.
- **Run the checks on what you changed:**
  - `node scripts/hebrew-copy-lint.cjs`;
  - `node scripts/qa-page.cjs demos <page>`;
  - `node scripts/seo/faq-jsonld.cjs demos/index.html --check`;
  - run step 1 again to show the fix.
- **Commit:**
  - on the working branch when Kfir asked in the conversation;
  - otherwise on `claude/ai-view-<date>`, with a **draft** PR.

## 5. Report to Kfir, in Hebrew, short

1. **What an AI sees:** two or three lines, with the most important finding first.
2. **How the cold reader answered:** the question, its answer, and whether it is right, missing or contradictory.
3. **Would it recommend us,** and what stops it.
4. **What I fixed,** one line each, before and after.
5. **For you to decide:** items with a suggested wording.
6. **Only you can do:** the outside items.
7. **What was not checked and why:** for example, the real ChatGPT without pasted answers, or the network.

Add one line to `docs/side-income/AI-VIEW-LOG.md`: the date, the main findings, the fixes and the open items.
