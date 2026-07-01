# Architecture

## Module boundaries
- `src/options/<section>/` owns its page component, zod schema, and any section-specific logic. Sections must not import each other's schemas or pages directly.
- `src/shared/storage/` is the only layer allowed to call `chrome.storage.local` (via `local-store.ts`). Page components must go through a repository (`profile-repository.ts`, `work-experience-repository.ts`, `education-repository.ts`, `answer-bank-repository.ts`, `list-repository.ts`), never call `chrome.storage` directly.
- `src/shared/types/` holds the persisted domain shapes; `src/options/<section>/*-schema.ts` holds the zod form-validation schema (input shape may differ from stored shape via `.transform`).

## Data flow
1. `*Page.tsx` renders a react-hook-form bound to the section's zod schema (`zodResolver`)
2. On submit, the schema's `.transform` runs (e.g. `answer-bank-schema.ts` forces `autoFillEnabled: false` when `isSensitive: true`)
3. The transformed value is passed to the section's repository function
4. The repository calls `getLocal`/`setLocal` in `local-store.ts`, which reads/writes a single key in `chrome.storage.local`
5. Shared hooks (`use-profile`, `use-storage-list`, `use-entity-crud-form`) wrap repository calls with React state for the page components

## No router
`src/options/App.tsx` switches between section components via local `useState<TabKey>` — there is no URL-based routing. Don't introduce one for a single static options page.

## Key invariants
- **Sensitive answers can't auto-fill**: enforced inside `answer-bank-schema.ts`'s `.transform`, not as a UI-only checkbox disable. Any new sensitive-data path must enforce this at the schema level, not just in the component.
- `chrome.storage.local` is the only persistence — there is no server, no IndexedDB, no remote sync. Every repository stores its entity under one top-level key (see `PROFILE_KEY` in `profile-repository.ts` for the pattern).
- List-based entities (work experience, education) go through `list-repository.ts` for add/edit/delete rather than each repository reimplementing array mutation.

Testing conventions → see [[testing]]. Styling conventions → see [[styling]].
