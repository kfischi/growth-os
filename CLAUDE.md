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
| `outreach-message` | Writing a first message, a follow-up or an offer to a business |
| `web-design` | Before designing or restyling any page. Bans the AI-default looks and finds the identity in the subject |
| `hebrew-copy` | Before writing or reviewing any Hebrew a client or prospect reads. Israeli voice, AI-tell ban list, correct Hebrew |
| `israeli-local-marketing` | Bringing leads for a client or for Kfir: Google Business Profile, WhatsApp, local groups, reviews, seasons, the spam law |
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

## Prices (source of truth: the `#plans` section of `demos/index.html`)

| Package | Setup | Monthly |
| --- | --- | --- |
| נוכחות | 1,500 ₪ | 150 ₪ |
| נציג AI (the page, the lead system and the AI chat) | 2,250 ₪, or 3 payments of 750 ₪ | 500 ₪ from the fourth month |
| ניהול עצמאי (Sanity content panel), add-on to either package | + 1,000 ₪ once | no change |

- Annual prepayment: 12 months for the price of 10.
- No commitment: cancel with 30 days' notice. A client who pays setup in installments and stops before the third one pays the rest of the setup.
- If the monthly payment stops, the page and the domain stay the client's. The automatic reply, the AI chat, the alerts and the leads table work only while the monthly payment runs.
- There is no pilot price any more. The soft entry is the three-payment setup.

## Niche demos

Live at https://service-pro-web.netlify.app (Netlify, publishing the `demos/` folder). Per-niche links for outreach are in `docs/side-income/OUTREACH.md`.

`demos/plumber/`, `demos/movers/`, `demos/trainer/`, `demos/ac/`, `demos/electrician/`, `demos/cleaning/`, `demos/renovation/`, `demos/locksmith/`, `demos/pest/`, `demos/appliance/`, `demos/handyman/`, `demos/garden/`, `demos/tutor/`, `demos/psychologist/` and `demos/social-worker/` are landing pages for fictional businesses, each with its own visual identity and the shared scripted chat `demos/shared/leadbot.js` (questions, phone check, summary, WhatsApp handoff). The newer pages also show the phone mockup from `demos/shared/phone.css`, which displays the visitor's own lead after the chat. Seven demos (plumber, electrician, tutor, renovation, movers, trainer, cleaning) show sample photos from `demos/shared/photos/`: small WebP crops of AI-generated images, with the fake shirt and box lettering removed and yellow recoloured. A frame shows its sample through `data-src` until the visitor picks their own photo in edit mode. The other pages use drawn SVG and CSS mockups. A real client site uses the client's own photos. The psychologist and social-worker pages show a crisis line (ער״ן 1201, מד״א 101) and their chats collect only the minimum needed for a first call; keep it that way. Sell to one niche at a time. A new niche page reuses `leadbot.js` and follows the `web-design` skill.

## Home page and AI chat

The home page `demos/index.html` is the "נחיתה רכה" sales page: animated scroll (GSAP and Lenis vendored in `demos/shared/vendor/`), the two packages in `#plans`, the 15 demos and a form that opens WhatsApp. `demos/all/` lists every demo with a short description. The old address `/start/` redirects to `/`.


`demos/shared/aibot.js` (UI) calls `demos/netlify/functions/chat.mjs` (`/api/chat`, Claude via the official SDK, `claude-opus-5-5`, effort low, server-side fallbacks). It runs on the home page and on `/all/`. The system prompt in that file and the scripted price answer in `aibot.js` hold the prices: keep both in sync with `#plans` in `demos/index.html`. Without `ANTHROPIC_API_KEY` in Netlify the chat falls back to scripted answers.

## Checks

- Hebrew copy: `node scripts/hebrew-copy-lint.cjs <file-or-dir>` flags AI-sounding and bureaucratic Hebrew.
- Static pages: `node scripts/qa-page.cjs <dir> [page-path]`. Needs Playwright: `npm i -D playwright && npx playwright install chromium`.
- Next app: `npm run lint` and `npm run typecheck`. ESLint ignores `demos/**` and `clients/**`.
