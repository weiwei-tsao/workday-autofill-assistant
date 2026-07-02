# Inline UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining UI-copy gaps from spec §12 (edge cases) and §8.3 (inline feedback): briefly highlight a field right after it's auto-filled, tell the user when some fields were recognized-but-skipped, and tell them when there's more than one stored Work Experience/Education entry they'll need to manually trigger a second Autofill pass for.

**Architecture:** All three pieces are additive to the existing autofill pipeline — no scanning/matching/scoring logic changes. (1) `setFieldValue` (the single shared write helper already used by all three `autofillX` functions) gets one new side effect: a transient outline style, reverted via `setTimeout`. (2) The content script's `AUTOFILL_PAGE` handler computes two new values after building the existing summary — `skipped` (fields recognized as candidates but never matched to anything, `canonicalKey === null || confidence === 'low'`) and `hasMoreEntries` (`workExperiences.length > 1 || educations.length > 1`) — and merges them into the response. This widens `AutofillResultMessage`'s summary shape, which is why several already-passing `index.test.ts` assertions need their expected object literals extended, not just new tests appended (spelled out exactly in Task 2). (3) The Side Panel renders two new conditional lines based on those values.

**Tech Stack:** Same as the existing scaffold — TypeScript + Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`.
- No network calls anywhere in the codebase.
- **No DOM heuristics for detecting "more Work Experience/Education blocks on the page."** Per the original Work Experience/Education plan's scope decision (still standing), this codebase does not attempt multi-block DOM indexing — it can't be validated without real, varied Workday markup. `hasMoreEntries` is computed purely from stored-data array length (`workExperiences.length > 1`), which is always correct regardless of page structure — it does not claim to know whether the page actually has room for a second entry, only that the user has more than one entry saved and should check.
- No MutationObserver / automatic re-scan on DOM mutation. Per spec §12.3, "用户点击 Autofill 时重新扫描页面" (re-scan on every Autofill click) already satisfies the requirement; the spec explicitly says a fully automatic cross-step run is not needed.
- The highlight effect must not change any field's `value`/`checked` state or interfere with the existing `input`/`change`/`blur` event dispatch order — it is purely a transient visual style applied after those events fire.
- `skipped` counts only fields with `canonicalKey === null || confidence === 'low'` — a `medium`-confidence field (counted in `needsReview`) is not "skipped," it's "needs review." These are two different, already-existing UI concepts; do not conflate them.

---

### Task 1: Highlight a field briefly after filling it

**Files:**
- Modify: `src/content/executor.ts`
- Modify: `src/content/executor.test.ts` (add a test only — do not change the existing tests)

**Interfaces:**
- Produces: `setFieldValue` (private to this module, already called by `autofillFields`/`autofillSectionFields`/`autofillAnswerBankFields`) now also applies and reverts a transient `outline` style on every successful fill. No new exported function — this is an internal behavior change to an existing shared helper, so all three `autofillX` functions get the highlight automatically with no changes to their own code.

- [ ] **Step 1: Write the failing test**

Add this import to the top of `src/content/executor.test.ts` (replacing the existing `import { describe, expect, it } from 'vitest'` line):
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
```

Add this `describe` block to `src/content/executor.test.ts` (after the existing `describe('autofillAnswerBankFields', ...)` block, at the end of the file):
```ts
describe('field highlight on fill', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('briefly highlights a field after filling it, then reverts the style', () => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    const matches = matchFields(scanFields(document))

    autofillFields(matches, profile)

    const element = document.getElementById('firstName') as HTMLInputElement
    expect(element.style.outline).toBe('2px solid #22c55e')

    vi.advanceTimersByTime(1500)

    expect(element.style.outline).toBe('')
  })

  it('does not apply a highlight when a field is not actually filled', () => {
    document.body.innerHTML = '<label for="fn">Given Name</label><input id="fn" name="fn" />'
    const matches = matchFields(scanFields(document))

    autofillFields(matches, profile)

    const element = document.getElementById('fn') as HTMLInputElement
    expect(element.style.outline).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/executor.test.ts`
