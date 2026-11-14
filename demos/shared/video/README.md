# Demo videos

| File | Source | What was done |
| --- | --- | --- |
| `plumber.mp4`, `plumber.webm`, `plumber-poster.webp` | Pexels (free licence, commercial use, no attribution required), clip 13258033 | Seconds 1.2 to 9.2, cropped to 4:5 away from a green cloth and a face, yellow gloves turned grey, no sound, 720×900. H.264 for every phone, WebM for browsers without H.264 |

The command, so the next one is the same (yellow out, green softened):

    ffmpeg -ss 1.2 -t 8 -i in.mp4 -an -vf "crop=...,scale=720:900:flags=lanczos,huesaturation=colors=y:saturation=-1:strength=4,huesaturation=colors=g:saturation=-0.6:strength=2,format=yuv420p" -r 30 -c:v libx264 -profile:v high -preset slow -crf 27 -movflags +faststart out.mp4

Then the same with `-c:v libvpx-vp9 -b:v 0 -crf 40` for the WebM, and one frame as WebP for the poster.

## Walkthroughs (`walkthrough/`)

Screen recordings of three demos in use on a phone (390×844, at 2x): the page, a scroll, the chat from the first tap to the WhatsApp summary, and where the page has one, the phone mockup with the visitor's own lead. About 30 seconds each, no sound, with a ring where the finger taps. For the home page, outreach and status posts.

Made by `node scripts/demo-video.cjs <out-dir> plumber movers electrician` (Playwright and ffmpeg). Run it again after any change to a demo, so the video shows the page as it is.

## Ads (`ads/`)

`plumber.mp4` and `nails.mp4`: the two 20-second ads from `marketing/shorts/` (`answer-ad`, `nails-ad`), made smaller for the
home page: 720x1280, H.264, CRF 25, no sound. The posters are the frame at 2.6 s. Shown in `#how` under
"ככה זה נראה ב-20 שניות", played by `shared/reel.js` like the walkthroughs. After rendering a short again:

    ffmpeg -i marketing/shorts/answer-ad/answer-ad.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -profile:v high -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -an demos/shared/video/ads/plumber.mp4
    ffmpeg -ss 2.6 -i marketing/shorts/answer-ad/answer-ad.mp4 -frames:v 1 -vf scale=540:960 -c:v libwebp -quality 78 demos/shared/video/ads/plumber-poster.webp
