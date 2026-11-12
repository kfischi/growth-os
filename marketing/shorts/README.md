# Shorts

Vertical videos (1080x1920, 30 fps, no sound) for Multi Landing's own marketing: Instagram, TikTok and WhatsApp status.
Each short is one page, `<name>/index.html`. It draws every frame through `window.render(t)`, so a render
always gives the same frames. `render.mjs` captures the page in Chromium and encodes the MP4 with ffmpeg.

    node marketing/shorts/render.mjs pain-stick            # writes pain-stick/pain-stick.mp4
    node marketing/shorts/render.mjs pain-stick --stills   # key frames as PNG, for checking

| Short | What it shows |
| --- | --- |
| `pain-stick` (12 s) | Stick figures. The owner is on a ladder, the phone rings, and the customer who got no answer calls the next one in line. Then the same moment with a site that answers: the AI chat replies, and "פנייה חדשה מהאתר" reaches the owner on WhatsApp. It ends with the home page's headline and the address. |

House rules apply. The words come from the home page, every short is labelled "המחשה", nothing is promised,
and there is no yellow.
