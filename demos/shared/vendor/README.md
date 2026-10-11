# Third-party files

| File | What | Version | License |
| --- | --- | --- | --- |
| `qrcode-generator-2.0.4.js` | [QR Code Generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, unmodified `dist/qrcode.js` from npm. The owner's panel (`demos/panel/`) loads it only when a QR code is opened, for the tagged links | 2.0.4 | MIT, in the file's header |
| `mediabunny-1.61.3.min.mjs` | [Mediabunny](https://mediabunny.dev), unmodified build from npm. The site builder (`demos/build/`) loads it only when an owner picks a video, to turn it into a short H.264 MP4 in the browser | 1.61.3 | MPL-2.0, `mediabunny-LICENSE.txt` |

Never edit these files. To update, replace the file with a newer build from npm and change the version in its name and where it is loaded (`demos/build/index.html`, `demos/panel/index.html`).
