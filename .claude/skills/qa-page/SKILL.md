---
name: qa-page
description: QA a static landing page under demos/ or clients/ before it goes to anyone — desktop and mobile screenshots, sideways scroll, JS/console errors, broken links and images, RTL, plus a copy and design review. Use before sending a sketch, launching a client site, or after any change to a page.
---

# QA a page before it ships

## 1. Automated checks

```bash
node scripts/qa-page.cjs <dir> [page-path] --out <scratch-dir>
# examples
node scripts/qa-page.cjs demos
node scripts/qa-page.cjs clients/<slug>
```

If Playwright is missing, the script says so. Install it with `npm i -D playwright && npx playwright install chromium`, or in a cloud session set `NODE_PATH` to the global node_modules that contains it.

A non-zero exit means the page is not ready. Fix every FAIL line and rerun. Don't explain a failure away.

## 2. Look at the screenshots

Open `desktop.png` and `mobile.png` and check:

- The headline and the main CTA are visible on the first mobile screen, without scrolling.
- Nothing overlaps, and no text is cut off or tiny.
- Contrast is readable. The palette has no yellow.
- RTL is correct: icons and arrows face the right way, and numbers and phone numbers read correctly.

## 3. Copy review (Hebrew)

- Run `node scripts/hebrew-copy-lint.cjs <page-dir>` and fix every hit (rules in the `hebrew-copy` skill).
- No spelling mistakes. Read every line once more.
- Short sentences. One idea per sentence.
- No promises the business can't keep: no "guaranteed", no "double", no invented numbers or reviews.
- The phone number, business name and service area match what the client gave.
- Gendered forms: plural (`אתם`) for the reader unless the audience is known.

## 4. Flow check

- Submit the form with an invalid phone number. An error must appear.
- Submit it with a valid number. The confirmation must appear and the page must not reload or break.
- Every WhatsApp button must open `wa.me/<number>` with the right prefilled text.
- On a client site: `CONFIG.webhookUrl` points at `/api/lead/<slug>` on the lead system, and one test lead arrives in the panel and on WhatsApp.

## 5. Report

Report in one short list: what passed, what you fixed, and anything that still needs the human (for example "the client hasn't sent a logo yet").
