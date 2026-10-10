#!/usr/bin/env bash
# Every check for the side-income channel, in one go. Run before every PR:  bash scripts/check-all.sh
# Needs Playwright (see CLAUDE.md > Checks) and `npm install` in demos/ for the lead system test.
set -u -o pipefail  # a failing test piped into tail still fails the run
cd "$(dirname "$0")/.."
fail=0
step() { printf '\n== %s\n' "$1"; }

step "qa-page on every page"
for p in demos/index.html demos/*/index.html; do
  dir=demos; page=${p#demos/}
  out=$(node scripts/qa-page.cjs "$dir" "$page" 2>&1 | tail -1)
  case "$out" in PASS*) ;; *) echo "FAIL $p: $out"; fail=1;; esac
done
for p in clients/*/index.html clients/*/privacy.html clients/*/accessibility.html; do
  [ -f "$p" ] || continue
  out=$(node scripts/qa-page.cjs "$(dirname "$p")" "$(basename "$p")" 2>&1 | tail -1)
  case "$out" in PASS*) ;; *) echo "FAIL $p: $out"; fail=1;; esac
done
echo "done"

step "qa-page on what the site builder renders (full site, bare site, empty draft, with a video)"
built=$(mktemp -d)
node scripts/tests/builder-render.mjs "$built" >/dev/null || fail=1
for page in index.html privacy.html accessibility.html bare.html draft.html video.html; do
  [ -f "$built/$page" ] || continue
  out=$(node scripts/qa-page.cjs "$built" "$page" 2>&1 | tail -1)
  case "$out" in PASS*) ;; *) echo "FAIL builder $page: $out"; fail=1;; esac
done
echo "done"

step "Hebrew copy"
node scripts/hebrew-copy-lint.cjs demos/index.html demos/all/index.html demos/build clients docs/side-income "$built" | tail -1
rm -rf "$built"

step "every demo chat, to the WhatsApp handoff (phone and desktop)"
node scripts/tests/demo-chats.cjs | tail -1 || fail=1

step "lead system"
node scripts/tests/lead-system.test.mjs || fail=1

step "site builder (API, against fakes)"
node scripts/tests/site-builder.test.mjs 2>/dev/null || { node scripts/tests/site-builder.test.mjs; fail=1; }

step "site builder page, in the browser (phone and desktop)"
node scripts/tests/builder-page.test.mjs 2>/dev/null | tail -1 || fail=1

step "functions bundle"
for f in demos/netlify/functions/*.mjs; do
  (cd demos && npx -y esbuild "${f#demos/}" --bundle --platform=node --format=esm --outfile=/dev/null --log-level=error) || { echo "FAIL $f"; fail=1; }
done
echo "done"

step "lint"
npm run lint >/dev/null 2>&1 && echo "ok" || { echo "FAIL lint"; fail=1; }

echo
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
