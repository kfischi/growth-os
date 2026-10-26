# Multi Landing: backend go-live checklist

The site is `demos/` on Netlify (https://service-pro-web.netlify.app). The functions are in `demos/netlify/functions/`, bundled with esbuild. Their routes and schedules are set in each file's `export const config`, not in `netlify.toml`.
Secrets go into Netlify > Site configuration > Environment variables only. After changing any of them, trigger a deploy.

## 1. Netlify environment

**Required (the lead system and the builder won't work without them)**
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (secret). Without them: `/api/lead` answers `not_configured` (the pages fall back to WhatsApp), and the builder, panel, health check, reminders, reports and billing are all off.
- [ ] `ANTHROPIC_API_KEY` (secret). Without it the home chat runs scripted, the plumber `#live-ai` goes offline, the builder answers 503 (no drafts can be made), and the photo first look, client chat and WhatsApp assistant are off.
- [ ] `LEADS_ADMIN_KEY` (secret, at least 16 characters). Kfir's key for `/panel/` and `/build/admin/`. It also seeds the IndexNow key, so **never rotate it casually**: rotating it changes every site's IndexNow key file.
- [ ] `WA_APP_SECRET` (secret; several comma-separated during a rotation). Without it every webhook POST is refused (401), so no "טיפלתי", no statuses and no owner commands.
- [ ] `WA_VERIFY_TOKEN` (secret). Needed for Meta's webhook verification (GET).
- [ ] `WA_TOKEN_<SLUG>` (secret), one per business. The slug is upper case with `-` turned into `_`. Add `WA_TOKEN_KFIR` for the `kfir` client that receives builder alerts. `WA_TOKEN` (optional) is the fallback token.
- [ ] `HEALTH_KEY` (secret). Without it `/api/health` is open. It shows only counts and slugs, but set it anyway.
- [ ] `GITHUB_TOKEN` (secret). A fine-grained token for this repo only, with Contents: read and write. Without it nothing can be published. It expires after a year, so set a reminder.
- [ ] `NETLIFY_TOKEN` (secret). A personal access token for the account that holds the client sites. Without it there is no automatic hosting, and sites go up by hand (`CLIENT_SITES.md`).

**Check these before launch: the defaults may be wrong for production**
- [ ] `GITHUB_BRANCH`. The default is `claude/multitenant-business-os-9y3vc1` (`lib/builder.mjs`). Publishing commits `clients/<slug>/` to this branch and reads `clients/sample-plumber/assets/` from it. Set it to the branch that Netlify and `.github/workflows/deploy-clients.yml` actually use, or confirm the default is right.
- [ ] `GITHUB_REPO`. The default is `kfischi/growth-os`.
- [ ] `BUILDER_SITE_URL`. The default is `https://service-pro-web.netlify.app`. Grow's `notifyUrl` and `invoiceNotifyUrl` are built from it. Change it if the site moves to our own domain.
- [ ] `SITES_DOMAIN`. Optional, but needed for `<slug>.<our domain>` addresses; without it sites get `*.netlify.app`. Its DNS must be on Netlify DNS in the same account as `NETLIFY_TOKEN`.
- [ ] Function timeout: the builder chat waits up to `BUILDER_AI_TIMEOUT_MS` (25000 ms by default). If the plan stops functions at 10 s, set `BUILDER_AI_TIMEOUT_MS=9000` so owners get a clean "נסו שוב".

**Pilot**: `PILOT_CODES` (comma separated invite codes for `build/?p=<code>`, free, no payment step). See `PILOT.md`.

**Payments**: see section 3. `GROW_USER_ID`, `GROW_PAGE_CODE` (secret) and optional `GROW_API_KEY` (secret). Never set `GROW_SANDBOX` in production.

**Optional, defaults are fine**
`BUILDER_MODEL` (claude-sonnet-5-5), `CHAT_MODEL` / `ESTIMATE_MODEL` / `AGENT_MODEL` (claude-opus-5-5), `BUILDER_DAILY_MAX` (40 new drafts a day), `BUILDER_EDIT_MESSAGES` (60) / `BUILDER_EDIT_PUBLISHES` (10), `BUILDER_ALERT_CLIENT` (kfir), `DEMO_CHAT_DAILY` (400), `CHAT_DAILY` (600, the home chat), `BRAND_NAME` / `BRAND_URL`, `WA_GRAPH_VERSION` (v23.0), `GEMINI_API_KEY` (secret) / `GEMINI_IMAGE_MODEL` / `GEMINI_VOICE_MODEL` (for "ליצור תמונת רקע", hidden without it, and for the owner's voice notes on WhatsApp, which without it get "write it in words"), `GSC_SERVICE_ACCOUNT` (secret JSON) / `GSC_PROPERTY`, `PAY_URL_PRESENCE` / `PAY_URL_AI` (only without Grow), `BILLING_YEAR` (off) and `VAT_RATE` (0; עוסק פטור).

**Missing from the docs**: CLAUDE.md doesn't list `CHAT_MODEL`, `ESTIMATE_MODEL`, `AGENT_MODEL`, `BUILDER_SITE_URL`, `GITHUB_REPO`, `GITHUB_BRANCH`, `WA_TOKEN`, `WA_GRAPH_VERSION`, `BUILDER_AI_TIMEOUT_MS`, `BUILDER_ALERT_CLIENT`, `GROW_SANDBOX` or `PAY_URL_*`. LEAD_SYSTEM.md and SITE_BUILDER.md have now been updated with them.

## 2. Meta / WhatsApp Cloud API
- [ ] Set up one Meta app (Business type) with the WhatsApp product. Complete Business Verification and switch the app to **Live**. Check whether App Review is needed for sending from other businesses' WABAs.
- [ ] Webhook callback URL: `https://service-pro-web.netlify.app/api/wa-webhook`. Verify token: the value of `WA_VERIFY_TOKEN`. Subscribe the field `messages`.
- [ ] For each business: its phone number ID in `ls_clients`, and a permanent (system user) token in `WA_TOKEN_<SLUG>`.
- [ ] The owner's phone must not be the number connected to the Cloud API itself, because alerts can't reach that number. This applies to `kfir` too.
- [ ] Templates, language `he` (`tpl_lang`). Get them approved in **each business's** WABA, with exactly these names (the `tpl_*` columns can override them). The wording is in LEAD_SYSTEM.md section 3.
  - Required: `lead_ack` (Utility, 2 params), `owner_new_lead` (Utility, 5 params plus a quick-reply button "טיפלתי"), `owner_reminder` (Utility, 4 params plus "טיפלתי") and `monthly_report` (Utility, 6 params; use `monthly_report_v2` if an old 4-param version was already approved).
  - Only when the feature is on: `weekly_report` (`weekly_report = true`), `review_request` (Marketing, `review_requests`), `testimonial_request` (Marketing, `testimonials`) and `quote` (Utility, 5 params plus two quick-reply buttons "מאשרים" and "יש לי שאלה", `quotes`; run `0021_quotes.sql` first).
  - `kfir` needs at least `owner_new_lead`, which carries the builder alerts (approved, paid, publish failed, card refused, "נתקעתם?").
  - Until a template is approved, its sends fail. Leads are still stored, the page falls back to WhatsApp, and `/api/health` goes red.
- [ ] Create the `kfir` client: `node scripts/lead-system/new-client.mjs kfir ...` (package ai, active). Without it Kfir gets no WhatsApp alert for approvals or payments. Drafts still show in `/build/admin/`.
- [ ] Test before the first client (LEAD_SYSTEM.md section 5): a lead arrives, the auto reply and the owner alert go out, "טיפלתי" works, and a broken token turns the health check red.

## 3. Grow (payments)
- [ ] The Grow account belongs to the partner business (עוסק פטור). Turn on the documents module so Grow issues a **קבלה** for every payment. Pages say "קבלה" and that prices are final.
- [ ] Ask Grow for API access (`userId`, `pageCode`) on a regular payment page with **card-token saving allowed**. Without a token, the monthly charge can't run.
- [ ] Run the sandbox check: `GROW_SANDBOX=1 GROW_USER_ID=... GROW_PAGE_CODE=... node scripts/grow-check.mjs`, pay 1 ₪ with the test card, then run `node scripts/grow-check.mjs <processId> <processToken>`. It must show the approval number and `cardToken: (returned)`.
- [ ] Not covered by grow-check: `createTransactionWithToken` (the monthly charge) and `approveTransaction`. Charge the sandbox token once by hand before going live, and confirm the field names (`lib/grow.mjs`).
- [ ] No webhook needs registering at Grow. `notifyUrl` and `invoiceNotifyUrl` (`<BUILDER_SITE_URL>/api/grow-webhook[?type=invoice]`) are sent with every checkout. Ask Grow whether their side needs the domain whitelisted.
- [ ] Do one real end-to-end payment at the lowest risk you can (approve a test draft, pay, check it publishes itself, check the receipt link appears under "קבלות"), then cancel and confirm the subscription shows "פעיל עד".
- [ ] Fallback without `GROW_PAGE_CODE`: after approval the builder shows the `PAY_URL_*` link or "נשלח לכם בוואטסאפ את פרטי התשלום". Kfir marks the draft "שולם" in `/build/admin/` and publishes (or it goes live within 15 minutes if an address was picked).
- [ ] The billing run is daily at 03:10 UTC. A refused card is retried every 3 days, and after 4 refusals the lead system pauses.

## 4. Supabase
- [ ] Use its own project (`lead-system`, Frankfurt), not Growth OS.
- [ ] In the SQL Editor, run **all** migrations in order: `0001_lead_system`, `0002_site_builder` (the private `builder` bucket), `0003_reports` (`ls_visits`, `ls_add_visit`), `0004_self_edit`, `0005_lead_photos` (the private `lead-photos` bucket), `0006_links`, `0007_availability`, `0008_callback`, `0009_reviews`, `0010_testimonials`, `0011_wa_agent`, `0012_hosting`, `0013_stats` (`ls_add_stat`), `0014_urgent`, `0015_job_value`, `0016_owner_notes`, `0017_billing` (`ls_payments`, `ls_billing`), `0018_terms` and `0019_videos`. Each file can be run again safely.
- [ ] A cross-check found every table, RPC, filtered or selected column and written key in the code in some migration. Nothing is missing.
- [ ] Use the **secret** key (`sb_secret_...`, or the legacy service_role JWT) in Netlify only.

## 5. Domain
- [ ] Decide whether the home site stays on `service-pro-web.netlify.app` or moves to our own domain. If it moves, update `BUILDER_SITE_URL`, `BRAND_URL`, the Meta webhook URL and the uptime monitor URL. `SITE_ORIGIN` in `lib/builder.mjs` is hard-coded to the netlify.app address. It is used to fetch the shared scripts for deploys and as the CORS "own" check, and it still works because the netlify.app address stays reachable.
- [ ] `SITES_DOMAIN` on Netlify DNS, so client subdomains and their certificates are created automatically.
- [ ] A client's own domain must be registered in the client's name. "לחבר דומיין של הלקוח" in `/build/admin/` shows the two DNS records, and the hourly check switches the site over (it gives up after 30 days).
- [ ] Optional: Search Console as a Domain property for `SITES_DOMAIN`, with the service account as a full user (`GSC_*`).

## 6. Monitoring
- [ ] Set up UptimeRobot (free): HTTP(s) every 5 minutes on `https://service-pro-web.netlify.app/api/health?key=<HEALTH_KEY>`, with mail and app alerts. This is documented in LEAD_SYSTEM.md step 4.
- [ ] What the health check covers: owner alerts that failed or are stuck (24 h), failed outbound WhatsApp messages (24 h), and the database. It does **not** cover failed card charges, failed auto-publishes or scheduled functions that stopped running. Those reach Kfir only through his WhatsApp alerts (so `kfir` must work), or in Netlify > Functions > logs. Suggestion: a second keyword monitor on the home page, and a weekly look at the logs of `reminders`, `billing` and `monthly-report`.
- [ ] Netlify > Logs > Functions: check after the first day that `reminders` runs every 15 minutes and `billing` daily.

## 7. Cost guards (state at launch)
| Endpoint | Calls | Guards |
| --- | --- | --- |
| `/api/chat` (home) | Claude | Own Origin required (**tightened now**), 30 per IP per 10 minutes, 20 turns, 600 characters. No daily cap. |
| `/api/demo-chat/<demo>` | Claude | Own Origin required, 15 per IP per 10 minutes, 12 turns, 300 characters, `DEMO_CHAT_DAILY` |
| `/api/chat/<slug>` | Claude, WhatsApp | Active ai client, 30 per IP per 10 minutes, 20 turns, 600 characters, CORS by `allowed_origins`. A request with **no** Origin passes (the tests rely on it) |
| `/api/estimate` | Claude vision | 8 per IP per 10 minutes, 1.4 MB image. Demo lists only with our own Origin (**tightened now**: no Origin means 403), client lists by `allowed_origins` |
| `/api/builder/*` | Claude, Gemini, GitHub, Netlify, Grow, WhatsApp | Own Origin when one is sent, the draft key, per-IP limits per action, `BUILDER_DAILY_MAX`, 80 messages per draft, 800 characters, 1 MB photos, 4.5 MB videos, learn 8 an hour, image 4 an hour and 6 a day per draft |
| `/api/lead/<slug>` | WhatsApp | Active ai client, CORS, 8 per IP per 10 minutes, honeypot, clipped fields |
| WhatsApp assistant | Claude, WhatsApp | Off by default, 8 replies per customer a day |
| `/api/builder-admin` | GitHub, Netlify | Admin key, own Origin. **Added now**: 20 wrong keys per IP lock it out for 10 minutes |
| `/api/leads` | | Key, 120 per IP per 10 minutes |

All the limits are per function instance (in memory), so they are soft. A hard spending cap belongs in the Anthropic console: **set a monthly limit there before launch.** Do the same in Google AI Studio if `GEMINI_API_KEY` is set. Use a paid (billing-enabled) Gemini key: the privacy page says the owner's voice notes go to Google only to be written down, and on the free tier Google may use what it receives to improve its models.

## 8. Headers (`demos/netlify.toml`, static files only)
- [x] **Added now** for `/*`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy: frame-ancestors 'self'`, `Permissions-Policy: geolocation=(), microphone=()`. Also `/*.vcf` as `text/vcard`.
- [x] **Added now**: `/panel/*` and `/build/admin/*` also get `frame-ancestors 'none'` (they already had `DENY`).
- Netlify headers don't apply to function responses. `/draft/` sets its own (`SAMEORIGIN`, `no-store`, `noindex`). So do `/p/` and `/r/`.
- Verified: `builder-page.test.mjs` passed with these headers applied by a local server (390 and 1280 px), and `/`, `/build/`, `/build/admin/`, `/panel/`, `/plumber/` (video) and `/film/` load with no console or CSP errors. python http.server doesn't apply Netlify headers, which is why a header-applying server was used. Repeated names are merged as Netlify merges them. **After deploying, check with `curl -I`** on `/`, `/build/` and `/panel/`.
- No full CSP. The builder writes the draft into its frame with `srcdoc`, which inherits the builder's CSP, so a script or media policy would need its own testing first.
- Already right: `/start` and `/start/*` redirect to `/` (301). The functions own `/api/*`, `/draft/:id`, `/p/:token` and `/r/:token` through `config.path`. Schedules: `reminders` every 15 minutes, `monthly-report` on the 1st at 08:00 UTC, `weekly-report` on Sunday at 06:00 UTC, `billing` daily at 03:10 UTC.
