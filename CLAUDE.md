# CLAUDE.md

## What this repo is

Two things live here:

1. **Growth OS** (`src/`, `supabase/`): a multi-tenant Next.js app. One deployment serves many business sites, keyed on domain, with AI-proposed copy that the owner approves. See `README.md`.
2. **Kfir's side-income channel** (`demos/`, `clients/`, `docs/side-income/`): lead systems for small local businesses. A landing page, an instant WhatsApp reply, follow-up reminders and a monthly report, sold as a setup fee plus a monthly retainer.

Kfir owns and runs the side-income channel. It is **not** Multibrawn. Never put Multibrawn branding on its pages, and never mix it with other projects.

## Skills for the side-income channel

| Skill | Use it when |
| --- | --- |
| `prospect-sketch` | A business showed interest. Build a personalised sketch before the call |
| `new-client-site` | A client paid. Build the real site in `clients/<slug>/` |
| `outreach-message` | Writing a first message, a follow-up or a pilot offer to a business |
| `qa-page` | Before sending any page to anyone |
| `monthly-report` | End of month. Turn a client's leads export into a short report |
| `weekly-review` | Weekly. Update `docs/side-income/TRACKER.md` and pick the week's focus |

## House rules for anything a client or prospect sees

- **Hebrew:** correct, short and plain. No spelling mistakes. Address the reader in plural (`אתם`) unless you know who it is.
- **No overpromising.** Never promise "double your clients". The promise is "no enquiry gets lost".
- **No yellow** in any palette. Aim for modern and premium, not cheap.
- **Mobile first and RTL.** Every page passes `node scripts/qa-page.cjs <dir> [page]` before it ships.
- **The client owns their assets.** Domain and hosting accounts are registered in the client's name.
- **Paid clients use the official WhatsApp Cloud API.** Unofficial gateways such as Evolution API are for demos and internal use only, because they risk getting the number banned.

## Prices (source of truth: `demos/index.html`)

| Package | Setup | Monthly |
| --- | --- | --- |
| נוכחות | 1,500 ₪ | 150 ₪ |
| לידים | 2,800 ₪ | 700 ₪ |
| נציג AI | 4,500 ₪ | 1,200 ₪ |

The first 3 clients get the pilot price for לידים: 1,900 ₪ setup and 450 ₪ a month.

## Checks

- Static pages: `node scripts/qa-page.cjs <dir> [page-path]`. Needs Playwright: `npm i -D playwright && npx playwright install chromium`.
- Next app: `npm run lint` and `npm run typecheck`. ESLint ignores `demos/**` and `clients/**`.