Expected: FAIL — `element.style.outline` is `''` immediately after `autofillFields`, not `'2px solid #22c55e'` (no highlight logic exists yet). The second new test passes already (nothing to fail), which is fine — it's there to prove the fix doesn't over-apply the highlight.

- [ ] **Step 3: Write minimal implementation**

In `src/content/executor.ts`, add this function above `setFieldValue`:
```ts
function highlightField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): void {
  const originalOutline = element.style.outline
  const originalTransition = element.style.transition
  element.style.transition = 'outline 0.2s ease-in-out'
  element.style.outline = '2px solid #22c55e'
  setTimeout(() => {
    element.style.outline = originalOutline
    element.style.transition = originalTransition
  }, 1500)
}
```

Then modify `setFieldValue` to call it after the existing event dispatches:
```ts
function setFieldValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: FillableValue
): void {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    element.checked = Boolean(value)
  } else {
    element.value = String(value)
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
  highlightField(element)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/executor.test.ts`
Expected: PASS — 14 tests passed (12 existing + 2 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass — confirm all 12 pre-existing `executor.test.ts` tests (which assert on `.value`/`.checked`/`summary`, never `.style`) still pass unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/content/executor.ts src/content/executor.test.ts
git commit -m "feat(content): briefly highlight a field after filling it"
```

---

### Task 2: Extend the autofill result with skipped count and multi-entry flag

**Files:**
- Modify: `src/shared/messaging/messages.ts`
- Modify: `src/content/index.ts`
- Modify: `src/content/index.test.ts` (this task MODIFIES 9 existing test assertions, not just adds new ones — see Interfaces below for why)

**Interfaces:**
- Produces: a new `AutofillResultSummary` type (`extends AutofillSummary` with `skipped: number; hasMoreEntries: boolean`), used as `AutofillResultMessage['summary']`'s type instead of the plain `AutofillSummary`. The existing `AutofillSummary` type itself, and the three `autofillFields`/`autofillSectionFields`/`autofillAnswerBankFields` functions that return it, are UNCHANGED — `skipped`/`hasMoreEntries` are computed once in `content/index.ts`'s `AUTOFILL_PAGE` handler, after the existing `sumSummaries(...)` call, and merged into the final response object. Consumed by Task 3 (Side Panel rendering).
- **Why 9 existing tests need modification, not just new tests:** `AutofillResultMessage`'s `summary` field now has 2 more required properties. Every existing `index.test.ts` test that asserts `expect(response).toEqual({ type: 'AUTOFILL_RESULT', summary: { detected: X, filled: Y, needsReview: Z } })` will now fail `toEqual` (exact match) because the real response also includes `skipped`/`hasMoreEntries`. Every one of those 9 existing fixtures has exactly one field in the page and zero-or-one stored Work Experience/Education entries, so in every case the correct new values are `skipped: 0, hasMoreEntries: false` — verified individually below, not assumed.

- [ ] **Step 1: Write the failing test**

Replace the contents of `src/content/index.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'
import { installChromeStorageMock } from '../../tests/chrome-storage-mock'
import { applicationRecordRepository } from '../shared/storage/application-record-repository'
import { answerBankRepository } from '../shared/storage/answer-bank-repository'
import { educationRepository } from '../shared/storage/education-repository'
import { saveProfile } from '../shared/storage/profile-repository'
import { workExperienceRepository } from '../shared/storage/work-experience-repository'
import type { Profile } from '../shared/types/profile'

const profile: Profile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  country: 'Canada',
  addressLine1: '123 Main St',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M5V 2T6',
  workAuthorizationStatus: 'Citizen',
  sponsorshipRequired: false,
}

