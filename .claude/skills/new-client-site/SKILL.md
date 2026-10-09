---
name: new-client-site
description: Build and launch a paying client's lead-system site in clients/<slug>/ — landing page, form wired to the lead system (Netlify Functions + Supabase + WhatsApp Cloud API), WhatsApp reply, owner panel, thank-you state, launch checklist. Use when a client has paid or signed, or Kfir says "לקוח חדש", "תקים אתר ל...", "new client site".
---

# New client site (paid)

## 1. Intake: everything needed, asked once

Collect it in one message to Kfir. Mark what's missing and don't guess.

| Field | Example |
| --- | --- |
| Business name and one-line description | "אוויר נקי, טכנאי מיזוג" |
| Package | נוכחות / נציג AI, and whether the ניהול עצמאי (Sanity) add-on was bought |
| Area served | עמק חפר, חדרה, נתניה |
| Services (3–6) | תיקון, התקנה, ניקוי |
| The questions customers ask most (3–5) | for the FAQ |
| Response promise the business can actually keep | "חוזרים עד שעתיים בשעות העבודה" |
| WhatsApp business number | 9725XXXXXXXX |
| Owner alert number (if different) | |
| Logo, photos and brand colours | if they have them |
| Domain | the client's name, or to be bought in the client's name |

If a sketch exists in `demos/sketch-<slug>/`, start from it.

## 2. Build

1. Copy from `demos/sketch-<slug>/` if it exists, otherwise from `demos/leads-demo/`, into `clients/<slug>/`.
2. Remove everything that belongs to the demo:
   - the top demo bar
   - the whole `.overlay` dialog, the `playDemo`, `resetStage` and `closeDemo` functions and their CSS
   - `<meta name="robots" content="noindex">`
   - "דף דמו" in the footer. The footer gets the business name and year.
3. After a successful submit, replace the overlay with an inline thank-you state inside the form card:
   `תודה, {firstName}! קיבלנו את הפנייה. הודעת אישור בדרך אליכם בוואטסאפ.` Hide the form fields, show the message, and move focus to it.
4. Fill in `CONFIG`: `https://service-pro-web.netlify.app/api/lead/<slug>` in `webhookUrl`, the business number in `whatsappNumber` (the fallback when the system is down), and `businessName`.
5. Add an `og:title`, an `og:description` and a favicon (the business initial in an SVG is fine).
6. Add `clients/<slug>/netlify.toml` with `publish = "."` and the security headers, without noindex.
7. Add `clients/<slug>/CLIENT.md` with the intake table, the package, the launch date, the retainer amount and the billing method (monthly or annual).

## 3. Automation (נציג AI package)

Follow `docs/side-income/LEAD_SYSTEM.md` → "לקוח חדש בחבילת נציג AI":
1. `node scripts/lead-system/new-client.mjs <slug> "<name>" <owner mobile> <https://domain> ...` prints the SQL row and the owner's panel link. The link is the password: Kfir sends it privately, it never goes in the repo.
2. The business's WhatsApp number in the client's own Meta Business account, the token in Netlify as `WA_TOKEN_<SLUG>`, the Phone number ID in `ls_clients`.
3. The four templates (`lead_ack`, `owner_new_lead`, `owner_reminder`, `monthly_report`) approved in Meta, with the business name and its real response time in `lead_ack`.
4. If the AI chat is on the page: `chat_facts` filled with facts the client confirmed, and `AiBot.init` pointed at `/api/chat/<slug>`.
A נוכחות client has no row in the system: the page opens WhatsApp directly.

## 4. Launch checklist

- [ ] `qa-page` passes on `clients/<slug>`
- [ ] A real test lead arrives in the panel (`/panel/`), on the lead's WhatsApp and on the owner's WhatsApp
- [ ] "טיפלתי" on the owner's WhatsApp marks it in the panel, and a reminder arrives for a lead left open
- [ ] The test leads have been deleted (`delete from ls_leads where client_slug = '<slug>';`)
- [ ] The domain is connected, HTTPS works, and the `www` and bare domain both resolve
- [ ] The client has seen the site on their phone and approved it in writing (WhatsApp is fine)
- [ ] `CLIENT.md` is complete and the row in `docs/side-income/TRACKER.md` is updated

## Rules

- Accounts (domain, Netlify team or site ownership, WhatsApp Business) are registered in the client's name, or transferable to it.
- Never commit API keys, tokens or panel keys. The lead URL is public by design; secrets stay in Netlify environment variables.
- Only facts the client confirmed go on the page.
