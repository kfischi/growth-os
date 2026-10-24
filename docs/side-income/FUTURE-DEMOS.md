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
| דוד שמש וחימום מים | `demos/water-heater/` | גלעד דודי שמש (פתח תקווה) |
| ריצוף וחיפוי | `demos/tiling/` | יניב ריצוף וחיפוי (מודיעין) |
| מוסך | `demos/garage/` | מוסך דודי (ראשון לציון) |
| תיקון סלולר ומחשבים | `demos/phone-repair/` | מעבדת נועם (באר שבע) |
| עיצוב שיער לנשים | `demos/hair/` | שירה לוי · עיצוב שיער (כפר סבא) |
| פיזיותרפיה | `demos/physio/` | מיכל אורן · פיזיותרפיה (מודיעין) |
| קייטרינג | `demos/catering/` | המטבח של רונית · קייטרינג ביתי (פתח תקווה) |
| DJ לאירועים | `demos/dj/` | DJ עומר לוי (חיפה והצפון) |
| ריסים וגבות | `demos/lashes-brows/` | עדי שגיא · ריסים וגבות (רמת גן) |
| הסרת שיער (לייזר ושעווה) | `demos/hair-removal/` | קליניקת אלמה · הסרת שיער (חולון) |
| עוגות מעוצבות (קונדיטורית ביתית) | `demos/cakes/` | המתוקים של נוי · עוגות מעוצבות (הוד השרון) |

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

### Water heater
1. Hero, 4:5: Realistic photo of a flat concrete rooftop in an Israeli city at soft late-afternoon light. A white cylindrical solar water heater tank on a galvanized steel stand, two dark-blue glass solar collectors tilted beside it, copper and insulated pipes connecting them, an open technician's toolbox and a multimeter on the roof. Other rooftops with water tanks behind, pale blue sky, muted steel and copper tones, no people, no text, no logos, no yellow.
2. Work, 4:5: Close-up of a technician's gloved hands, no face, replacing the electric heating element at the bottom of an opened white solar water tank on a roof. A new coiled copper element, the old one crusted with white limescale lying on a cloth, a wrench and screwdriver nearby. Natural daylight, shallow depth of field, no text, no logos, no yellow.
3. Work, 4:5: Realistic photo of a newly installed white water heater tank on a stand on an Israeli apartment building roof, fresh insulated pipes and a neatly mounted grey thermostat cover. The old rusty tank lies disconnected beside it, ready to be taken away. Overcast winter light, concrete and steel palette, no people, no text, no logos, no yellow.

### Tiling
1. Hero, 4:5: Realistic photo of a living room floor in an Israeli apartment halfway through tiling. Large light-grey porcelain tiles 60 by 60 already laid with thin grey grout lines, the next row bare grey adhesive with notched trowel ridges, a spirit level and small plastic tile spacers on the tiles, a stack of tile boxes by a white wall. Soft daylight from a window, no people, no text, no logos, no yellow.
2. Work, 4:5: Close-up of a tiler's gloved hand, no face, pressing a large porcelain tile into adhesive with a rubber mallet beside it, red cross spacers in the joints, a notched trowel resting on the bucket edge. Clean modern bathroom walls behind in matte deep green tiles, natural light, shallow depth of field, no text, no logos, no yellow.
3. Work, 4:5: Realistic before-and-after detail of a shower wall in an Israeli bathroom. Left half with old dark stained grout lines, right half freshly renewed with clean light-grey grout between white rectangular wall tiles, a grout float and a damp sponge on the shower floor. Bright even light, no people, no text, no logos, no yellow.

### Catering
1. Hero, 4:5: An overhead view of a long home dining table set for a family brit in an Israeli apartment. A white linen cloth, aluminium foil trays of herbed rice, roast chicken pieces, a green salad with cherry tomatoes, roasted eggplant and red peppers, a braided challah on a wooden board, small bowls of tahini and olives. Soft daylight from a window, herb green accents, cool neutral tones, no people, no text, no logos, no yellow.
2. Work, 4:3: Hands in an apron arranging foil catering trays on a home kitchen counter, with a white marble-look surface and fresh parsley and coriander nearby. Only the hands and forearms show. Natural window light, Israeli home kitchen, no text, no logos, no yellow.
3. Work, 4:3: Shabbat trays ready for pickup, close up. Covered foil trays stacked neatly on a kitchen table beside a hot plate, a challah wrapped in a cloth, and a cooler bag on a chair. Late Friday afternoon light, Israeli apartment, no people, no text, no logos, no yellow.

### DJ
1. Hero, 4:5: A DJ controller with two jog wheels and a laptop on a stand at an outdoor Israeli garden wedding at dusk. String lights and olive trees blurred in the background, a soft red stage wash and cool white light. Only hands on the mixer, cropped at the wrists, no text, no logos, no yellow.
2. Work, 4:3: The dance floor of an Israeli event hall from behind the DJ booth: speakers on stands, moving-head lights in cool white and deep red beams over a blurred crowd seen only as silhouettes from behind, slight haze, no text, no logos, no yellow.
3. Work, 4:3: A close up of hands on a DJ mixer's faders and colourful pads, with over-ear headphones resting on the deck and a wireless microphone beside it, under a dim red and white booth light. Shallow depth of field, no text, no logos, no yellow.

