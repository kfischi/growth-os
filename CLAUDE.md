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

The home page `demos/index.html` is the sales page, built as one story with a top menu: the site's name "נחיתה רכה" in the top bar, a hero whose headline is the slogan ("אתרים שבונים עסקים") and what it is right under it ("אתר שעונה ללקוחות, גם כשאתם עסוקים") next to a short film of one working day on two phones ("העסק היום" against "עם אתר שעונה": the same five enquiries, missed on one phone and answered on the other, with subtitles and a final score of 1 against 5; the film's own light turns from morning to dusk), then what you get (three parts), how it works (three steps), the 15 demos as small cards in each business's own colours, the prices (`#plans`), common questions and the WhatsApp form. Font: Rubik. No libraries, no background animation, nothing pinned to the scroll. `demos/all/` lists every demo with a short description. The old address `/start/` redirects to `/`.

`demos/shared/aibot.js` (UI) calls `demos/netlify/functions/chat.mjs` (`/api/chat`, Claude via the official SDK, `claude-opus-5-5`, effort low, server-side fallbacks). It runs on the home page and on `/all/`. The system prompt in that file and the scripted price answer in `aibot.js` hold the prices: keep both in sync with `#plans` in `demos/index.html`. Without `ANTHROPIC_API_KEY` in Netlify the chat falls back to scripted answers.

## The lead system (the real backend)

Full guide: `docs/side-income/LEAD_SYSTEM.md`. Netlify Functions on the same site, Supabase for storage (its own project, tables `ls_*` from `supabase/lead-system/0001_lead_system.sql`, not Growth OS), and the official WhatsApp Cloud API. No n8n.

- `POST /api/lead/<slug>` (`lead.mjs`): stores the enquiry, answers the lead from the business's number, alerts the owner with a "טיפלתי" button. Any answer but `{ ok: true }` means the page falls back to opening WhatsApp.
- `/api/wa-webhook`: delivery statuses, the owner's "טיפלתי", replies from leads. Verified with `WA_APP_SECRET`.
- `reminders.mjs` (every 15 minutes) and `monthly-report.mjs` (the 1st of the month): scheduled.
- `/panel/` with `/api/leads`: the owner's panel. Owners log in with a key made by `scripts/lead-system/new-client.mjs`; only its hash is stored.
- `POST /api/chat/<slug>` (`client-chat.mjs`): the AI chat on a client's site, from `ls_clients.chat_facts`. It turns a name and a phone into a lead.
- Shared code: `demos/netlify/lib/leads.mjs`. The page side: `demos/shared/leadform.js` and the options of `aibot.js`.
- The home page form also sends to `/api/lead/kfir` and still opens WhatsApp.
- Secrets only in Netlify environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `WA_TOKEN_<SLUG>`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `LEADS_ADMIN_KEY`, `HEALTH_KEY`, `ANTHROPIC_API_KEY`. Never in the repo or the chat.
- `active = false` on a client stops the system when the monthly payment stops. The page keeps working.
- The page shows "received" only when the lead is stored **and** the owner's WhatsApp alert went out. Otherwise `/api/lead` answers `alert_failed` and the page opens WhatsApp. Failures show in red in the panel and fail `/api/health` (`health.mjs`), which an uptime monitor checks every 5 minutes. Leads older than two years are deleted on the 1st of the month.

## Client sites

A paying client gets a real site in `clients/<slug>/`, copied from the trade demo and cleaned of every demo mark. The worked example is `clients/sample-plumber/` (a fictional business, kept `noindex`). Each site is self-contained (its own `assets/`), hosted on its own Netlify site, preferably in the client's own free account, and deployed by `.github/workflows/deploy-clients.yml` from `clients/<slug>/netlify.json` and a token in GitHub secrets. Guide: `docs/side-income/CLIENT_SITES.md`.

## Checks

- Hebrew copy: `node scripts/hebrew-copy-lint.cjs <file-or-dir>` flags AI-sounding and bureaucratic Hebrew.
- Static pages: `node scripts/qa-page.cjs <dir> [page-path]`. Needs Playwright: `npm i -D playwright && npx playwright install chromium`.
- Next app: `npm run lint` and `npm run typecheck`. ESLint ignores `demos/**` and `clients/**`.
