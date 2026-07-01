# Common Questions Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the autofill pipeline to fill common Workday application questions (work authorization, sponsorship, relocation, desired salary, notice period, years of experience, why interested) from the existing Answer Bank, reusing the same "Autofill current page" button.

**Architecture:** The Field Dictionary gains a new set of section-agnostic canonical keys for common questions, plus an exported `COMMON_QUESTION_KEYS` set so the content script can tell a common-question match apart from a Profile match (both are untagged/section-agnostic, so this partition has to happen explicitly — see Task 3). No changes to the Scanner or Matcher are needed: the existing pattern-matching pipeline already produces `FieldMatch` objects for these new keys once the dictionary knows about them. The Executor gains a new `autofillAnswerBankFields` function that looks up each match's canonical key against the user's Answer Bank by `questionKey`, and skips any entry marked `isSensitive` or with `autoFillEnabled: false` — it reuses the existing `hasFillableValue`/`setFieldValue` helpers, no new DOM-writing logic. The content script's `AUTOFILL_PAGE` handler is extended to fetch the Answer Bank and merge a fourth summary into the response.

**Scope decision:** This plan only fills fields rendered as text inputs, textareas, or `<select>` dropdowns (all already handled by the existing `setFieldValue`, which writes via `.value =`). **Yes/No questions rendered as two separate radio buttons (one input for "Yes", one for "No", sharing a `name` attribute) are explicitly out of scope and deferred to a future plan.** The existing Scanner treats each radio input as an independent field with its own `labelText` (typically just "Yes" or "No", not the question text), so matching a radio button to a question requires a new radio-group-aware scanning/matching mechanism this plan does not build. If a real Workday page renders a yes/no question as a `<select>` with "Yes"/"No" options instead, this plan's existing string-write path handles it like any other dropdown — no special-casing needed, but also no guarantee the option values match ("Yes" exactly vs. some other casing/format), same known limitation as the year dropdowns in the prior Work Experience/Education plan.

