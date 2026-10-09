---
name: web-design
description: Design a distinctive Hebrew/RTL website or landing page that does not look AI-generated — visual identity from the subject's own world, a deliberate Hebrew type pairing, a token palette, one bold move. Use before building or restyling any page in demos/ or clients/, or when Kfir says the design looks generic, "כמו כולם", or asks for a better/different look.
---

# Web design that doesn't look generated

Kfir rejected two rounds for looking like every other Claude-built page. Read this before designing any page.

## 1. Ban list (the AI-default looks)

Do not use any of these unless Kfir asks for them by name:

- warm cream background + serif display + terracotta/clay accent (the classic Claude look)
- near-black background with one acid-green or vermilion accent
- purple-to-blue gradient hero, or glowing gradient blobs on black
- broadsheet hairline rules with dense newspaper columns
- Heebo/Assistant/Inter as the only face; Frank Ruhl as the "luxury" face
- emoji as section markers or feature icons
- everything centered; `border-radius` + soft shadow on every block; 01/02/03 numbering that isn't a real sequence
- a full-viewport hero that pushes all content below the fold

## 2. Find the identity in the subject's world

Before writing any CSS, write three lines in a comment at the top of the `<style>`:

1. **The object.** What physical thing from this business's world can the page *be*? For example, a wine label for a winery cabin, a trail map for a hiking-area cabin, a postcard for a holiday, a menu card for a restaurant, a prescription pad for a clinic, a ticket stub for an events venue.
2. **The detail only this subject has.** Real units and terms used as content, not ornament: elevation and coordinates, vintage year, grape rows, trail blaze colors, check-in and check-out times.
3. **The one bold move.** Exactly one: giant condensed type, a rotated physical object, a generated canvas texture, or a single saturated field color. Keep everything around it quiet.

## 3. Hebrew type pairings that work (Google Fonts)

| Display | Body | Utility | Feels like |
| --- | --- | --- | --- |
| Karantina (condensed) | Rubik 300/400 | — | wine label, poster, cinema |
| Secular One | IBM Plex Sans Hebrew | IBM Plex Mono | signage, maps, technical |
| Suez One | Fredoka | — | playful, postcard, family |
| Rubik 900 (tight tracking) | Rubik 400 | IBM Plex Mono | Swiss, bold, modern |
| Bellefair | Alef | — | quiet, gallery, wellness |
| Noto Serif Hebrew 900 | Noto Sans Hebrew | — | institutional, trustworthy |

Pick the pairing from the object in step 2, never by habit. Always declare a fallback stack.

## 4. Tokens first

The first block in `<style>` is a `:root` of 4–6 named colour tokens plus `--display`, `--body` and optionally `--mono`. Name the tokens after the subject (`--oxblood`, `--bloom`, `--contour`, `--blaze-red`), not `--primary` and `--secondary`. Build every rule from the tokens. Neutrals lean toward the accent hue; no default grey. No yellow (house rule).

## 5. Execution checklist

- Mobile at 390px is designed, not just shrunk: check that the display type still fits and the bold move still reads.
- Grid and flex children that hold text get `min-width: 0`. No sideways scroll (QA checks this).
- Number and time ranges are written in words ("8:00 עד 10:00") so they don't flip in RTL. A `+` sign needs an LRM (`‎+20`).
- Focus states are visible, and `prefers-reduced-motion` is respected.
- One orchestrated motion moment at most.
- Run `node scripts/qa-page.cjs <dir> <page>`, then look at the desktop and mobile screenshots before showing Kfir.

## 6. Present directions, not a single guess

When the identity isn't settled, build 2–3 short direction pages (hero + booking bar + one content row) in `demos/styles/`. Each is grounded in a different object from step 2. Screenshot them and let Kfir pick before building the full page.
