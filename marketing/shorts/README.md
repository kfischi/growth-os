# Shorts

Vertical videos (1080x1920, 30 fps, no sound) for Multi Landing's own marketing: Instagram, TikTok and WhatsApp status.
Each short is one page, `<name>/index.html`. It draws every frame through `window.render(t)`, so a render
always gives the same frames. `render.mjs` captures the page in Chromium and encodes the MP4 with ffmpeg.

    node marketing/shorts/render.mjs answer-ad            # writes answer-ad/answer-ad.mp4
    node marketing/shorts/render.mjs answer-ad --stills   # a frame every second as PNG, for checking

| Short | What it shows |
| --- | --- |
| `answer-ad` (20 s) | Real work footage (the plumber clip in `demos/shared/video/`) with a missed call: "באמצע עבודה." Then "לקוח שלא קיבל מענה מתקשר לבא בתור." Then the real plumber demo in use on a phone: the chat asks, gives the price range, takes a name and phone, and the WhatsApp message reaches the owner. It ends with the home page's headline, "0 ₪ מקדמה · משלמים רק כשהאתר מוכן" and the address. |
| `nails-ad` (20 s) | The same ad for a nail studio: the demo's studio photo with a slow push-in ("באמצע טיפול."), the nails demo on the phone, and the words addressed to a woman ("ולא פנויה לענות?"). |

The videos come from files that are not kept in the repo (`media/`, see `.gitignore`):

    # answer-ad: the plumber walkthrough without its caption bar, from second 8.5, and the work clip
    ffmpeg -ss 8.5 -t 38.5 -i demos/shared/video/walkthrough/plumber.mp4 -vf crop=780:1558:0:130 -c:v libvpx-vp9 -b:v 0 -crf 30 -an marketing/shorts/answer-ad/media/walk.webm
    cp demos/shared/video/plumber.webm marketing/shorts/answer-ad/media/work.webm
    # nails-ad: record the walkthrough first (node scripts/demo-video.cjs <dir> nails), then from second 10
    ffmpeg -ss 10 -t 48 -i <dir>/nails-demo.mp4 -vf crop=780:1558:0:130 -c:v libvpx-vp9 -b:v 0 -crf 30 -an marketing/shorts/nails-ad/media/walk.webm
    cp demos/shared/photos/nails-work.webp marketing/shorts/nails-ad/media/work.webp

The test browser plays VP9 and not H.264, so the pages read WebM. A new trade: record its demo, copy `nails-ad`,
and set `WALK_START` and the mapping in `rec(t)` so the cut lands on the WhatsApp message.

House rules apply. The words come from the home page, the demo is labelled "המחשה" with a sample business,
nothing is promised, and there is no yellow in the design.