**Tech Stack:** Same as the existing scaffold — TypeScript + Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`.
- No network calls anywhere in the codebase.
- Only `high`-confidence field matches (score ≥ 60) are auto-filled. `medium`-confidence matches (30–59) are counted as "needs review" but never written to. `low`-confidence and unmatched fields are ignored entirely.
- After writing a field's value, dispatch `input`, `change`, and `blur` DOM events in that order (`bubbles: true`).
- **Sensitive Answer Bank entries (`isSensitive: true`) are never auto-filled in this plan, with no override mechanism.** The existing `answer-bank-schema.ts` already forces `autoFillEnabled: false` whenever `isSensitive: true`, so this constraint mostly follows from existing data — but the executor must not rely on that invariant alone and must check `isSensitive` directly, since a future plan could relax the schema's forced pairing (e.g. a privacy-settings toggle) without this plan's code silently starting to auto-fill sensitive answers.
- Non-sensitive entries also respect `autoFillEnabled: false` — an entry the user has explicitly turned off must not be filled even if matched at high confidence.
- **Radio-button-group yes/no matching is out of scope for this plan** — see Scope decision above. Do not attempt partial radio support.
- Content scripts must read Answer Bank data through the existing `answerBankRepository` (`src/shared/storage/answer-bank-repository.ts`) — never call `chrome.storage.local` directly.
- Common-question fields must not be double-counted: a field recognized as a common question must be routed only to the Answer Bank fill pass, never also counted by the Profile fill pass, even though both are section-agnostic matches.

---

### Task 1: Field Dictionary — add common-question canonical keys

**Files:**
- Modify: `src/content/field-dictionary.ts`
- Modify: `src/content/field-dictionary.test.ts` (add tests only — do not change the existing tests)

**Interfaces:**
- Produces: 8 new `FIELD_DICTIONARY` entries (all untagged/section-agnostic, like the existing Personal Info entries), and a new exported `COMMON_QUESTION_KEYS: Set<string>` containing exactly those 8 canonical keys: `workAuthorization`, `sponsorship`, `relocate`, `workArrangement`, `desiredSalary`, `noticePeriod`, `yearsOfExperience`, `whyInterested`. Consumed by Task 2 (Executor, for the type only — it doesn't need the set) and Task 3 (content script wiring, to partition matches).

- [ ] **Step 1: Write the failing test**

Add these two tests to the existing `describe('FIELD_DICTIONARY', ...)` block in `src/content/field-dictionary.test.ts` (after the existing tests, before the closing `})`):
```ts
  it('tags common question fields with canonical keys and leaves them section-agnostic', () => {
    const byKey = (key: string) => FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key)

    expect(
      byKey('workAuthorization')?.patterns.some((p) =>
        p.test('Are you legally authorized to work in this country?')
      )
    ).toBe(true)
    expect(
      byKey('sponsorship')?.patterns.some((p) =>
        p.test('Will you now or in the future require sponsorship?')
      )
    ).toBe(true)
    expect(byKey('relocate')?.patterns.some((p) => p.test('Are you willing to relocate?'))).toBe(
      true
    )
    expect(byKey('workArrangement')?.patterns.some((p) => p.test('Work arrangement'))).toBe(true)
    expect(byKey('desiredSalary')?.patterns.some((p) => p.test('Desired salary'))).toBe(true)
    expect(byKey('noticePeriod')?.patterns.some((p) => p.test('Notice period'))).toBe(true)
    expect(byKey('yearsOfExperience')?.patterns.some((p) => p.test('Years of experience'))).toBe(
      true
    )
    expect(
      byKey('whyInterested')?.patterns.some((p) => p.test('Why are you interested in this role?'))
    ).toBe(true)
    expect(byKey('workAuthorization')?.section).toBeUndefined()
  })

  it('exports COMMON_QUESTION_KEYS containing exactly the 8 common-question canonical keys', () => {
    expect(COMMON_QUESTION_KEYS.size).toBe(8)
    expect(COMMON_QUESTION_KEYS.has('workAuthorization')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('sponsorship')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('relocate')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('workArrangement')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('desiredSalary')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('noticePeriod')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('yearsOfExperience')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('whyInterested')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('firstName')).toBe(false)
  })
```

Add `COMMON_QUESTION_KEYS` to the existing import line at the top of `src/content/field-dictionary.test.ts` (it currently imports `FIELD_DICTIONARY` from `./field-dictionary` — add `COMMON_QUESTION_KEYS` to that same import).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: FAIL — `COMMON_QUESTION_KEYS` doesn't exist yet (import error), and `byKey('workAuthorization')` etc. return `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `src/content/field-dictionary.ts`, add these 8 entries to the end of the `FIELD_DICTIONARY` array (after the existing Education entries, before the closing `]`):
```ts

  // Common questions — section-agnostic, matches anywhere on the page
  {
    canonicalKey: 'workAuthorization',
    patterns: [/legally\s*authorized/i, /authorized\s*to\s*work/i],
  },
  { canonicalKey: 'sponsorship', patterns: [/sponsorship/i] },
  { canonicalKey: 'relocate', patterns: [/willing\s*to\s*relocate/i, /relocation/i] },
  {
    canonicalKey: 'workArrangement',
    patterns: [/work\s*arrangement/i, /remote.*hybrid.*onsite/i],
  },
  {
    canonicalKey: 'desiredSalary',
    patterns: [/desired\s*salary/i, /salary\s*expectation/i, /compensation\s*expectation/i],
  },
  { canonicalKey: 'noticePeriod', patterns: [/notice\s*period/i, /earliest\s*start\s*date/i] },
  { canonicalKey: 'yearsOfExperience', patterns: [/years?\s*of\s*experience/i] },
  { canonicalKey: 'whyInterested', patterns: [/why.*interested/i] },
```

