# Testing

## What to test
- Every repository in `src/shared/storage/` has a colocated `*.test.ts` — cover get/set/list-mutation behavior against the mocked `chrome.storage`
- Hooks (`use-profile`, `use-storage-list`, `use-entity-crud-form`) have colocated `*.test.tsx` — cover loading/error/success state transitions
- Schema `.transform` logic (e.g. the sensitive → no-autofill rule in `answer-bank-schema.ts`) needs a direct test — don't rely on component tests to catch it
- Trivial pass-through components/pure UI layout are too trivial to test

## Conventions
- Test files are colocated next to the file under test, named `<file>.test.ts` or `.test.tsx`
- `tests/setup.ts` is the global Vitest setup (jsdom + testing-library matchers), wired via `vitest.config.ts`
- `tests/chrome-storage-mock.ts` provides the `chrome.storage.local` mock — use it instead of hand-rolling storage stubs in individual test files

## Mock strategy
There is no real backend to hit — `chrome.storage.local` itself is always mocked via `tests/chrome-storage-mock.ts`. This is not a shortcut; it's the only available implementation outside a real extension context.

## Running a single test
```bash
npx vitest run path/to/file.test.ts
npx vitest path/to/file.test.ts   # watch mode
```

Architecture details → see [[architecture]].
