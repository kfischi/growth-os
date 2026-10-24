---
name: hebrew-review
description: Proofread the Hebrew of Multi Landing pages, demos, chats or guides with the hebrew-editor agent. It splits the work, fixes plain language mistakes, and brings Kfir only the choices. Use when Kfir says "תבדוק את העברית", "הגהה", "המשפט לא ברור", "לא נשמע ישראלי", after any agent writes Hebrew, and before a PR with new copy is merged.
---

# Hebrew review

The editor's rules live in `.claude/agents/hebrew-editor.md`, and the voice rules in the `hebrew-copy` skill. This skill decides what to check and how to split the work, then brings the results together.

## 1. Pick the scope

- **Kfir named a page or a sentence:** that page only. For a single sentence, fix it yourself with the editor's rules and show him the before and after.
- **"After an agent wrote Hebrew":** the files that agent changed (`git diff --name-only origin/<base>...HEAD`).
- **"Everything":** these groups.
  - The site: home, `all/`, `guides/`, `film/`, `build/`, the panel, privacy, accessibility, terms.
  - The demos, in groups of 6 to 8 trades.
  - `demos/shared/guides/*.json`, with the chat lines in `demos/shared/aibot.js` and `leadbot.js`.

## 2. First pass, automatic

Run `node scripts/hebrew-copy-lint.cjs <scope>`. Its hits are a starting list, not the whole job: the lint can't judge clarity or voice.

## 3. Run the editor

- **One file or two:** do the work yourself, following `.claude/agents/hebrew-editor.md`.
- **More:** start one `hebrew-editor` agent per group, all in one message so they run in parallel. Give each one only its files, and tell it not to touch files outside its group.
  - If the `hebrew-editor` type isn't listed in this session, use a general-purpose agent and tell it to read and follow `.claude/agents/hebrew-editor.md` first.
  - Tell each agent to commit only if Kfir asked for it.

## 4. Bring it together

1. Collect the reports.
2. Run the lint again on the whole scope.
3. Run qa-page on every changed page.
4. Run `scripts/seo/faq-jsonld.cjs --check` on every page with a FAQ.
5. If chat lines changed, run `NODE_PATH=/opt/node-tools/node_modules node scripts/tests/demo-chats.cjs`. It is long, so run it in the background.

## 5. Report to Kfir, in Hebrew, short

- **What was fixed:** a count and three or four examples, as before → after.
- **For you to decide:** each item with the sentence, the problem, and a suggested wording. Prices, facts, legal text and the locked home lines are always here, never fixed silently.
- **Checks:** what ran and the result.

Commit and push on the working branch, and update the open PR. Merge only after Kfir says "מאשר".
