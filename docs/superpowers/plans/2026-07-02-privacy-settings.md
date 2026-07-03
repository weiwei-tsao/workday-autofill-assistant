# Privacy Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user explicitly opt in, per demographic category, to auto-filling sensitive Answer Bank entries — the "Privacy settings 开关" from the spec's original Phase 6 scope that was deliberately deferred when Common Questions autofill was built (that plan made sensitive entries never-auto-fill, with no override).

**Architecture:** Per spec §6.5.2, "如果用户明确在设置中开启某一类敏感字段自动填写，才允许自动填写" (auto-fill is only allowed if the user explicitly enables it for a given category of sensitive field in settings) — and the categories eligible for this opt-in are explicitly limited to the four named in §6.1.4 (gender, race/ethnicity, disability, veteran status; criminal history and health-related information are never eligible). This requires two additions to the domain model: `AnswerBankEntry` gains an optional `sensitiveCategory` field (so an entry can declare *which* sensitive category it belongs to, not just that it's sensitive), and a new `PrivacySettings` single-object entity (four booleans, one per opt-in-eligible category) follows the exact same repository/hook pattern already used for `Profile`. The executor's sensitivity gate — previously a hardcoded `!entry.isSensitive` check — becomes a category-lookup: non-sensitive entries are ungated by category (existing `autoFillEnabled` behavior, unchanged); sensitive entries are gated by whichever category-specific toggle applies, and default to never-fill if the category is `'other'` or unset (fail-closed, matching the spec's narrower opt-in list). None of this is reachable without also teaching the Field Dictionary to recognize the four demographic questions in the first place — they currently have no canonical keys at all, so no page field could ever match one.

**Tech Stack:** Same as the existing scaffold — TypeScript + Vitest + React Hook Form + Zod. No new dependencies.

## Global Constraints

- TypeScript `strict: true`.
- No network calls anywhere in the codebase.
- **Only four sensitive categories are eligible for auto-fill opt-in**: gender, race/ethnicity, disability status, veteran status — matching spec §6.1.4's exact list. Criminal history, health-related information, and any entry with no category set (or explicitly `'other'`) must NEVER auto-fill, with no settings path to enable it. This is a fail-closed design: an unrecognized or missing category defaults to blocked, not allowed.
- A sensitive entry's per-entry `autoFillEnabled` field is NOT consulted for the fill decision — the schema already forces it to `false` for any `isSensitive: true` entry (existing, unchanged invariant in `answer-bank-schema.ts`), and it stays semantically meaningless for sensitive entries under this plan. The category-specific Privacy Settings toggle is the only gate for sensitive entries; `autoFillEnabled` remains the only gate for non-sensitive entries, exactly as before this plan.
- `PrivacySettings` defaults to all-`false` when nothing has been saved yet — auto-fill for every sensitive category starts disabled until the user explicitly opts in, never opt-out.
- Content scripts must read/write Privacy Settings through the new `privacy-settings-repository.ts` — never call `chrome.storage.local` directly, consistent with every other entity in this codebase.

---

### Task 1: Field Dictionary — demographic question canonical keys

**Files:**
- Modify: `src/content/field-dictionary.ts`
- Modify: `src/content/field-dictionary.test.ts` (add tests only — do not change the existing tests)

**Interfaces:**
- Produces: 4 new `FIELD_DICTIONARY` entries (`gender`, `raceEthnicity`, `disabilityStatus`, `veteranStatus`), all untagged/section-agnostic like the existing Common Questions entries, and added to the existing `COMMON_QUESTION_KEYS` set. Consumed by Task 6 (content script wiring, no changes needed there beyond this — the existing partition logic in `content/index.ts` already routes anything in `COMMON_QUESTION_KEYS` to the Answer Bank fill pass).

- [ ] **Step 1: Write the failing test**

Add these two tests to the existing `describe('FIELD_DICTIONARY', ...)` block in `src/content/field-dictionary.test.ts` (after the existing tests, before the closing `})`):
```ts
  it('tags demographic question fields with canonical keys and leaves them section-agnostic', () => {
    const byKey = (key: string) => FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key)

    expect(byKey('gender')?.patterns.some((p) => p.test('Gender'))).toBe(true)
    expect(byKey('raceEthnicity')?.patterns.some((p) => p.test('Race / Ethnicity'))).toBe(true)
    expect(byKey('disabilityStatus')?.patterns.some((p) => p.test('Disability status'))).toBe(
      true
    )
    expect(byKey('veteranStatus')?.patterns.some((p) => p.test('Veteran status'))).toBe(true)
    expect(byKey('gender')?.section).toBeUndefined()
  })

  it('adds the demographic keys to COMMON_QUESTION_KEYS', () => {
    expect(COMMON_QUESTION_KEYS.has('gender')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('raceEthnicity')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('disabilityStatus')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('veteranStatus')).toBe(true)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: FAIL — `byKey('gender')` etc. return `undefined`, and `COMMON_QUESTION_KEYS.has('gender')` is `false`.

- [ ] **Step 3: Write minimal implementation**

In `src/content/field-dictionary.ts`, add these 4 entries to `FIELD_DICTIONARY` (immediately after the existing `whyInterested` entry, before the closing `]`):
```ts

  // Demographic / EEO-style questions — section-agnostic, gated by Privacy Settings
  { canonicalKey: 'gender', patterns: [/\bgender\b/i] },
  { canonicalKey: 'raceEthnicity', patterns: [/\brace\b/i, /ethnicity/i] },
  { canonicalKey: 'disabilityStatus', patterns: [/disability/i] },
  { canonicalKey: 'veteranStatus', patterns: [/veteran/i] },
```

Then add the same 4 keys to `COMMON_QUESTION_KEYS`:
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
  'gender',
  'raceEthnicity',
  'disabilityStatus',
  'veteranStatus',
])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: PASS — 8 tests passed (6 existing + 2 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/field-dictionary.ts src/content/field-dictionary.test.ts
git commit -m "feat(content): add demographic question dictionary entries"
```

---

### Task 2: Data layer — AnswerBankEntry category and PrivacySettings

**Files:**
- Modify: `src/shared/types/answer-bank.ts`
- Create: `src/shared/types/privacy-settings.ts`
- Create: `src/shared/storage/privacy-settings-repository.ts`
- Create: `src/shared/storage/privacy-settings-repository.test.ts`
- Create: `src/shared/storage/use-privacy-settings.ts`
- Create: `src/shared/storage/use-privacy-settings.test.tsx`

**Interfaces:**
- Produces: `SensitiveCategory = 'gender' | 'race' | 'disability' | 'veteranStatus' | 'other'`; `AnswerBankEntry` gains `sensitiveCategory?: SensitiveCategory`. `PrivacySettings { allowGenderAutoFill: boolean; allowRaceAutoFill: boolean; allowDisabilityAutoFill: boolean; allowVeteranStatusAutoFill: boolean }` and `DEFAULT_PRIVACY_SETTINGS` (all `false`). `getPrivacySettings(): Promise<PrivacySettings>` (never returns `undefined` — falls back to `DEFAULT_PRIVACY_SETTINGS`), `savePrivacySettings(settings: PrivacySettings): Promise<void>`. `usePrivacySettings()` hook returning `{ settings, isLoading, reload }`. Consumed by Task 3 (executor gating), Task 5 (Answer Bank form), Task 6 (content script), Task 7 (Options page).

- [ ] **Step 1: Write the failing test**

Create `src/shared/storage/privacy-settings-repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getPrivacySettings, savePrivacySettings } from './privacy-settings-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('privacy settings repository', () => {
  it('returns all-false defaults when nothing has been saved', async () => {
    expect(await getPrivacySettings()).toEqual({
      allowGenderAutoFill: false,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: false,
      allowVeteranStatusAutoFill: false,
    })
  })

  it('round-trips saved settings', async () => {
    await savePrivacySettings({
      allowGenderAutoFill: true,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: true,
      allowVeteranStatusAutoFill: false,
    })

    expect(await getPrivacySettings()).toEqual({
      allowGenderAutoFill: true,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: true,
      allowVeteranStatusAutoFill: false,
    })
  })
})
```

Create `src/shared/storage/use-privacy-settings.test.tsx`:
```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { savePrivacySettings } from './privacy-settings-repository'
import { usePrivacySettings } from './use-privacy-settings'

beforeEach(() => {
  installChromeStorageMock()
})

describe('usePrivacySettings', () => {
  it('loads all-false defaults when nothing is saved, then reflects storage updates', async () => {
    const { result } = renderHook(() => usePrivacySettings())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.settings).toEqual({
      allowGenderAutoFill: false,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: false,
      allowVeteranStatusAutoFill: false,
    })

    await act(async () => {
      await savePrivacySettings({
        allowGenderAutoFill: true,
        allowRaceAutoFill: false,
        allowDisabilityAutoFill: false,
        allowVeteranStatusAutoFill: false,
      })
    })

    await waitFor(() => expect(result.current.settings.allowGenderAutoFill).toBe(true))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/privacy-settings-repository.test.ts src/shared/storage/use-privacy-settings.test.tsx`
Expected: FAIL — `Cannot find module './privacy-settings-repository'` and `Cannot find module './use-privacy-settings'`.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/shared/types/answer-bank.ts`:
```ts
export type AnswerType = 'yesNo' | 'text' | 'select'

export type SensitiveCategory = 'gender' | 'race' | 'disability' | 'veteranStatus' | 'other'

export interface AnswerBankEntry {
  id: string
  questionKey: string
  questionLabel: string
  type: AnswerType
  value: string
  isSensitive: boolean
  sensitiveCategory?: SensitiveCategory
  autoFillEnabled: boolean
}
```

Create `src/shared/types/privacy-settings.ts`:
```ts
export interface PrivacySettings {
  allowGenderAutoFill: boolean
  allowRaceAutoFill: boolean
  allowDisabilityAutoFill: boolean
  allowVeteranStatusAutoFill: boolean
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  allowGenderAutoFill: false,
  allowRaceAutoFill: false,
  allowDisabilityAutoFill: false,
  allowVeteranStatusAutoFill: false,
}
```

Create `src/shared/storage/privacy-settings-repository.ts`:
```ts
import { DEFAULT_PRIVACY_SETTINGS, type PrivacySettings } from '../types/privacy-settings'
import { getLocal, setLocal } from './local-store'

const PRIVACY_SETTINGS_KEY = 'privacySettings'

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const stored = await getLocal<PrivacySettings>(PRIVACY_SETTINGS_KEY)
  return stored ?? DEFAULT_PRIVACY_SETTINGS
}

