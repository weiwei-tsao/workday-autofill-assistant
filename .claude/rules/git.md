# Git

## Commit format
`type(scope): description` — ≤12 words, imperative mood, lowercase, no trailing period.

Types: feat · fix · refactor · docs · style · chore · test · perf · revert

Scopes: `options`, `storage`, `types`, `styles`, or a section name (`personal-info`, `work-experience`, `education`, `answer-bank`).

Breaking change: `feat(storage)!: change profile schema shape`

## Branch naming
`feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`

## Never commit
- `.env*`, secrets, `*.crx`, `*.pem`
- `dist/`, `dist-*/`, `.vite/`
- `node_modules/`
- `.claude/settings.local.json`, `CLAUDE.local.md` (personal-only)

## PR checklist
- [ ] `npm test` passes
- [ ] No `console.log` left in
- [ ] No hardcoded values that should be config/schema-driven

Architecture details → see [[architecture]].
