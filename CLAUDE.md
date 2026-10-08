# CLAUDE.md

## What this repo is

Two things live here:

1. **Growth OS** (`src/`, `supabase/`): a multi-tenant Next.js app. One deployment serves many business sites, keyed on domain, with AI-proposed copy that the owner approves. See `README.md`.
2. **Kfir's side-income channel** (`demos/`, `clients/`, `docs/side-income/`): **ישיר**, a direct-booking subscription for צימרים. See "The product" below.

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
- **No overpromising.** Never promise more bookings or "double your clients". The promise is "direct bookings pay no commission".
- **No yellow** in any palette. Aim for modern and premium, not cheap.
- **Mobile first and RTL.** Every page passes `node scripts/qa-page.cjs <dir> [page]` before it ships.
- **The client owns their assets.** Domain and hosting accounts are registered in the client's name.
- **Paid clients use the official WhatsApp Cloud API.** Unofficial gateways such as Evolution API are for demos and internal use only, because they risk getting the number banned.

## The product: ישיר (source of truth: `demos/index.html`)

One product, one niche: a direct-booking system for צימרים and holiday cabins. The pitch is money, not features: every direct booking keeps the platform commission with the owner. One subscription per cabin business, with no percentage of bookings.

| | Price |
| --- | --- |
| Setup | 2,500 ₪ |
| Monthly | 490 ₪ |
| Founding offer (first 5 cabins) | 1,200 ₪ setup, 490 ₪ locked for 12 months, in exchange for a testimonial and permission to show the numbers |

- **Demo cabin site:** `demos/bein-hakramim/` (a fictional place). It has a live availability calendar, the final price, a 24-hour hold with a deposit link, and a digital host.
- **Sales page:** `demos/index.html`. It includes a commission calculator. The commission rate is an input; never state a platform's rate as fact.
- **Don't promise** extra bookings or occupancy. The claims are: direct bookings pay no commission, and calendar sync prevents double bookings.
- The older generic pages (`leads-demo/`, `ai-agent/`) stay online but are not the offer.

## Checks

- Static pages: `node scripts/qa-page.cjs <dir> [page-path]`. Needs Playwright: `npm i -D playwright && npx playwright install chromium`.
- Next app: `npm run lint` and `npm run typecheck`. ESLint ignores `demos/**` and `clients/**`.