export async function savePrivacySettings(settings: PrivacySettings): Promise<void> {
  await setLocal(PRIVACY_SETTINGS_KEY, settings)
}
```

Create `src/shared/storage/use-privacy-settings.ts`:
```ts
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PRIVACY_SETTINGS, type PrivacySettings } from '../types/privacy-settings'
import { getPrivacySettings } from './privacy-settings-repository'

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    const next = await getPrivacySettings()
    setSettings(next)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    reload()
    function handleChange(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) {
      if (areaName === 'local' && 'privacySettings' in changes) {
        reload()
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [reload])

  return { settings, isLoading, reload }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/privacy-settings-repository.test.ts src/shared/storage/use-privacy-settings.test.tsx`
Expected: PASS — 2 tests passed in the repository test, 1 test passed in the hook test.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass — confirm the existing Answer Bank tests (which construct `AnswerBankEntry` objects without `sensitiveCategory`) still pass unchanged, since the new field is optional.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/answer-bank.ts src/shared/types/privacy-settings.ts src/shared/storage/privacy-settings-repository.ts src/shared/storage/privacy-settings-repository.test.ts src/shared/storage/use-privacy-settings.ts src/shared/storage/use-privacy-settings.test.tsx
git commit -m "feat(storage): add sensitive category field and privacy settings"
```

---

### Task 3: Executor — category-gated sensitive auto-fill

**Files:**
- Modify: `src/content/executor.ts`
- Modify: `src/content/executor.test.ts` (this task adds a required 3rd parameter to `autofillAnswerBankFields`, so the 4 existing tests in the `autofillAnswerBankFields` describe block need one line each updated to pass it — see Interfaces below for why this isn't just additive)

**Interfaces:**
- Consumes: `PrivacySettings` (Task 2, `src/shared/types/privacy-settings.ts`).
- Produces: `autofillAnswerBankFields(matches: FieldMatch[], answerBank: AnswerBankEntry[], privacySettings: PrivacySettings): AutofillSummary` — signature gains a required 3rd parameter. `autofillFields`/`autofillSectionFields`/`hasFillableValue`/`setFieldValue`/`highlightField` are UNCHANGED. Consumed by Task 6 (content script wiring).
- **Why 4 existing tests need one line each changed, not just new tests added:** `autofillAnswerBankFields`'s signature is widening to a required 3rd parameter — every existing call site in `executor.test.ts` needs that argument added to keep compiling. Each existing test's *expected result* is unaffected (verified individually below) — only the function call itself gains one argument.

- [ ] **Step 1: Write the failing test**

Replace the contents of the `describe('autofillAnswerBankFields', ...)` block in `src/content/executor.test.ts` (replace from `describe('autofillAnswerBankFields', () => {` through its matching closing `})` — this is the last `describe` block in the file, immediately before the `describe('field highlight on fill', ...)` block):
```ts
describe('autofillAnswerBankFields', () => {
  const allowAllPrivacySettings: PrivacySettings = {
    allowGenderAutoFill: true,
    allowRaceAutoFill: true,
    allowDisabilityAutoFill: true,
    allowVeteranStatusAutoFill: true,
  }
  const blockAllPrivacySettings: PrivacySettings = {
    allowGenderAutoFill: false,
    allowRaceAutoFill: false,
    allowDisabilityAutoFill: false,
    allowVeteranStatusAutoFill: false,
  }

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

    const summary = autofillAnswerBankFields(matches, answerBank, blockAllPrivacySettings)

    expect((document.getElementById('salary') as HTMLInputElement).value).toBe('$120,000')
    expect(summary).toEqual({ detected: 1, filled: 1, needsReview: 0 })
  })

  it('never fills a sensitive answer bank entry with no category, regardless of privacy settings', () => {
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

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

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

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

    expect((document.getElementById('notice') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('reports zero filled fields when no matching answer bank entry exists', () => {
    document.body.innerHTML =
      '<label for="salary">Desired salary</label><input id="salary" name="desiredSalary" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillAnswerBankFields(matches, [], allowAllPrivacySettings)

    expect((document.getElementById('salary') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('fills a sensitive entry when its category is explicitly allowed in privacy settings', () => {
    document.body.innerHTML = '<label for="vet">Veteran status</label><input id="vet" name="veteranStatus" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'veteranStatus',
        questionLabel: 'Veteran status',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        sensitiveCategory: 'veteranStatus',
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

    expect((document.getElementById('vet') as HTMLInputElement).value).toBe('No')
    expect(summary).toEqual({ detected: 1, filled: 1, needsReview: 0 })
  })

  it('does not fill a sensitive entry when its category is not allowed in privacy settings', () => {
    document.body.innerHTML = '<label for="vet">Veteran status</label><input id="vet" name="veteranStatus" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'veteranStatus',
        questionLabel: 'Veteran status',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        sensitiveCategory: 'veteranStatus',
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, blockAllPrivacySettings)

    expect((document.getElementById('vet') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('never fills a sensitive entry tagged "other", even when all privacy settings are enabled', () => {
    document.body.innerHTML =
      '<label for="disability">Disability status</label><input id="disability" name="disabilityStatus" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'disabilityStatus',
        questionLabel: 'Disability status',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        sensitiveCategory: 'other',
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

    expect((document.getElementById('disability') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })
})
```

Add this import to the top of `src/content/executor.test.ts` (alongside the existing imports):
```ts
import type { PrivacySettings } from '../shared/types/privacy-settings'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/executor.test.ts`
Expected: FAIL — `autofillAnswerBankFields` currently takes 2 parameters, so every call in the replaced block errors (extra argument doesn't type-check yet), and the 3 brand-new tests fail outright since the category-gating logic doesn't exist.

- [ ] **Step 3: Write minimal implementation**

In `src/content/executor.ts`, add this import at the top (alongside the existing imports):
```ts
import type { PrivacySettings } from '../shared/types/privacy-settings'
```

Replace the `autofillAnswerBankFields` function (the last function in the file) with:
```ts
function isAutoFillAllowed(entry: AnswerBankEntry, privacySettings: PrivacySettings): boolean {
  if (!entry.isSensitive) return entry.autoFillEnabled

  switch (entry.sensitiveCategory) {
    case 'gender':
      return privacySettings.allowGenderAutoFill
    case 'race':
      return privacySettings.allowRaceAutoFill
    case 'disability':
      return privacySettings.allowDisabilityAutoFill
    case 'veteranStatus':
      return privacySettings.allowVeteranStatusAutoFill
    default:
      return false
  }
}

export function autofillAnswerBankFields(
  matches: FieldMatch[],
  answerBank: AnswerBankEntry[],
  privacySettings: PrivacySettings
): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.canonicalKey === null || match.confidence === 'low') continue
    detected++

    if (match.confidence === 'high') {
      const entry = answerBank.find((candidate) => candidate.questionKey === match.canonicalKey)
      if (entry && isAutoFillAllowed(entry, privacySettings) && hasFillableValue(entry.value)) {
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
Expected: PASS — 17 tests passed (14 pre-existing minus the 4 replaced `autofillAnswerBankFields` tests, plus 7 in the replaced block = 10 in that describe block + 5 `autofillFields` + 3 `autofillSectionFields` + 2 highlight = 17 total). Double-check the actual count against the file rather than assuming.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass — confirm `autofillFields`/`autofillSectionFields`/highlight tests are byte-identical to before this diff (only the `autofillAnswerBankFields` block changed).

- [ ] **Step 6: Commit**

```bash
git add src/content/executor.ts src/content/executor.test.ts
git commit -m "feat(content): gate sensitive auto-fill by privacy settings category"
```

---

### Task 4: Answer Bank form — sensitive category field

**Files:**
- Modify: `src/options/answer-bank/answer-bank-schema.ts`
- Modify: `src/options/answer-bank/AnswerBankPage.tsx`
- Modify: `src/options/answer-bank/AnswerBankPage.test.tsx` (add a test only — do not change the existing tests)

**Interfaces:**
- Consumes: `SensitiveCategory` (Task 2, `src/shared/types/answer-bank.ts`).
- Produces: `answerBankFormSchema` gains an optional `sensitiveCategory` field (empty-string-from-unselected-`<select>` correctly coerced to `undefined`, matching the same pattern used for optional numeric fields elsewhere in this codebase). `AnswerBankPage` renders a category `<select>` alongside the existing `isSensitive`/`autoFillEnabled` fields. Consumed by Task 3's executor logic (already built) — this task is what lets a user actually set the field a real entry needs to benefit from Task 3's gating.

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('AnswerBankPage', ...)` block in `src/options/answer-bank/AnswerBankPage.test.tsx` (after the existing tests, before the closing `})`):
```tsx
  it('saves a sensitive category selection alongside the sensitive flag', async () => {
    const user = userEvent.setup()
    render(<AnswerBankPage />)

    await user.type(screen.getByLabelText('Question key'), 'veteranStatus')
    await user.type(screen.getByLabelText('Question label'), 'Are you a veteran?')
    await user.selectOptions(screen.getByLabelText('Question type'), 'yesNo')
    await user.type(screen.getByLabelText('Answer'), 'No')
    await user.click(screen.getByLabelText('Sensitive question'))
    await user.selectOptions(
      screen.getByLabelText('Sensitive category (if applicable)'),
      'veteranStatus'
    )
    await user.click(screen.getByRole('button', { name: 'Add answer' }))

    const list = await screen.findByLabelText('Answer bank list')
    expect(within(list).getByText('Are you a veteran?')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/answer-bank/AnswerBankPage.test.tsx`
Expected: FAIL — `screen.getByLabelText('Sensitive category (if applicable)')` finds no element.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/options/answer-bank/answer-bank-schema.ts`:
```ts
import { z } from 'zod'

const optionalSensitiveCategory = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.enum(['gender', 'race', 'disability', 'veteranStatus', 'other']).optional()
)

export const answerBankFormSchema = z
  .object({
    questionKey: z.string().min(1, 'Question key is required'),
    questionLabel: z.string().min(1, 'Question label is required'),
    type: z.enum(['yesNo', 'text', 'select']),
    value: z.string().min(1, 'Answer value is required'),
    isSensitive: z.boolean(),
    sensitiveCategory: optionalSensitiveCategory,
    autoFillEnabled: z.boolean(),
  })
  .transform((values) => ({
    ...values,
    autoFillEnabled: values.isSensitive ? false : values.autoFillEnabled,
  }))

export type AnswerBankFormValues = z.input<typeof answerBankFormSchema>
```

Replace the contents of `src/options/answer-bank/AnswerBankPage.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { answerBankRepository } from '../../shared/storage/answer-bank-repository'
import { useEntityCrudForm } from '../../shared/storage/use-entity-crud-form'
import type { AnswerBankEntry } from '../../shared/types/answer-bank'
import { answerBankFormSchema, type AnswerBankFormValues } from './answer-bank-schema'

const emptyValues: AnswerBankFormValues = {
  questionKey: '',
  questionLabel: '',
  type: 'yesNo',
  value: '',
  isSensitive: false,
  sensitiveCategory: '',
  autoFillEnabled: true,
}

export function AnswerBankPage() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AnswerBankFormValues>({
    resolver: zodResolver(answerBankFormSchema),
    defaultValues: emptyValues,
  })
  const { items, editingId, submit, startEdit, remove } = useEntityCrudForm<
    AnswerBankEntry,
    AnswerBankFormValues
  >('answerBank', answerBankRepository, emptyValues, reset)
  const isSensitiveField = register('isSensitive')

  const onSubmit = handleSubmit(submit)

  return (
    <section>
      <h2>Answer bank</h2>
      <ul aria-label="Answer bank list">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.questionLabel}</span>
            <span>
              {item.isSensitive
                ? item.autoFillEnabled
                  ? 'Sensitive — auto-fill on'
                  : 'Sensitive — auto-fill off'
                : 'Auto-fill on'}
            </span>
            <button type="button" onClick={() => startEdit(item)}>
              Edit
            </button>
            <button type="button" onClick={() => remove(item.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} aria-label="Answer bank form" className="space-y-2 max-w-xl">
        <div>
          <label htmlFor="questionKey">Question key</label>
          <input id="questionKey" {...register('questionKey')} />
          {errors.questionKey && <p role="alert">{errors.questionKey.message}</p>}
        </div>
        <div>
          <label htmlFor="questionLabel">Question label</label>
          <input id="questionLabel" {...register('questionLabel')} />
          {errors.questionLabel && <p role="alert">{errors.questionLabel.message}</p>}
        </div>
        <div>
          <label htmlFor="type">Question type</label>
          <select id="type" {...register('type')}>
            <option value="yesNo">Yes / No</option>
            <option value="text">Text</option>
            <option value="select">Select</option>
          </select>
        </div>
        <div>
          <label htmlFor="value">Answer</label>
          <input id="value" {...register('value')} />
          {errors.value && <p role="alert">{errors.value.message}</p>}
        </div>
        <div>
          <label htmlFor="isSensitive">
            <input
              id="isSensitive"
              type="checkbox"
              name={isSensitiveField.name}
              ref={isSensitiveField.ref}
              onBlur={isSensitiveField.onBlur}
              onChange={(event) => {
                isSensitiveField.onChange(event)
                if (event.target.checked) {
                  setValue('autoFillEnabled', false)
                }
              }}
            />
            Sensitive question
          </label>
        </div>
        <div>
          <label htmlFor="sensitiveCategory">Sensitive category (if applicable)</label>
          <select id="sensitiveCategory" {...register('sensitiveCategory')}>
            <option value="">Not applicable</option>
            <option value="gender">Gender</option>
            <option value="race">Race / Ethnicity</option>
            <option value="disability">Disability status</option>
            <option value="veteranStatus">Veteran status</option>
            <option value="other">Other sensitive category</option>
          </select>
        </div>
        <div>
          <label htmlFor="autoFillEnabled">
            <input id="autoFillEnabled" type="checkbox" {...register('autoFillEnabled')} />
            Auto-fill this answer
          </label>
        </div>
        <button type="submit">{editingId ? 'Update answer' : 'Add answer'}</button>
      </form>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/answer-bank/AnswerBankPage.test.tsx`
Expected: PASS — 3 tests passed (2 existing + 1 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/options/answer-bank/answer-bank-schema.ts src/options/answer-bank/AnswerBankPage.tsx src/options/answer-bank/AnswerBankPage.test.tsx
git commit -m "feat(answer-bank): add sensitive category field to the form"
```

---

### Task 5: Privacy Settings Options page

**Files:**
- Create: `src/options/privacy-settings/PrivacySettingsPage.tsx`
- Create: `src/options/privacy-settings/PrivacySettingsPage.test.tsx`
- Modify: `src/options/App.tsx`
- Modify: `src/options/App.test.tsx` (add a test only — do not change the existing tests)

**Interfaces:**
- Consumes: `usePrivacySettings` (Task 2), `savePrivacySettings` (Task 2).
- Produces: `PrivacySettingsPage` component with 4 checkboxes (one per opt-in-eligible category), each auto-saving on toggle (no separate Save button — matches how OS-level privacy toggles conventionally work; there's nothing else on this page to batch-submit). Wired into the Options `App.tsx` tab navigation as `'privacy'` / "Privacy settings".

- [ ] **Step 1: Write the failing test**

Create `src/options/privacy-settings/PrivacySettingsPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getPrivacySettings } from '../../shared/storage/privacy-settings-repository'
import { PrivacySettingsPage } from './PrivacySettingsPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('PrivacySettingsPage', () => {
  it('renders all four toggles unchecked by default', async () => {
    render(<PrivacySettingsPage />)

    expect(await screen.findByLabelText('Allow auto-fill for Gender')).not.toBeChecked()
    expect(screen.getByLabelText('Allow auto-fill for Race / Ethnicity')).not.toBeChecked()
    expect(screen.getByLabelText('Allow auto-fill for Disability status')).not.toBeChecked()
    expect(screen.getByLabelText('Allow auto-fill for Veteran status')).not.toBeChecked()
  })

  it('saves a toggle change immediately without a separate save button', async () => {
    const user = userEvent.setup()
    render(<PrivacySettingsPage />)

    const genderToggle = await screen.findByLabelText('Allow auto-fill for Gender')
    await user.click(genderToggle)

    expect(genderToggle).toBeChecked()
    const saved = await getPrivacySettings()
    expect(saved.allowGenderAutoFill).toBe(true)
    expect(saved.allowRaceAutoFill).toBe(false)
  })
})
```

Add this test to the existing `describe('App', ...)` block in `src/options/App.test.tsx` (after the existing tests, before the closing `})`):
```tsx
  it('shows the privacy settings tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    expect(await screen.findByLabelText('Allow auto-fill for Gender')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/privacy-settings/PrivacySettingsPage.test.tsx src/options/App.test.tsx`
Expected: FAIL — `Cannot find module './PrivacySettingsPage'`, and the App test fails because there is no "Privacy settings" tab button yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/options/privacy-settings/PrivacySettingsPage.tsx`:
```tsx
import { usePrivacySettings } from '../../shared/storage/use-privacy-settings'
import { savePrivacySettings } from '../../shared/storage/privacy-settings-repository'
import type { PrivacySettings } from '../../shared/types/privacy-settings'

export function PrivacySettingsPage() {
  const { settings, isLoading } = usePrivacySettings()

  async function handleToggle(key: keyof PrivacySettings, checked: boolean) {
    await savePrivacySettings({ ...settings, [key]: checked })
  }

  if (isLoading) return null

  return (
    <section>
      <h2>Privacy settings</h2>
      <p>
        Sensitive questions (gender, race/ethnicity, disability status, veteran status) are never
        auto-filled unless you explicitly enable it here, per category.
      </p>
      <div>
        <label htmlFor="allowGenderAutoFill">
          <input
            id="allowGenderAutoFill"
            type="checkbox"
            checked={settings.allowGenderAutoFill}
            onChange={(event) => handleToggle('allowGenderAutoFill', event.target.checked)}
          />
          Allow auto-fill for Gender
        </label>
      </div>
      <div>
        <label htmlFor="allowRaceAutoFill">
          <input
            id="allowRaceAutoFill"
            type="checkbox"
            checked={settings.allowRaceAutoFill}
            onChange={(event) => handleToggle('allowRaceAutoFill', event.target.checked)}
          />
          Allow auto-fill for Race / Ethnicity
        </label>
      </div>
      <div>
        <label htmlFor="allowDisabilityAutoFill">
          <input
            id="allowDisabilityAutoFill"
            type="checkbox"
            checked={settings.allowDisabilityAutoFill}
            onChange={(event) => handleToggle('allowDisabilityAutoFill', event.target.checked)}
          />
          Allow auto-fill for Disability status
        </label>
      </div>
      <div>
        <label htmlFor="allowVeteranStatusAutoFill">
          <input
            id="allowVeteranStatusAutoFill"
            type="checkbox"
            checked={settings.allowVeteranStatusAutoFill}
            onChange={(event) =>
              handleToggle('allowVeteranStatusAutoFill', event.target.checked)
            }
          />
          Allow auto-fill for Veteran status
        </label>
      </div>
    </section>
  )
}
```

Replace the contents of `src/options/App.tsx`:
```tsx
import { useState } from 'react'
import { AnswerBankPage } from './answer-bank/AnswerBankPage'
import { ApplicationRecordsPage } from './application-records/ApplicationRecordsPage'
import { EducationPage } from './education/EducationPage'
import { ImportExportPage } from './import-export/ImportExportPage'
import { PersonalInfoPage } from './personal-info/PersonalInfoPage'
import { PrivacySettingsPage } from './privacy-settings/PrivacySettingsPage'
import { WorkExperiencePage } from './work-experience/WorkExperiencePage'

const TABS = [
  { key: 'personal', label: 'Personal info' },
  { key: 'work', label: 'Work experience' },
  { key: 'education', label: 'Education' },
  { key: 'answers', label: 'Answer bank' },
  { key: 'applications', label: 'Application records' },
  { key: 'import-export', label: 'Import / Export' },
  { key: 'privacy', label: 'Privacy settings' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Workday Autofill Assistant — Profile</h1>
      <nav aria-label="Profile sections" className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={activeTab === tab.key ? 'page' : undefined}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab === 'personal' && <PersonalInfoPage />}
      {activeTab === 'work' && <WorkExperiencePage />}
      {activeTab === 'education' && <EducationPage />}
      {activeTab === 'answers' && <AnswerBankPage />}
      {activeTab === 'applications' && <ApplicationRecordsPage />}
      {activeTab === 'import-export' && <ImportExportPage />}
      {activeTab === 'privacy' && <PrivacySettingsPage />}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/privacy-settings/PrivacySettingsPage.test.tsx src/options/App.test.tsx`
Expected: PASS — 2 tests passed in `PrivacySettingsPage.test.tsx`, 4 tests passed in `App.test.tsx` (3 existing + 1 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/options/privacy-settings/ src/options/App.tsx src/options/App.test.tsx
git commit -m "feat(options): add privacy settings page with per-category toggles"
```

---

### Task 6: Wire Privacy Settings into the content script

**Files:**
- Modify: `src/content/index.ts`

**Interfaces:**
- Consumes: `getPrivacySettings` (Task 2), `autofillAnswerBankFields`'s new 3rd parameter (Task 3).
- Produces: the `AUTOFILL_PAGE` handler now fetches `getPrivacySettings()` alongside its existing repository reads and passes the result through to `autofillAnswerBankFields`. No new automated test file — this task is exercised by an INTEGRATION test added directly to the existing `src/content/index.test.ts` (see Step 1), proving the full path from a saved category + saved privacy setting through to an actual DOM fill.

- [ ] **Step 1: Write the failing test**

Add this import to the top of `src/content/index.test.ts` (alongside the existing imports):
```ts
import { savePrivacySettings } from '../shared/storage/privacy-settings-repository'
```

Add this test to the existing `describe('content script entry', ...)` block in `src/content/index.test.ts` (after the existing tests, before the closing `})`):
```ts
  it('fills a sensitive demographic field only when its category is allowed in privacy settings', async () => {
    await answerBankRepository.add({
      id: '1',
      questionKey: 'veteranStatus',
      questionLabel: 'Veteran status',
      type: 'yesNo',
      value: 'No',
      isSensitive: true,
      sensitiveCategory: 'veteranStatus',
      autoFillEnabled: false,
    })
    await savePrivacySettings({
      allowGenderAutoFill: false,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: false,
      allowVeteranStatusAutoFill: true,
    })
    document.body.innerHTML =
      '<label for="vet">Veteran status</label><input id="vet" name="veteranStatus" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: false },
    })
    expect((document.getElementById('vet') as HTMLInputElement).value).toBe('No')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/index.test.ts`
Expected: FAIL — `autofillAnswerBankFields` is currently called with only 2 arguments in `content/index.ts`, so this doesn't type-check yet, and even ignoring that, privacy settings are never fetched or threaded through, so the field would never fill.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/index.ts`:
```ts
import { getProfile } from '../shared/storage/profile-repository'
import { answerBankRepository } from '../shared/storage/answer-bank-repository'
import { applicationRecordRepository } from '../shared/storage/application-record-repository'
import { educationRepository } from '../shared/storage/education-repository'
import { getPrivacySettings } from '../shared/storage/privacy-settings-repository'
import { workExperienceRepository } from '../shared/storage/work-experience-repository'
import type {
  ApplicationSavedMessage,
  AutofillResultMessage,
  AutofillSummary,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
import type { ApplicationRecord } from '../shared/types/application-record'
import type { Profile } from '../shared/types/profile'
import { extractApplicationInfo } from './application-extractor'
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
    sendResponse: (
      response: PageStatusMessage | AutofillResultMessage | ApplicationSavedMessage
    ) => void
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
        getPrivacySettings(),
      ]).then(([profile, workExperiences, educations, answerBank, privacySettings]) => {
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
          autofillAnswerBankFields(commonQuestionMatches, answerBank, privacySettings),
        ])

        const skipped = matches.filter(
          (match) => match.canonicalKey === null || match.confidence === 'low'
        ).length
        const hasMoreEntries = workExperiences.length > 1 || educations.length > 1

        sendResponse({
          type: 'AUTOFILL_RESULT',
          summary: { ...summary, skipped, hasMoreEntries },
        })
      })
      return true
    }

    if (message.type === 'SAVE_APPLICATION') {
      const info = extractApplicationInfo(document)
      const record: ApplicationRecord = {
        id: crypto.randomUUID(),
        companyName: info.companyName,
        jobTitle: info.jobTitle,
        jobLocation: info.jobLocation || undefined,
        jobUrl: info.jobUrl,
        applicationDate: info.applicationDate,
        sourcePlatform: 'Workday',
        status: 'Applied',
      }
      applicationRecordRepository.add(record).then(() => {
        sendResponse({ type: 'APPLICATION_SAVED', record })
      })
      return true
    }

    return undefined
  }
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/index.test.ts`
Expected: PASS — 15 tests passed (14 existing + 1 new). Double-check the actual pre-existing count in the file rather than assuming.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass — confirm in particular that the pre-existing "never fills a sensitive answer bank entry even when matched" test (which uses an entry with no `sensitiveCategory`) still passes unchanged, proving privacy settings don't accidentally widen what auto-fills for uncategorized sensitive entries.

- [ ] **Step 6: Commit**

```bash
git add src/content/index.ts src/content/index.test.ts
git commit -m "feat(content): wire privacy settings into answer bank autofill"
```

---

### Task 7: Manual end-to-end verification of Privacy Settings in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–6.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Verify the default-blocked state**

In Chrome, reload the unpacked extension at `chrome://extensions` (pointing at `dist`). In the Options page's Answer Bank tab, add a sensitive entry (e.g. `questionKey: veteranStatus`, mark "Sensitive question", select "Veteran status" as the category, answer "No"). Navigate to a real Workday page with a matching demographic question (or a page you construct for testing), refresh, open the Side Panel, click Autofill. Verify the field is NOT filled — sensitive entries stay blocked by default.

- [ ] **Step 3: Verify the opt-in path**

In the Options page's new "Privacy settings" tab, toggle on "Allow auto-fill for Veteran status". Go back to the Workday page, refresh, click Autofill again. Verify the field IS now filled with "No".

- [ ] **Step 4: Verify other categories stay blocked**

With only "Veteran status" enabled, if the page also has a Gender or Disability status field with a matching sensitive Answer Bank entry, confirm those remain unfilled — the opt-in is genuinely per-category, not a global unlock.

- [ ] **Step 5: Report**

No commit for this task — it is verification only. Confirm to the user which checks passed, and describe anything unexpected.
