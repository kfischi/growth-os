# Future demos

Ten demo pages for trades not yet in the builder. Each is `noindex, nofollow`, is not linked from the home page, `/all/`, the sitemap or the builder, and sends "לבנות אתר כזה" to `build/?t=other`. Each one shows a drawing until real sample photos exist.

To launch one:

1. Make its three photos from the prompts below (Figma `generate_image`, or any licensed image tool).
2. Crop them to WebP in `demos/shared/photos/` and put the hero in the page's frame.
3. Remove `noindex`.
4. Add the trade to the home picker (`T` in `demos/index.html`), to `/all/`, to the sitemap and to the builder: `templates/trades/<id>.mjs`, `trades/index.mjs` and `#fTrade`.
5. Add the page to `DEMOS` in `scripts/tests/demo-chats.cjs`.
6. Update the trade counts (30).

| Trade | Page | Fictional business |
| --- | --- | --- |
| נגר | `demos/carpenter/` | נגריית אלון · מטבחים וארונות (רחובות) |
| אלומיניום | `demos/aluminum/` | רז אלומיניום (אשדוד) |
| דוד שמש וחימום מים | `demos/water-heater/` | |
| ריצוף וחיפוי | `demos/tiling/` | |
| מוסך | `demos/garage/` | |
| תיקון סלולר ומחשבים | `demos/phone-repair/` | |
| עיצוב שיער לנשים | `demos/hair/` | שירה לוי · עיצוב שיער (כפר סבא) |
| פיזיותרפיה | `demos/physio/` | מיכל אורן · פיזיותרפיה (מודיעין) |
| קייטרינג | `demos/catering/` | |
| DJ לאירועים | `demos/dj/` | |

## Image prompts

Every prompt is realistic, in an Israeli setting, with no faces, no text or logos, and no yellow.

### Carpenter
1. Hero, 4:5: A newly installed custom kitchen in a bright Israeli apartment, matte grey-green MDF lower cabinets and white upper cabinets up to the ceiling, a walnut wood countertop, one drawer slightly open showing soft-close slides, a carpenter's tape measure and pencil on the counter, late-afternoon daylight from a window with an aluminium shutter, a white tiled backsplash, photorealistic, no people, no text, no logos, no yellow tones.
2. Work: Close-up of a carpenter's workbench in a small Israeli workshop: stacked birch plywood sheets with their layered edges visible, a cabinet door with a concealed hinge being fitted, a cordless drill and clamps, sawdust, cool neutral light, shallow depth of field, photorealistic, no faces, no text or brand marks, no yellow.
3. Work: A built-in floor-to-ceiling wardrobe with white sliding doors in an Israeli bedroom, one door slid open showing shelves, hanging rail and drawers, a light oak parquet floor, soft daylight, clean and premium, photorealistic, no people, no text, no logos, no yellow.

### Aluminium
1. Hero, 4:5: A large aluminium sliding door to a balcony in a modern Israeli apartment, anthracite-grey frame, a double-glazed sash half open, a white roll-up mosquito net partly drawn, a view of white residential buildings and a clear sky outside, a technician's toolbox and spare rollers on the floor by the track, photorealistic, no people, no text, no logos, no yellow.
2. Work: Close-up of hands in work gloves replacing a roller at the bottom of an aluminium sliding window sash, the sash resting on a padded surface, new and old rollers side by side, a screwdriver, cool daylight, photorealistic, no faces, no text, no brand names, no yellow.
3. Work: A frameless tempered-glass corner shower enclosure in a bright Israeli bathroom, matte black hinges and handle, light grey large-format tiles, water droplets on the glass, soft diffused light, photorealistic, no people, no text, no logos, no yellow.

### Women's hair
1. Hero, 4:5: Realistic photo inside a small modern hair studio in an Israeli town, a woman seen only from behind in a salon chair facing a large arched mirror, long brown hair with soft copper balayage falling over a dark bottle-green cape, face not visible in the mirror (mirror angled away or softly out of focus), cool daylight from a window, sage-grey walls, a trolley with colour bowls and brushes, no text, no logos, no yellow tones.
2. Work: Close-up realistic photo of a hairstylist's gloved hands applying hair colour with a brush to sectioned brown hair seen from behind, foils and clips, a mixing bowl on a trolley, cool natural light, muted green and copper palette, no face, no text, no logos, no yellow.
3. Work: Realistic photo from behind of a finished bridal updo with soft waves and small pins on dark brown hair, bare shoulders, a sheer veil edge, in a bright Israeli apartment by a window, shallow depth of field, no face, no text, no logos, no yellow or gold tones.

### Physiotherapy
1. Hero, 4:5: Realistic photo of a bright, modern physiotherapy clinic room in Israel, a treatment bed with navy vinyl, a rolled exercise mat, resistance bands and a foam roller on a shelf, a patient's shoulder with coral kinesiology tape and a therapist's hands guiding the arm upward, cropped at the shoulders so no faces show, cool daylight, white and navy palette, no text, no logos, no yellow.
2. Work: Close-up realistic photo of a physiotherapist's hands measuring knee bend with a goniometer on a patient lying on a treatment bed, shorts and bare knee, clinical but warm daylight, navy and white tones, no faces, no text, no logos, no yellow.
3. Work: Realistic photo of a home-visit physiotherapy session in an Israeli apartment living room, an older person's legs and hands holding a light resistance band while seated on a chair, the therapist's hands supporting the ankle, a tiled floor and a window with soft light, no faces, no text, no logos, no yellow.
