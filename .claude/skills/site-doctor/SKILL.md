---
name: site-doctor
description: The standing bug hunter for Multi Landing. Checks every part of the site and what connects to it, finds what is broken, traces the root cause, fixes it with a test and opens a draft PR. Covers the pages, demos, chats, builder, panel, Netlify functions, lead system, WhatsApp, Grow, Supabase and client sites. Use on the daily scheduled run, when Kfir says "משהו לא עובד", "יש באג", "תבדוק שהכול תקין", or after a big change.
---

# Site doctor

The goal: whatever a visitor, a business owner or Kfir touches works. When something breaks, it is found before a customer finds it. Fixes are real (root cause, a test, the checks green), never a patch that hides the symptom.

## Hard rules

- **Never touch secrets.** No key in a file, a log, a PR or a message. Secrets live only in Netlify (see CLAUDE.md).
- **Never touch real data.** No writes to production Supabase, no WhatsApp message to a real number, no Grow charge. Reproduce against the tests' fakes (`scripts/tests/*`), never against live services.
- **Never merge.** Open a draft PR; Kfir merges after "מאשר".
- **Never weaken a check to get green.** That means no skipping, disabling, or loosening a test. A failing test is a finding.
- **Never change prices, legal text, or the owner's locked lines.** The house rules in CLAUDE.md apply in full.
- **Keep each fix minimal and separate:** one root cause per commit, with what broke, why, and how it was proved.

## 1. Check (in this order, record every result)

**A. The repo, always possible.** Run `bash scripts/check-all.sh`. It covers:
- qa-page on every demo and client page;
- the Hebrew lint;
- every demo chat to its WhatsApp handoff on phone and desktop;
- the lead system end to end against fakes;
- function bundles and lint.

Also run the unit tests in `scripts/tests/` that check-all.sh does not run. Run each `*.test.mjs` from `demos/`.

**B. Contracts between the parts.**
- **Prices:** the same in all six places listed in CLAUDE.md.
- **Chat endpoints:** every `/api/...` path a page calls exists in `demos/netlify/functions/` and in `netlify.toml` redirects.
- **Shared scripts:** every page loads the shared scripts it uses (`leadbot.js`, `leadform.js`, `a11y.js`).
- **Client copies:** the copies in `clients/sample-plumber/assets/` match `demos/shared/`.
- **Supabase migrations:** they run in order and the code reads only columns that exist.
- **Lists:** the home trade list `T`, `/all/`, `trades/index.mjs` and `#fTrade` agree with each other.

**C. The live site, when the network allows.**
- **Pages:** fetch the main pages and a few demos from https://service-pro-web.netlify.app.
- **Public endpoints:** `/api/status/plumber`, and `/api/health` only if HEALTH_KEY is given to you, never guessed.
- **Live page check:** run qa-page's checks against the live URLs with Playwright: console errors, broken links and images, and sideways scroll.
- **If blocked:** if the network blocks the host, say so in the report and go on. Never invent a result.

**D. The services, when a connector is attached.**
- **Supabase:** the advisors (security and performance) and the last 24 hours of logs for errors in the `ls_*` project.
- **Netlify:** function logs, if available.
- **Without a connector:** say it was not checked.

## 2. Triage

For each finding:
1. **Reproduce it:** a failing test or a command that shows it.
2. **Find the root cause:** read the code path from the caller to the failure.
3. **Rate it:**
   - **Critical:** leads lost, payments, publishing, privacy.
   - **High:** a page or chat broken for visitors.
   - **Medium:** a wrong text or a broken link.
   - **Low:** cosmetic.

Fix critical and high first. Fix at most 5 things per run; list the rest in the report.

## 3. Fix

- **Add or adjust a test** that fails before the fix and passes after it, where the code has tests.
- **Make the smallest change** that fixes the cause.
- **Run the checks for what you touched,** then `bash scripts/check-all.sh` again. It must be at least as green as before.
- **Branch and PR:** commit on `claude/doctor-<date>` from the default branch, and open a **draft** PR.

## 4. Report, in Hebrew, short

1. **The PR link,** or "nothing to fix".
2. **What was checked** and the results. Say what could not be checked and why (network or connector).
3. **What was fixed,** one line each: the problem, the cause, the fix, and the proof.
4. **What is left,** with severity and a suggested fix.
5. **What only Kfir can do:** Netlify settings, secrets, Meta templates, the Grow account.

Keep a log at the end of `docs/side-income/DOCTOR-LOG.md`: one line per run with the date, findings, fixes and open items.
