# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack
- Chrome Extension (Manifest V3) built with Vite + `@crxjs/vite-plugin`
- React 19 · TypeScript (strict)
- Zod schemas + react-hook-form (`@hookform/resolvers`) for form validation
- Tailwind CSS
- Vitest + Testing Library (jsdom environment)

## Project Structure
- `src/options/` — the extension's options page (React app), one subfolder per profile section (`personal-info/`, `work-experience/`, `education/`, `answer-bank/`), each with a `*Page.tsx` and a `*-schema.ts` (zod schema)
- `src/shared/storage/` — repository functions wrapping `chrome.storage.local`, plus shared hooks (`use-profile`, `use-storage-list`, `use-entity-crud-form`)
- `src/shared/types/` — domain types matching each profile section
- `tests/` — shared test setup and a `chrome.storage` mock used across repository tests
- `manifest.config.ts` — Manifest V3 definition

## Dev Commands
```bash
npm run dev         # vite dev server
npm run build        # vite build
npm test              # vitest run
npm run test:watch    # vitest watch mode
```
No lint, format, or typecheck script exists yet — `tsc --noEmit` is not wired into a script despite `strict: true` in tsconfig.

## Architecture Notes
- No backend/API — all persistence goes through `src/shared/storage/local-store.ts` (`chrome.storage.local` get/set), wrapped by per-entity repositories (`profile-repository.ts`, `work-experience-repository.ts`, etc.)
- Data flow: `*Page.tsx` → react-hook-form validated by `*-schema.ts` (zod) → repository function → `local-store.ts` → `chrome.storage.local`
- The options page (`src/options/App.tsx`) has no router — it's plain tab-state switching between section components
- Answer bank enforces a schema-level invariant: `isSensitive: true` forces `autoFillEnabled: false` (see `answer-bank-schema.ts`) — sensitive answers must never be auto-filled

@.claude/rules/git.md
@.claude/rules/architecture.md
@.claude/rules/testing.md
@.claude/rules/styling.md