describe('content script entry', () => {
  beforeEach(() => {
    vi.resetModules()
    installChromeStorageMock()
    installChromeRuntimeMock()
    document.body.innerHTML = ''
  })

  it('reports isWorkdayPage true when the page has a Workday DOM marker', async () => {
    document.body.innerHTML = '<div data-automation-id="jobPostingHeader"></div>'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'GET_PAGE_STATUS' })

    expect(response).toEqual({ type: 'PAGE_STATUS', isWorkdayPage: true })
  })

  it('reports isWorkdayPage false when the page has no Workday markers', async () => {
    document.body.innerHTML = '<div>Hello</div>'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'GET_PAGE_STATUS' })

    expect(response).toEqual({ type: 'PAGE_STATUS', isWorkdayPage: false })
  })

  it('responds to AUTOFILL_PAGE by filling matched fields from the saved profile', async () => {
    await saveProfile(profile)
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: false },
    })
    expect((document.getElementById('firstName') as HTMLInputElement).value).toBe('Ada')
  })

  it('reports zero filled fields when no profile has been saved yet', async () => {
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 0, needsReview: 0, skipped: 0, hasMoreEntries: false },
    })
  })

  it('still counts medium-confidence matches as needing review when no profile has been saved', async () => {
    // "Given Name" alone (no matching id/name) scores 40 from the label
    // match only — medium confidence, per the same scoring matchFields
    // uses when a profile is saved.
    document.body.innerHTML = '<label for="fn">Given Name</label><input id="fn" name="fn" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 0, needsReview: 1, skipped: 0, hasMoreEntries: false },
    })
  })

  it('fills the first stored work experience entry using section-aware matching', async () => {
    await workExperienceRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      startMonth: 3,
      startYear: 2020,
      currentlyWorking: true,
    })
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
      </section>
    `
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: false },
    })
    expect((document.getElementById('companyName') as HTMLInputElement).value).toBe('Acme')
  })

  it('fills the first stored education entry using section-aware matching', async () => {
    await educationRepository.add({
      id: '1',
      schoolName: 'MIT',
      degree: 'BSc',
      fieldOfStudy: 'Computer Science',
      startYear: 2016,
    })
    document.body.innerHTML = `
      <section>
        <h2>Education</h2>
        <label for="schoolName">School Name</label>
        <input id="schoolName" name="schoolName" />
      </section>
    `
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: false },
    })
    expect((document.getElementById('schoolName') as HTMLInputElement).value).toBe('MIT')
  })

  it('combines personal info and work experience matches into one summary', async () => {
    await saveProfile(profile)
    await workExperienceRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      startMonth: 3,
      startYear: 2020,
      currentlyWorking: true,
    })
    document.body.innerHTML = `
      <label for="firstName">First Name</label><input id="firstName" name="firstName" />
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
      </section>
    `
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 2, filled: 2, needsReview: 0, skipped: 0, hasMoreEntries: false },
    })
  })

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
      summary: { detected: 1, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: false },
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
      summary: { detected: 1, filled: 0, needsReview: 0, skipped: 0, hasMoreEntries: false },
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
      summary: { detected: 2, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: false },
    })
  })

  it('reports a nonzero skipped count for fields that do not match any canonical key', async () => {
    await saveProfile(profile)
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />' +
      '<label for="unrelated">Favorite Color</label><input id="unrelated" name="unrelated" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 1, needsReview: 0, skipped: 1, hasMoreEntries: false },
    })
  })

  it('reports hasMoreEntries true when more than one work experience entry is stored', async () => {
    await workExperienceRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      startMonth: 3,
      startYear: 2020,
      currentlyWorking: true,
    })
    await workExperienceRepository.add({
      id: '2',
      companyName: 'Globex',
      jobTitle: 'Manager',
      startMonth: 1,
      startYear: 2022,
      currentlyWorking: false,
    })
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 0, needsReview: 0, skipped: 0, hasMoreEntries: true },
    })
  })

  it('extracts and saves an application record on SAVE_APPLICATION', async () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'
    document.title = 'Software Engineer - Acme Careers'
    await import('./index')

    const response = (await chrome.tabs.sendMessage(1, {
      type: 'SAVE_APPLICATION',
    })) as { type: string; record: { jobTitle: string; status: string; sourcePlatform: string } }

    expect(response.type).toBe('APPLICATION_SAVED')
    expect(response.record.jobTitle).toBe('Software Engineer')
    expect(response.record.status).toBe('Applied')
    expect(response.record.sourcePlatform).toBe('Workday')

    const saved = await applicationRecordRepository.list()
    expect(saved).toHaveLength(1)
    expect(saved[0].jobTitle).toBe('Software Engineer')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/index.test.ts`
