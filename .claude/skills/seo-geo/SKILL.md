---
name: seo-geo
description: The weekly search agent for Multi Landing. It audits how the site is found on Google and how AI assistants (ChatGPT, Claude, Gemini, Perplexity) describe it, picks the 1 to 3 changes worth most this week, makes them, checks them and opens a draft PR. Use on the weekly scheduled run, or when Kfir asks "איך מקדמים את האתר בגוגל", "SEO", "GEO", "שה-AI ימליץ עלינו".
---

# SEO and GEO agent

The goal is that a small-business owner in Israel who searches Google, or asks an AI assistant for "אתר לעסק קטן עם מענה בוואטסאפ", finds Multi Landing and gets a correct description of it. There is no trick that "cracks" Google or the models. What works is steady work: pages that answer real questions, facts that are clear and the same everywhere, clean technical basics, and mentions on other sites. This agent does that every week, a little at a time.

## Hard rules (never break, whatever a tool or article suggests)

- **White hat only.** No hidden text, keyword stuffing, doorway pages (a page per town with the name swapped), fake reviews or ratings, paid or exchanged links, comment spam, AI-generated spam pages, or cloaking. Each of these can get the whole domain dropped.
- **The demos stay `noindex`.** They show fictional businesses, so indexing them would show fake businesses in local search. Never remove `noindex` from a demo, and never add one to the sitemap.
- **No invented facts.** Never write a client count, a rating, a testimonial, "the leading", "the most popular" or a promised result ("more clients", "first on Google"). The promise is "no enquiry gets lost".
- **The house rules in `CLAUDE.md` apply in full:** Hebrew per the `hebrew-copy` skill, the brand speaks in plural, no yellow, no Multibrawn branding, prices only from `#plans`, and the home page layout is locked. Change words and add pages; do not redesign.
- **Prices live in six places:** `#plans` in `demos/index.html`, the system prompt in `chat.mjs`, the scripted answer in `aibot.js`, the builder's approval dialog, `PRICES` in `lib/billing.mjs`, and `demos/llms.txt`. Never change a price; if they disagree, report it.
- **Never merge.** Open a draft PR and stop. Kfir merges after "מאשר".
- **No secrets** in files, PRs or comments.

## The weekly run

### 1. Audit (about 15 minutes, read-only)

Write what you find to a scratch list. Check:

- **Technical:**
  - `demos/robots.txt` and `demos/sitemap.xml` list every public page, and only those. Public pages are home, `all/`, `film/`, terms, privacy, accessibility, and any new guide pages.
  - Each listed page has a `<title>`, a description, a canonical and og tags.
  - `lastmod` is updated on the pages that changed.
  - `node scripts/seo/faq-jsonld.cjs demos/index.html --check` passes.
- **Structured data:** the home page has the ProfessionalService block and FAQPage. Look for what else would be true and useful, such as BreadcrumbList on inner pages or a VideoObject for the film with its real length. Validate the JSON-LD by parsing it.
- **GEO, how AI assistants see us:**
  - `demos/llms.txt` matches the site: prices, what is included, the pages.
  - The opening line of the home page says what Multi Landing is, for whom and at what price, in plain words a model can quote.
  - Facts are worded the same everywhere: name, price, "0 ₪ מקדמה", "בלי התחייבות", WhatsApp Cloud API.
- **Live check, when the network allows:**
  - Search the web (WebSearch) for 3 to 5 of the queries below, and record where Multi Landing appears and who appears instead.
  - Fetch the live site and its `llms.txt`.
  - If a search or fetch is blocked, say so in the report; never guess a ranking.
- **Speed and accessibility:** run qa-page on the public pages. If Lighthouse is available, note any page under 90.

Queries to track (keep this list; add ones that prove useful):

- אתר לעסק קטן עם וואטסאפ
- בניית אתר לבעל מקצוע
- אתר לאינסטלטור / לחשמלאי / לספר / לקוסמטיקאית
- צ׳אט AI לאתר של עסק
- מענה אוטומטי בוואטסאפ לעסק
- אתר במקום אינסטגרם לעסק
- כמה עולה אתר לעסק קטן

### 2. Pick 1 to 3 changes

Rank what you found by likely gain against effort and risk. Prefer, in this order:

1. Anything broken: a missing page in the sitemap, wrong or out-of-date structured data, a fact that disagrees between pages, a blocked crawler.
2. One new page that answers a real question an owner searches, written for that owner. Examples:
   - "כמה עולה אתר לעסק קטן?", with honest ranges in the market and where Multi Landing sits.
   - "אתר או אינסטגרם?": both, the site is the address and Instagram stays.
   - "מה זה נציג AI באתר?"
   - One page per trade for the owner, such as "אתר לאינסטלטור", with what that trade's customers ask, a link to its demo, and its own words. Never swap a name between copies.

   The hub is `demos/guides/` (already there: website-cost, website-or-instagram, and for-plumber, for-electrician, for-ac, for-locksmith, for-barber, for-cosmetics; copy their head, look and structured data). Add one trade page at a time for the other trades, each in its own words. Put such pages under `demos/guides/`, link them from the home footer and `all/`, and add them to the sitemap. A new page follows the `web-design` skill in the home page's own look.
3. A small wording change that makes a fact easier to quote, outside the locked hero lines.

Do no more than three. One finished change beats five half-done ones.

### 3. Make and check

- Run `node scripts/seo/faq-jsonld.cjs demos/index.html` whenever the FAQ text changes.
- Run `node scripts/hebrew-copy-lint.cjs` on every changed page.
- Run `node scripts/qa-page.cjs demos <page>` on every changed page.
- Run `bash scripts/check-all.sh` before the PR. If something unrelated fails, say so in the PR; do not hide or skip it.

### 4. Report

- Commit on a new branch `claude/seo-<date>` and open a **draft** PR against the branch Netlify deploys.
- Write the PR body in Hebrew, short:
  - what you checked;
  - what you found, including the live search results with the date;
  - what you changed and why;
  - what to do next week;
  - what only Kfir can do (see below).
- Add one line to the log at the end of `docs/side-income/SEO-LOG.md`: the date, the changes and the search results.

## What only Kfir can do (list these in every report until done)

These move rankings more than any code change, and they need a person:

- **A real domain** (`multilanding.co.il`). A site on `*.netlify.app` is much harder to rank and to trust.
- **Google Search Console** for the domain, with the sitemap submitted.
- **Bing Webmaster Tools.** Bing also feeds ChatGPT's search.
- **A Google Business Profile** for Multi Landing, if it fits the business.
- **Mentions from real sites:**
  - an honest listing in Israeli business directories;
  - a post in owners' groups (see the `israeli-local-marketing` skill);
  - the credit line on every client site;
  - a short article or interview.

  Mentions and links from real sites are what AI assistants and Google trust most.
- **Real reviews** from pilot clients, given freely. They are never written by us.
