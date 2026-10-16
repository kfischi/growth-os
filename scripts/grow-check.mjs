// Tries the Grow connection (demos/netlify/lib/grow.mjs) on Grow's sandbox, before turning payments on.
// Run from the repo root, with the sandbox details Grow gave (never commit them):
//   GROW_SANDBOX=1 GROW_USER_ID=... GROW_PAGE_CODE=... node scripts/grow-check.mjs
//     makes a checkout of 1 ₪ and prints its link: open it, pay with Grow's test card
//   GROW_SANDBOX=1 GROW_USER_ID=... GROW_PAGE_CODE=... node scripts/grow-check.mjs <processId> <processToken>
//     asks Grow about that checkout: paid or not, the approval number, and whether a card token came back
//     (the monthly charge needs it: if it is empty, ask Grow to allow saving card tokens on the page).
import { createPayment, processInfo, growOn } from "../demos/netlify/lib/grow.mjs";

if (!growOn()) { console.error("Set GROW_USER_ID and GROW_PAGE_CODE (and GROW_SANDBOX=1 for the sandbox)."); process.exit(1); }
if (process.env.GROW_SANDBOX !== "1") console.warn("GROW_SANDBOX is not 1: this talks to the real Grow.");
const [processId, processToken] = process.argv.slice(2);
try {
  if (processId) {
    const info = await processInfo(processId, processToken);
    console.log(JSON.stringify({ ...info, cardToken: info.cardToken ? "(returned)" : "(missing)" }, null, 2));
  } else {
    const p = await createPayment({
      sum: 1, description: "Easy Landing - בדיקה", name: "בדיקה ראשונה", phone: "0500000000", ref: "00000000-0000-4000-8000-000000000000", saveToken: true,
      notifyUrl: "https://example.com/grow-check", successUrl: "https://example.com/ok", cancelUrl: "https://example.com/cancel",
    });
    console.log("Pay here (the link works for about 10 minutes):\n" + p.url + "\nThen run:\nnode scripts/grow-check.mjs " + p.processId + " " + p.processToken);
  }
} catch (e) { console.error(e.message, e.grow ? JSON.stringify(e.grow) : ""); process.exit(1); }