Then add this export at the bottom of the same file (after the closing `]` of `FIELD_DICTIONARY`):
```ts

export const COMMON_QUESTION_KEYS = new Set<string>([
  'workAuthorization',
  'sponsorship',
  'relocate',
  'workArrangement',
  'desiredSalary',
  'noticePeriod',
  'yearsOfExperience',
  'whyInterested',
])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: PASS — 6 tests passed (4 existing + 2 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/field-dictionary.ts src/content/field-dictionary.test.ts
git commit -m "feat(content): add common question dictionary entries"
```

---

### Task 2: Executor — add autofillAnswerBankFields

**Files:**
- Modify: `src/content/executor.ts`
- Modify: `src/content/executor.test.ts` (add a new `describe` block and one new import only — do not change the existing tests)

**Interfaces:**
- Consumes: `AnswerBankEntry` (existing, `src/shared/types/answer-bank.ts`, shape: `{ id: string; questionKey: string; questionLabel: string; type: 'yesNo' | 'text' | 'select'; value: string; isSensitive: boolean; autoFillEnabled: boolean }`).
- Produces: `autofillAnswerBankFields(matches: FieldMatch[], answerBank: AnswerBankEntry[]): AutofillSummary`. Consumed by Task 3 (content script wiring). No section parameter — common-question matches are already section-agnostic (`match.section === null`), and Task 3 is responsible for only ever passing this function matches whose `canonicalKey` is a common-question key (this function does not re-check that itself — it looks up by `questionKey` regardless of what canonical key it's given, matching the plain "does this key exist in the Answer Bank" semantics).

- [ ] **Step 1: Write the failing test**

Add this import to the top of `src/content/executor.test.ts` (alongside the existing imports):
```ts
import type { AnswerBankEntry } from '../shared/types/answer-bank'
```

Add this `describe` block to `src/content/executor.test.ts` (after the existing `describe('autofillSectionFields', ...)` block):
```ts
describe('autofillAnswerBankFields', () => {
  it('fills a high-confidence match with a non-sensitive, auto-fill-enabled answer', () => {
    document.body.innerHTML =
      '<label for="salary">Desired salary</label><input id="salary" name="desiredSalary" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'desiredSalary',
        questionLabel: 'Desired salary',
        type: 'text',
        value: '$120,000',
        isSensitive: false,
        autoFillEnabled: true,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank)

    expect((document.getElementById('salary') as HTMLInputElement).value).toBe('$120,000')
    expect(summary).toEqual({ detected: 1, filled: 1, needsReview: 0 })
  })

  it('never fills a sensitive answer bank entry, even if matched at high confidence', () => {
    document.body.innerHTML =
      '<label for="sponsorship">Sponsorship</label><input id="sponsorship" name="sponsorship" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'sponsorship',
        questionLabel: 'Sponsorship',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank)

    expect((document.getElementById('sponsorship') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('does not fill a non-sensitive entry with autoFillEnabled set to false', () => {
    document.body.innerHTML =
      '<label for="notice">Notice period</label><input id="notice" name="noticePeriod" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'noticePeriod',
        questionLabel: 'Notice period',
        type: 'text',
        value: '2 weeks',
        isSensitive: false,
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank)

    expect((document.getElementById('notice') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('reports zero filled fields when no matching answer bank entry exists', () => {
    document.body.innerHTML =
      '<label for="salary">Desired salary</label><input id="salary" name="desiredSalary" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillAnswerBankFields(matches, [])

    expect((document.getElementById('salary') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/executor.test.ts`
Expected: FAIL — `Cannot find name 'autofillAnswerBankFields'` (not exported yet).

- [ ] **Step 3: Write minimal implementation**

Add this import to the top of `src/content/executor.ts` (alongside the existing imports):
```ts
import type { AnswerBankEntry } from '../shared/types/answer-bank'
```

Add this function to the end of `src/content/executor.ts` (after `autofillSectionFields`):
```ts

export function autofillAnswerBankFields(
  matches: FieldMatch[],
  answerBank: AnswerBankEntry[]
): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.canonicalKey === null || match.confidence === 'low') continue
    detected++

    if (match.confidence === 'high') {
      const entry = answerBank.find((candidate) => candidate.questionKey === match.canonicalKey)
      if (entry && !entry.isSensitive && entry.autoFillEnabled && hasFillableValue(entry.value)) {
        setFieldValue(match.field.element, entry.value)
        filled++
      }
    } else if (match.confidence === 'medium') {
      needsReview++
    }
  }

  return { detected, filled, needsReview }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/executor.test.ts`
Expected: PASS — 12 tests passed (8 existing + 4 new). Double-check the actual pre-existing count in the file rather than assuming — a prior task in an earlier plan found the brief's own assumed count was off by one.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass — confirm the pre-existing `autofillFields` and `autofillSectionFields` tests still pass unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/content/executor.ts src/content/executor.test.ts
git commit -m "feat(content): add answer bank autofill, skip sensitive entries"
```

---

### Task 3: Wire Answer Bank into the content script's AUTOFILL_PAGE handler

**Files:**
- Modify: `src/content/index.ts`
- Modify: `src/content/index.test.ts` (add tests only — do not change the existing tests)

**Interfaces:**
- Consumes: `autofillAnswerBankFields` (Task 2), `COMMON_QUESTION_KEYS` (Task 1), `answerBankRepository` (existing, `src/shared/storage/answer-bank-repository.ts`).
- Produces: the `AUTOFILL_PAGE` handler now also fills common-question fields from the Answer Bank, merging a fourth summary into the response. This is the last task in this plan with automated tests — Task 4 is manual browser verification.

- [ ] **Step 1: Write the failing test**

Add this import to the top of `src/content/index.test.ts` (alongside the existing imports):
```ts
import { answerBankRepository } from '../shared/storage/answer-bank-repository'
```

Add these three tests to the existing `describe('content script entry', ...)` block in `src/content/index.test.ts` (after the existing tests, before the closing `})`):
```ts
  it('fills a common question field from a matching answer bank entry', async () => {
    await answerBankRepository.add({
      id: '1',
      questionKey: 'desiredSalary',
      questionLabel: 'Desired salary',
      type: 'text',
      value: '$120,000',
      isSensitive: false,
      autoFillEnabled: true,
    })
    document.body.innerHTML =
      '<label for="salary">Desired salary</label><input id="salary" name="desiredSalary" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 1, needsReview: 0 },
    })
    expect((document.getElementById('salary') as HTMLInputElement).value).toBe('$120,000')
  })

  it('never fills a sensitive answer bank entry even when matched', async () => {
    await answerBankRepository.add({
      id: '1',
      questionKey: 'sponsorship',
      questionLabel: 'Sponsorship',
      type: 'yesNo',
      value: 'No',
      isSensitive: true,
      autoFillEnabled: false,
    })
    document.body.innerHTML =
      '<label for="sponsorship">Sponsorship</label><input id="sponsorship" name="sponsorship" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 0, needsReview: 0 },
    })
  })

  it('does not double-count a common question field in both personal info and answer bank passes', async () => {
    await saveProfile(profile)
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />' +
      '<label for="salary">Desired salary</label><input id="salary" name="desiredSalary" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 2, filled: 1, needsReview: 0 },
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/index.test.ts`
Expected: FAIL — the current handler never reads `answerBankRepository`, so common-question fields never get filled; the third new test would also fail differently if it did (it would show `detected: 2, filled: 1` only by coincidence of `autofillFields` silently no-op-ing on an unrecognized Profile key — the real assertion that matters is the first two new tests failing outright).

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/index.ts`:
```ts
import { getProfile } from '../shared/storage/profile-repository'
import { answerBankRepository } from '../shared/storage/answer-bank-repository'
import { educationRepository } from '../shared/storage/education-repository'
import { workExperienceRepository } from '../shared/storage/work-experience-repository'
import type {
  AutofillResultMessage,
  AutofillSummary,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
import type { Profile } from '../shared/types/profile'
import { COMMON_QUESTION_KEYS } from './field-dictionary'
import { isWorkdayPage } from './detector'
import { autofillAnswerBankFields, autofillFields, autofillSectionFields } from './executor'
import { matchFields } from './matcher'
import { scanFields } from './scanner'

function sumSummaries(summaries: AutofillSummary[]): AutofillSummary {
  return summaries.reduce(
    (total, summary) => ({
      detected: total.detected + summary.detected,
      filled: total.filled + summary.filled,
      needsReview: total.needsReview + summary.needsReview,
    }),
    { detected: 0, filled: 0, needsReview: 0 }
  )
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse: (response: PageStatusMessage | AutofillResultMessage) => void
  ) => {
    if (message.type === 'GET_PAGE_STATUS') {
      sendResponse({
        type: 'PAGE_STATUS',
        isWorkdayPage: isWorkdayPage(location.hostname, document),
      })
      return true
    }

    if (message.type === 'AUTOFILL_PAGE') {
      Promise.all([
        getProfile(),
        workExperienceRepository.list(),
        educationRepository.list(),
        answerBankRepository.list(),
      ]).then(([profile, workExperiences, educations, answerBank]) => {
        const matches = matchFields(scanFields(document))
        const sectionAgnosticMatches = matches.filter((match) => match.section === null)
        const commonQuestionMatches = sectionAgnosticMatches.filter(
          (match) => match.canonicalKey !== null && COMMON_QUESTION_KEYS.has(match.canonicalKey)
        )
        const personalInfoMatches = sectionAgnosticMatches.filter(
          (match) => match.canonicalKey === null || !COMMON_QUESTION_KEYS.has(match.canonicalKey)
        )
        const workExperienceMatches = matches.filter(
          (match) => match.section === 'workExperience'
        )
        const educationMatches = matches.filter((match) => match.section === 'education')

        const summary = sumSummaries([
          autofillFields(personalInfoMatches, profile ?? ({} as Profile)),
          autofillSectionFields(workExperienceMatches, 'workExperience', workExperiences[0]),
          autofillSectionFields(educationMatches, 'education', educations[0]),
          autofillAnswerBankFields(commonQuestionMatches, answerBank),
        ])

        sendResponse({ type: 'AUTOFILL_RESULT', summary })
      })
      return true
    }

    return undefined
  }
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/index.test.ts`
Expected: PASS — 11 tests passed (8 existing + 3 new). Double-check the actual pre-existing count in the file rather than assuming.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/index.ts src/content/index.test.ts
git commit -m "feat(content): fill common questions from answer bank on autofill"
```

---

### Task 4: Manual end-to-end verification of Common Questions autofill in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–3.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Load the unpacked extension and add Answer Bank entries**

In Chrome, reload the unpacked extension at `chrome://extensions` (pointing at `dist`). Open the extension's Options page, go to the Answer Bank section, and add entries for at least these `questionKey` values (must match exactly, case-sensitive, for the dictionary to recognize them): `desiredSalary`, `noticePeriod`, `yearsOfExperience`, `whyInterested` — all `type: 'text'`, `isSensitive: false`, `autoFillEnabled: true`. Also add one sensitive entry (any `questionKey`, `isSensitive: true`) to verify it's correctly skipped.

- [ ] **Step 3: Verify on the real Workday common-questions step**

Navigate to a Workday application step with common questions (refresh the tab so the content script is freshly injected), open the Side Panel, and click "Autofill current page". Verify:
1. Text-based questions (desired salary, notice period, years of experience, "why interested") get filled with your saved Answer Bank values.
2. The sensitive entry's field, if present on the page, is NOT filled.
3. If the page has any yes/no question rendered as a `<select>` dropdown, and you added a matching text-type Answer Bank entry with value `"Yes"` or `"No"`, check whether it selects correctly — this depends on the dropdown's actual `<option value="...">` matching that exact string, a known limitation (same class as the year-dropdown limitation from the prior plan).
4. If the page has any yes/no question rendered as separate radio buttons, confirm it is correctly NOT filled — this is out of scope for this plan, not a bug.

- [ ] **Step 4: Report**

No commit for this task — it is verification only. Confirm to the user which checks passed, and describe any field that didn't fill as expected.