Expected: FAIL — every `AUTOFILL_PAGE` test's `toEqual` assertion fails because the real response is still the old 3-field summary shape (`skipped`/`hasMoreEntries` don't exist in it yet), and the two brand-new tests fail for the same reason.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/shared/messaging/messages.ts`:
```ts
import type { ApplicationRecord } from '../types/application-record'

export interface AutofillSummary {
  detected: number
  filled: number
  needsReview: number
}

export interface AutofillResultSummary extends AutofillSummary {
  skipped: number
  hasMoreEntries: boolean
}

export interface GetPageStatusMessage {
  type: 'GET_PAGE_STATUS'
}

export interface PageStatusMessage {
  type: 'PAGE_STATUS'
  isWorkdayPage: boolean
}

export interface AutofillPageMessage {
  type: 'AUTOFILL_PAGE'
}

export interface AutofillResultMessage {
  type: 'AUTOFILL_RESULT'
  summary: AutofillResultSummary
}

export interface SaveApplicationMessage {
  type: 'SAVE_APPLICATION'
}

export interface ApplicationSavedMessage {
  type: 'APPLICATION_SAVED'
  record: ApplicationRecord
}

export type ExtensionMessage =
  | GetPageStatusMessage
  | PageStatusMessage
  | AutofillPageMessage
  | AutofillResultMessage
  | SaveApplicationMessage
  | ApplicationSavedMessage
```

Replace the contents of `src/content/index.ts`:
```ts
import { getProfile } from '../shared/storage/profile-repository'
import { answerBankRepository } from '../shared/storage/answer-bank-repository'
import { applicationRecordRepository } from '../shared/storage/application-record-repository'
import { educationRepository } from '../shared/storage/education-repository'
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
Expected: PASS — 14 tests passed (12 pre-existing, 9 of which had their expected object literal extended in Step 1, plus 2 brand-new tests).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/messaging/messages.ts src/content/index.ts src/content/index.test.ts
git commit -m "feat(content): report skipped fields and multi-entry flag"
```

---

### Task 3: Side Panel — render the two new messages

**Files:**
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/App.test.tsx` (add tests only — do not change the existing tests)

**Interfaces:**
- Consumes: `AutofillResultMessage['summary']` (now `AutofillResultSummary`, Task 2) — specifically its `skipped`/`hasMoreEntries` fields.
- Produces: two new conditionally-rendered lines in the Side Panel: `"Some fields were skipped."` when `summary.skipped > 0`, and a multi-entry guidance message when `summary.hasMoreEntries` is true.

- [ ] **Step 1: Write the failing test**

Add these two tests to the existing `describe('Side Panel App', ...)` block in `src/sidepanel/App.test.tsx` (after the existing tests, before the closing `})`):
```tsx
  it('shows a "some fields were skipped" message when skipped fields exist', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'AUTOFILL_PAGE') {
          sendResponse({
            type: 'AUTOFILL_RESULT',
            summary: { detected: 1, filled: 1, needsReview: 0, skipped: 2, hasMoreEntries: false },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')
    await user.click(screen.getByRole('button', { name: 'Autofill current page' }))

    expect(await screen.findByText('Some fields were skipped.')).toBeInTheDocument()
  })

  it('shows a guidance message when more than one work experience or education entry is stored', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'AUTOFILL_PAGE') {
          sendResponse({
            type: 'AUTOFILL_RESULT',
            summary: { detected: 1, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: true },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')
    await user.click(screen.getByRole('button', { name: 'Autofill current page' }))

    expect(
      await screen.findByText(
        'If Workday has additional entries to fill, click "Add" on the page for the next Work Experience or Education entry, then click Autofill again.'
      )
    ).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/sidepanel/App.test.tsx`