### Garage
1. Hero, 4:5: A clean small independent car workshop in Israel in soft morning light, a mid-size family car with no badges raised on a two-post lift, a mechanic's gloved hands holding a brake disc near the wheel hub, grey epoxy floor, tool wall in graphite and red, light coming through a roll-up door with a glimpse of a Mediterranean street and a palm, realistic photo, shallow depth of field, no faces, no text, no logos, no car brand marks, no yellow.
2. Work: Close-up of a car's front wheel with the tyre removed, new brake pads and a shiny brake disc on a clean workbench beside it, a torque wrench and a red shop rag, graphite and steel tones, realistic photo, no text, no logos, no brand marks, no yellow.
3. Work: Open engine bay of an unbadged car seen from above, a mechanic's gloved hand checking the oil dipstick, a diagnostic tablet with a soft screen glow on the fender cover, warm workshop light, realistic photo, no faces, no text, no logos, no yellow.

### Phone and computer repair
1. Hero, 4:5: A small phone repair bench in an Israeli shop, a blue anti-static mat with a printed grid, an opened smartphone with its cracked screen lifted on a flex cable, precision screwdrivers, a suction cup and tiny screws laid out in order, a magnifier lamp's cool white light, a window with soft Negev daylight in the background, realistic macro photo, no faces, no text, no logos, no yellow.
2. Work: A technician's gloved hands replacing a smartphone battery with plastic tweezers on a blue anti-static mat, the phone's back panel off, clean and orderly, realistic close-up photo, no faces, no visible text or logos, no yellow.
3. Work: An opened laptop on a repair bench with its bottom panel removed, a new SSD drive being fitted, a small brush and compressed air can nearby, neutral grey and blue tones, realistic photo, no faces, no text, no logos, no brand marks, no yellow.

### Cakes
1. Hero, 4:5: A two-tier designed cake on a white cake stand on the counter of a bright Israeli home kitchen. Soft blush-pink buttercream, a dark chocolate drip on the top tier, fresh raspberries and blackberries on top, a ring of chopped pistachio around the base. Pale tiled backsplash, a piping bag and an offset spatula on the counter, soft window daylight, photorealistic, no people, no text or lettering on the cake, no logos, no yellow, cream or caramel tones.
2. Work, 4:3: Hands in a dark apron piping small rosettes of pale pink cream on the edge of a cake on a turntable, only the hands and forearms show. A home kitchen counter with bowls of berries and pistachios, natural window light, shallow depth of field, photorealistic, no faces, no text, no logos, no yellow.
3. Work, 4:3: A tray of individual desserts ready for pickup on an Israeli kitchen table: small glass cups of berry mousse, mini tartlets with raspberries, pistachio cubes, beside a closed white cake box. Late afternoon daylight, blush and cocoa palette, photorealistic, no people, no text or labels, no logos, no yellow.

### Lashes and brows
1. Hero, 4:5: Realistic macro photo of one closed eye with fresh classic lash extensions, a pink gel pad under the lower lashes, a lash artist's gloved hand holding fine tweezers at the lash line, the face cropped to the eye and brow only, natural brow above, cool white ring-light reflection, soft rose and navy tones, a small home studio in an Israeli apartment blurred behind, no full face, no text, no logos, no yellow.
2. Work: Close-up realistic photo of a freshly laminated, brushed-up natural brow with clean edges, the face cropped to the brow and closed eye, a small spoolie brush beside it on a white towel, soft daylight, neutral skin tones, no full face, no text, no logos, no yellow.
3. Work: Realistic flat-lay on a white treatment trolley in a small Israeli studio: black lash trays with rows of curled lashes, two pairs of fine tweezers, a glass glue stone, pink gel pads and a few spoolie brushes, cool daylight, navy and rose accents, no people, no text, no logos, no brand names, no yellow.

### Hair removal
1. Hero, 4:5: Realistic photo of a calm, bright hair removal clinic room in Israel: a treatment bed with teal vinyl and a fresh paper sheet, a rolled white towel, a modern laser device on a cart with its handpiece on a hook and a blank dark screen, a pair of protective goggles on the bed, a small green plant on a shelf, cool daylight, teal and white palette, no people, no text, no logos, no yellow.
2. Work: Close-up realistic photo of a therapist's gloved hands holding a laser handpiece over a lower leg (shin only) resting on a teal treatment bed, a white towel covering the leg above the knee, the rest of the body out of frame, soft cool light, no faces, no text, no logos, no yellow.
3. Work: Realistic photo of a wax station in a clean Israeli clinic: a wax warmer, wooden spatulas in a glass jar, a roll of paper strips, a bottle of soothing lotion without a label and folded white towels on a steel trolley, soft daylight, teal and white tones, no people, no text, no logos, no yellow.
