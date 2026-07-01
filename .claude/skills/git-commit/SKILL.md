---
description: Run quality checks, draft a Conventional Commits message with ≤12-word description, and commit staged changes.
---

## 1. Quality Gate

```bash
npm test
```

No lint, format, or typecheck script exists in this project yet — `npm test` is the only automated gate. Stop and report if it fails.

## 2. Inspect Staged Changes

```bash
git status
git diff --staged
```

If nothing is staged: stop and offer to show `git diff`.
Unstage and warn if staged files include: `.env*`, `*.crx`, `*.pem`, `dist/`, `node_modules/`, `.claude/settings.local.json`, `CLAUDE.local.md`.

## 3. Draft Commit Message

Format: `type(scope): description`

Types: feat · fix · refactor · docs · style · chore · test · perf · revert
Scopes: `options`, `storage`, `types`, `styles`, or a section name (`personal-info`, `work-experience`, `education`, `answer-bank`)
Rules: ≤12 words after the colon, imperative mood, lowercase, no trailing period.

Breaking change: append `!` before colon — `feat(storage)!: change profile schema shape`

## 4. Commit

Show the draft to the user and get confirmation. Then:

```bash
git commit -m "$(cat <<'EOF'
type(scope): description
EOF
)"
```