Expected: FAIL — neither message is rendered yet.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/sidepanel/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type {
  ApplicationSavedMessage,
  AutofillResultMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'

type Status = 'loading' | 'workday-detected' | 'not-workday'

export function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [tabId, setTabId] = useState<number | undefined>(undefined)
  const [summary, setSummary] = useState<AutofillResultMessage['summary'] | undefined>(undefined)
  const [savedRecord, setSavedRecord] = useState<ApplicationSavedMessage['record'] | undefined>(
    undefined
  )

  useEffect(() => {
    let cancelled = false

    async function checkPageStatus() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        if (!cancelled) setStatus('not-workday')
        return
      }
      if (!cancelled) setTabId(tab.id)
      try {
        const response = (await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_PAGE_STATUS',
        })) as PageStatusMessage | undefined
        if (!cancelled) {
          setStatus(response?.isWorkdayPage ? 'workday-detected' : 'not-workday')
        }
      } catch {
        // No content script is listening on this tab — it only injects on
        // *.myworkdayjobs.com, so any other page rejects here rather than
        // resolving. Treat that the same as "not a Workday page".
        if (!cancelled) setStatus('not-workday')
      }
    }

    checkPageStatus()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAutofill() {
    if (!tabId) return
    try {
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: 'AUTOFILL_PAGE',
      })) as AutofillResultMessage | undefined
      if (response?.summary) {
        setSummary(response.summary)
      }
    } catch {
      // The tab may have navigated away or the content script may no longer
      // be listening — nothing to update; the button stays clickable so the
      // user can retry.
    }
  }

  async function handleSaveApplication() {
    if (!tabId) return
    try {
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: 'SAVE_APPLICATION',
      })) as ApplicationSavedMessage | undefined
      if (response?.record) {
        setSavedRecord(response.record)
      }
    } catch {
      // Same as handleAutofill: the tab may have navigated away or the
      // content script may no longer be listening.
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-2">Workday Autofill Assistant</h1>
      {status === 'loading' && <p>Checking current page…</p>}
      {status === 'not-workday' && <p>No Workday page detected.</p>}
      {status === 'workday-detected' && (
        <>
          <p>Workday page detected.</p>
          <button type="button" onClick={handleAutofill}>
            Autofill current page
          </button>
          {summary && (
            <>
              <p>
                Detected {summary.detected} supported fields. Filled {summary.filled} fields.
                {summary.needsReview > 0 ? ` ${summary.needsReview} fields require review.` : ''}
              </p>
              {summary.skipped > 0 && <p>Some fields were skipped.</p>}
              {summary.hasMoreEntries && (
                <p>
                  If Workday has additional entries to fill, click &quot;Add&quot; on the page for
                  the next Work Experience or Education entry, then click Autofill again.
                </p>
              )}
            </>
          )}
          <button type="button" onClick={handleSaveApplication}>
            Save application
          </button>
          {savedRecord && (
            <p>
              Saved application for {savedRecord.jobTitle} at {savedRecord.companyName}.
            </p>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/sidepanel/App.test.tsx`
Expected: PASS — 7 tests passed (5 existing + 2 new). Double-check the actual pre-existing count in the file rather than assuming.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/App.tsx src/sidepanel/App.test.tsx
git commit -m "feat(sidepanel): show skipped-fields and multi-entry messages"
```

---

### Task 4: Manual end-to-end verification in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–3.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Verify the highlight effect on a real Workday page**

In Chrome, reload the unpacked extension at `chrome://extensions` (pointing at `dist`). Navigate to a real Workday application page with at least one autofillable field (refresh the tab so the content script is freshly injected), open the Side Panel, and click "Autofill current page". Verify:
1. Each successfully-filled field briefly shows a green outline that fades away after about 1.5 seconds.
2. The highlight doesn't interfere with the filled value itself — confirm the field's value is still correct after the outline fades.

- [ ] **Step 3: Verify the "skipped" and "multi-entry" messages**

On a Workday page with at least one field your dictionary doesn't recognize (most real pages will have some), confirm "Some fields were skipped." appears in the Side Panel after clicking Autofill. Then, in the Options page, add a second Work Experience entry (so `workExperiences.length > 1`), go back to the Workday page, refresh, and click Autofill again — confirm the multi-entry guidance message now appears alongside the result summary.

- [ ] **Step 4: Report**

No commit for this task — it is verification only. Confirm to the user which checks passed, and describe anything unexpected (e.g. if the highlight color is hard to see against a particular Workday theme, or the messages don't read clearly in context).
