---
name: prospect-sketch
description: Build a personalised landing-page sketch for a specific prospect business before the sales call, from the lead-system demo template, under demos/sketch-<slug>/. Use when a business replied to outreach, or Kfir says "תכין סקיצה ל..." / "make a sketch for <business>".
---

# Personalised sketch for a prospect

The goal is a page that makes the business owner think "this is already my business", built in under 30 minutes. It is a sketch, not the final site.

## Inputs to ask for (only what's missing)

- Business name and what they do, in one line
- Area served
- 3 main services
- A public source if there is one (Facebook page, Google Maps listing, Instagram). Use only public, factual details from it.
- The prospect's first name, for the WhatsApp preview

Don't block on photos or a logo. Use the business name as a text logo and neutral visuals.

## Build

1. Copy `demos/leads-demo/` to `demos/sketch-<slug>/`. Use a short Latin slug, such as `sketch-danny-plumbing`.
2. Replace the content:
   - `<title>`, the header logo text, the eyebrow (service and area), the H1, the lead text and the 3 points
   - The service options in the `<select>`, so they match the business
   - The 3 service tiles, the "how it works" steps if needed, and the FAQ (areas, response time, warranty, only where known)
   - `CONFIG.businessName`
   - The WhatsApp reply text in `playDemo()`, so it fits the business ("קיבלנו את הפנייה שלך בנושא…")
3. Change the palette in `:root` to suit the trade: clean blues and greens for technical trades, warm neutrals for wellness and beauty. Never yellow.
4. Change the top demo bar to: `סקיצה ל<שם העסק>. מלאו את הטופס כדי לראות מה הלקוחות שלכם יקבלו.`
5. Keep `noindex`. Keep `webhookUrl` empty.

## Rules

- Never invent reviews, numbers of clients, years in business or certifications. If it isn't known, leave it out.
- Don't present the sketch as the business's real site. It stays clearly marked as a sketch.

## Finish

1. Run the `qa-page` skill on `demos sketch-<slug>/`.
2. Commit, push and give Kfir the path. Once Netlify deploys it, the URL is `https://<site>/sketch-<slug>/`.
3. Draft the message that sends it, using the `outreach-message` skill (type: sketch).
4. If the prospect doesn't buy within 30 days, delete the folder. Don't keep sketches of businesses that said no.
