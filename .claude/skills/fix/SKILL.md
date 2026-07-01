---
description: Structured bug diagnosis and resolution — no code changes until root cause is confirmed
---

# Structured Bug Fix

Phased approach: diagnose fully before touching any code.

## Phase 1: Gather Context (read-only)

Ask for: error message or symptom, reproduction steps, suspected area (which profile section, or storage/hooks layer).
Skip questions already answered by the user.

## Phase 2: Trace the Full Data Flow

Request-to-response layers for this extension (no server):

```
Page component (src/options/<section>/*Page.tsx)
  → react-hook-form + zod schema (src/options/<section>/*-schema.ts)
  → repository (src/shared/storage/*-repository.ts)
  → local-store.ts (chrome.storage.local get/set)
```

Cross-cutting concerns to always check:
- Does the zod schema's `.transform` change the shape before it reaches the repository? (e.g. `answer-bank-schema.ts` forces `autoFillEnabled: false` when `isSensitive: true` — a bug here could silently leak sensitive data into autofill)
- Is the bug actually in a shared hook (`use-profile`, `use-storage-list`, `use-entity-crud-form`) rather than the page component that surfaces it? Shared hooks fan out to multiple pages — check other callers before assuming the bug is page-local.
- Is `chrome.storage.local` being read/written directly anywhere instead of through a repository? That bypasses the shared shape/key contract.

Read files at each relevant layer. Do not assume — verify each hop.

## Phase 3: Present Diagnosis — Wait for Confirmation

Before writing a single line of code, present:

  Root cause: <one sentence>
  Evidence: <file:line — what it shows> (list 2–4)
  Files that need changes: <path — what and why> (numbered list)

  No code has been changed yet. Confirm to proceed.

## Phase 4: Implement the Fix

Apply changes to ALL identified files, not just the most obvious one.

Checklist before marking done:
- [ ] Every file from the diagnosis addressed
- [ ] No hardcoded secrets or env var fallbacks
- [ ] No new `any` types introduced
- [ ] If the bug touches the answer bank: sensitive answers still can't be auto-filled after the fix
- [ ] Any shared hook fix re-checked against every page that consumes it

## Phase 5: Verify

```bash
npm test
```

If any check fails, fix before closing.
