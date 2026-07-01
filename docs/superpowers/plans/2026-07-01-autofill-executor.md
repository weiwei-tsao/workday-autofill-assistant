# Autofill Executor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write high-confidence field matches into the current Workday page (with proper `input`/`change`/`blur` event dispatch), triggered by a Side Panel "Autofill current page" button that shows a result summary.

**Architecture:** A new `autofillFields` function in the content script writes values for `high`-confidence matches only (reading the saved `Profile` via the existing `profile-repository`), counts `medium`-confidence matches as "needs review" without touching them, and ignores everything else. The content script wires this into its existing message listener as a new `AUTOFILL_PAGE` message, alongside the existing `GET_PAGE_STATUS` handler. The Side Panel gains a button that sends this message to the active tab and renders the returned summary. One piece of shared test infrastructure needs a small fix first: the two existing `chrome.*` mocks (`chrome-storage-mock.ts`, `chrome-runtime-mock.ts`) both currently overwrite `globalThis.chrome` wholesale, so a test that needs both `chrome.storage` (to read the saved Profile) and `chrome.runtime`/`chrome.tabs` (to receive the message) at once — which this plan's content-script test does — can't use them together yet.

**Tech Stack:** Same as the existing scaffold — React + TypeScript + Vite + Vitest + `@testing-library/react`. No new dependencies.

## Global Constraints

- TypeScript `strict: true`.
- No network calls anywhere in the codebase.
- Only `high`-confidence field matches (score ≥ 60, per the existing `matcher.ts`) are auto-filled. `medium`-confidence matches (30–59) are counted as "needs review" but never written to. `low`-confidence and unmatched fields (`canonicalKey: null`) are ignored entirely — this plan does not add a confirmation UI for medium-confidence fields (per `docs/implementation.md` §12.2, that's future scope).
- After writing a field's value, dispatch `input`, `change`, and `blur` DOM events in that order (`bubbles: true`), per spec §6.4.1, so Workday's own front-end framework picks up the change.
- Content scripts must read the saved Profile through the existing `getProfile()` in `src/shared/storage/profile-repository.ts` — never call `chrome.storage.local` directly from content-script code (per this project's `.claude/rules/architecture.md`: "`src/shared/storage/` is the only layer allowed to call `chrome.storage.local`").
- If no Profile has been saved yet, autofill must not crash — it should report the scan results with `filled: 0` and let the user continue.
- Sensitive-field handling (skipping gender/race/disability/etc. fields) is explicitly out of scope for this plan — the current field dictionary only has basic identity fields (firstName/lastName/email/phone/linkedinUrl/postalCode), none of which are sensitive categories, so sensitive-field classification is a separate, later plan (`docs/implementation.md` Phase 6).

---

### Task 1: Let `chrome.storage` and `chrome.runtime` mocks coexist in the same test

**Files:**
- Modify: `tests/chrome-storage-mock.ts`
- Modify: `tests/chrome-runtime-mock.ts`
- Create: `tests/chrome-mock-composition.test.ts`

**Interfaces:**
- Produces: `installChromeStorageMock()` and `installChromeRuntimeMock()` can now both be called in the same test (in either order) without one overwriting the other's setup on `globalThis.chrome`. No signature changes — both functions keep their existing return types. Consumed by Task 3, which needs both mocks at once.

- [ ] **Step 1: Write the failing test**

`tests/chrome-mock-composition.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { installChromeRuntimeMock } from './chrome-runtime-mock'
import { installChromeStorageMock } from './chrome-storage-mock'

describe('chrome mock composition', () => {
  it('lets storage and runtime mocks coexist when storage is installed first', async () => {
    installChromeStorageMock()
    installChromeRuntimeMock()

    await chrome.storage.local.set({ hello: 'world' })
    expect(await chrome.storage.local.get('hello')).toEqual({ hello: 'world' })

    chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      sendResponse({ ok: true })
      return true
    })
    expect(await chrome.tabs.sendMessage(1, { type: 'PING' })).toEqual({ ok: true })
  })

  it('lets storage and runtime mocks coexist when runtime is installed first', async () => {
    installChromeRuntimeMock()
    installChromeStorageMock()

    await chrome.storage.local.set({ a: 1 })
    expect(await chrome.storage.local.get('a')).toEqual({ a: 1 })

    chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      sendResponse({ ok: true })
      return true
    })
    expect(await chrome.tabs.sendMessage(1, { type: 'PING' })).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chrome-mock-composition.test.ts`
Expected: FAIL — in the first test, `installChromeRuntimeMock()` (called second) currently replaces `globalThis.chrome` wholesale, so `chrome.storage` is gone by the time `chrome.storage.local.set` runs; in the second test, `installChromeStorageMock()` (called second) wipes out `chrome.runtime`/`chrome.tabs`. Both fail with something like "Cannot read properties of undefined (reading 'local')" or "(reading 'onMessage')".

- [ ] **Step 3: Write minimal implementation**

In `tests/chrome-storage-mock.ts`, change the final assignment line from:
```ts
  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { storage: { local, onChanged } }
```
to:
```ts
  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { ...(globalThis.chrome ?? {}), storage: { local, onChanged } }
```

In `tests/chrome-runtime-mock.ts`, change the final assignment line from:
```ts
  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { runtime, tabs, sidePanel }
```
to:
```ts
  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { ...(globalThis.chrome ?? {}), runtime, tabs, sidePanel }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chrome-mock-composition.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: all existing test files still pass (23 files, 47 tests, plus this task's new file), 0 failures — this change is additive (spreading the previous `globalThis.chrome` instead of discarding it), so no existing single-mock test should be affected.

- [ ] **Step 6: Commit**

```bash
git add tests/chrome-storage-mock.ts tests/chrome-runtime-mock.ts tests/chrome-mock-composition.test.ts
git commit -m "fix(test): let chrome storage and runtime mocks compose in one test"
```

---

### Task 2: Autofill Executor

**Files:**
- Create: `src/content/executor.ts`
- Test: `src/content/executor.test.ts`

**Interfaces:**
- Consumes: `FieldMatch`/`ConfidenceLevel` (existing `src/content/matcher.ts`), `Profile` (existing `src/shared/types/profile.ts`), `scanFields`/`matchFields` (existing, test-only, to build realistic `FieldMatch[]` inputs).
- Produces: `AutofillSummary { detected: number; filled: number; needsReview: number }`, `autofillFields(matches: FieldMatch[], profile: Profile): AutofillSummary`. Consumed by Task 3 (content script wiring) and referenced by Task 3's message types.

- [ ] **Step 1: Write the failing test**

`src/content/executor.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import type { Profile } from '../shared/types/profile'
import { autofillFields } from './executor'
import { matchFields } from './matcher'
import { scanFields } from './scanner'

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
  linkedinUrl: 'https://linkedin.com/in/ada',
  workAuthorizationStatus: 'Citizen',
  sponsorshipRequired: false,
}

describe('autofillFields', () => {
  it('fills high-confidence matched fields and dispatches input/change/blur events', () => {
    document.body.innerHTML = `
      <label for="firstName">First Name</label><input id="firstName" name="firstName" />
      <label for="email">Email Address</label><input id="email" name="email" type="email" />
    `
    const matches = matchFields(scanFields(document))

    const firstNameInput = document.getElementById('firstName') as HTMLInputElement
    const events: string[] = []
    firstNameInput.addEventListener('input', () => events.push('input'))
    firstNameInput.addEventListener('change', () => events.push('change'))
    firstNameInput.addEventListener('blur', () => events.push('blur'))

    const summary = autofillFields(matches, profile)

    expect(firstNameInput.value).toBe('Ada')
    expect((document.getElementById('email') as HTMLInputElement).value).toBe('ada@example.com')
    expect(events).toEqual(['input', 'change', 'blur'])
    expect(summary).toEqual({ detected: 2, filled: 2, needsReview: 0 })
  })

  it('does not fill medium-confidence fields, counting them as needing review instead', () => {
    document.body.innerHTML = '<label for="fn">Given Name</label><input id="fn" name="fn" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillFields(matches, profile)

    expect((document.getElementById('fn') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 1 })
  })

  it('does not count or fill fields with no canonical key match', () => {
    document.body.innerHTML = '<label for="x">Favorite Color</label><input id="x" name="x" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillFields(matches, profile)

    expect(summary).toEqual({ detected: 0, filled: 0, needsReview: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/executor.test.ts`
Expected: FAIL — `Cannot find module './executor'`.

- [ ] **Step 3: Write minimal implementation**

`src/content/executor.ts`:
```ts
import type { Profile } from '../shared/types/profile'
import type { FieldMatch } from './matcher'

export interface AutofillSummary {
  detected: number
  filled: number
  needsReview: number
}

function setFieldValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): void {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
}

export function autofillFields(matches: FieldMatch[], profile: Profile): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.canonicalKey === null) continue
    detected++

    if (match.confidence === 'high') {
      const value = profile[match.canonicalKey as keyof Profile]
      if (typeof value === 'string' && value.length > 0) {
        setFieldValue(match.field.element, value)
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
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/content/executor.ts src/content/executor.test.ts
git commit -m "feat(content): add autofill executor writing high-confidence matches"
```

---

### Task 3: Wire `AUTOFILL_PAGE` into the content script

**Files:**
- Modify: `src/shared/messaging/messages.ts`
- Modify: `src/content/index.ts`
- Modify: `src/content/index.test.ts`

**Interfaces:**
- Consumes: `AutofillSummary`/`autofillFields` (Task 2), `getProfile` (existing `src/shared/storage/profile-repository.ts`), `scanFields`/`matchFields` (existing), `installChromeStorageMock` + `installChromeRuntimeMock` composing together (Task 1).
- Produces: `AutofillPageMessage { type: 'AUTOFILL_PAGE' }`, `AutofillResultMessage { type: 'AUTOFILL_RESULT'; summary: AutofillSummary }` added to `ExtensionMessage`. The content script now answers `AUTOFILL_PAGE` in addition to the existing `GET_PAGE_STATUS`. Consumed by Task 4 (Side Panel).

- [ ] **Step 1: Write the failing test**

Replace the contents of `src/shared/messaging/messages.ts`:
```ts
import type { AutofillSummary } from '../../content/executor'

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
  summary: AutofillSummary
}

export type ExtensionMessage =
  | GetPageStatusMessage
  | PageStatusMessage
  | AutofillPageMessage
  | AutofillResultMessage
```

Replace the contents of `src/content/index.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'
import { installChromeStorageMock } from '../../tests/chrome-storage-mock'
import { saveProfile } from '../shared/storage/profile-repository'
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
      summary: { detected: 1, filled: 1, needsReview: 0 },
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
      summary: { detected: 1, filled: 0, needsReview: 0 },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/index.test.ts`
Expected: FAIL — the current `index.ts` only handles `GET_PAGE_STATUS`; `AUTOFILL_PAGE` falls through its `return undefined` branch, so `chrome.tabs.sendMessage` resolves `undefined` instead of an `AUTOFILL_RESULT`. The first two (pre-existing) tests still pass; the two new ones fail.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/index.ts`:
```ts
import { getProfile } from '../shared/storage/profile-repository'
import type {
  AutofillResultMessage,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
import { isWorkdayPage } from './detector'
import { autofillFields } from './executor'
import { matchFields } from './matcher'
import { scanFields } from './scanner'

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
      getProfile().then((profile) => {
        const matches = matchFields(scanFields(document))
        const summary = profile
          ? autofillFields(matches, profile)
          : {
              detected: matches.filter((match) => match.canonicalKey !== null).length,
              filled: 0,
              needsReview: 0,
            }
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
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/messaging/messages.ts src/content/index.ts src/content/index.test.ts
git commit -m "feat(content): wire AUTOFILL_PAGE message to run the executor"
```

---

### Task 4: Side Panel "Autofill current page" button

**Files:**
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/App.test.tsx`

**Interfaces:**
- Consumes: `AutofillResultMessage` (Task 3, in `src/shared/messaging/messages.ts`).
- Produces: an "Autofill current page" button visible only when `status === 'workday-detected'`, which sends `AUTOFILL_PAGE` to the active tab and renders "Detected N supported fields. Filled M fields." (plus "K fields require review." when `needsReview > 0`). This is the last task with automated tests in this plan — Task 5 is manual browser verification.

- [ ] **Step 1: Write the failing test**

Replace the contents of `src/sidepanel/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'
import { App } from './App'

describe('Side Panel App', () => {
  beforeEach(() => {
    installChromeRuntimeMock()
  })

  it('shows "No Workday page detected." when nothing responds to the status query', async () => {
    render(<App />)

    expect(await screen.findByText('No Workday page detected.')).toBeInTheDocument()
  })

  it('shows "No Workday page detected." when no content script is listening on the tab (sendMessage rejects)', async () => {
    vi.spyOn(chrome.tabs, 'sendMessage').mockRejectedValueOnce(
      new Error('Could not establish connection. Receiving end does not exist.')
    )

    render(<App />)

    expect(await screen.findByText('No Workday page detected.')).toBeInTheDocument()
  })

  it('shows "Workday page detected." when the content script reports a Workday page', async () => {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        }
      }
      return true
    })

    render(<App />)

    expect(await screen.findByText('Workday page detected.')).toBeInTheDocument()
  })

  it('runs autofill and displays the result summary when the button is clicked', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'AUTOFILL_PAGE') {
          sendResponse({
            type: 'AUTOFILL_RESULT',
            summary: { detected: 3, filled: 2, needsReview: 1 },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')

    await user.click(screen.getByRole('button', { name: 'Autofill current page' }))

    expect(
      await screen.findByText('Detected 3 supported fields. Filled 2 fields. 1 fields require review.')
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/sidepanel/App.test.tsx`
Expected: FAIL — the current `App` has no "Autofill current page" button, so `screen.getByRole('button', { name: 'Autofill current page' })` throws.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/sidepanel/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type { AutofillResultMessage, PageStatusMessage } from '../shared/messaging/messages'

type Status = 'loading' | 'workday-detected' | 'not-workday'

export function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [tabId, setTabId] = useState<number | undefined>(undefined)
  const [summary, setSummary] = useState<AutofillResultMessage['summary'] | undefined>(undefined)

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
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: 'AUTOFILL_PAGE',
    })) as AutofillResultMessage
    setSummary(response.summary)
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
            <p>
              Detected {summary.detected} supported fields. Filled {summary.filled} fields.
              {summary.needsReview > 0 ? ` ${summary.needsReview} fields require review.` : ''}
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
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/App.tsx src/sidepanel/App.test.tsx
git commit -m "feat(sidepanel): add autofill button and result summary"
```

---

### Task 5: Manual end-to-end verification of autofill in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–4.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Load the unpacked extension and save a Profile**

In Chrome, reload the unpacked extension at `chrome://extensions` (pointing at `dist` if not already loaded). Open the extension's Options page and fill in and save a Personal Info profile (first name, last name, email, phone, postal code, and optionally a LinkedIn URL) — these are the fields this plan's dictionary recognizes.

- [ ] **Step 3: Verify on a real Workday application page**

Navigate to a real Workday application form page (a URL containing `myworkdayjobs.com`) that has visible First Name / Last Name / Email / Phone fields, and make sure the tab is freshly loaded (refresh it) so the content script is actually injected. Click the extension's toolbar icon to open the Side Panel — it should show "Workday page detected." and an "Autofill current page" button.

- [ ] **Step 4: Run autofill**

Click "Autofill current page". Verify:
1. The matched fields (First Name, Last Name, Email, Phone, and Postal Code / LinkedIn if present) get filled with the saved Profile's values.
2. Workday's own UI reacts to the fill (e.g. any "required field" red-outline/error styling clears, since the dispatched `input`/`change`/`blur` events should trigger Workday's own validation listeners).
3. The Side Panel shows a summary line like "Detected N supported fields. Filled M fields." (and "K fields require review." if any medium-confidence fields were found).

- [ ] **Step 5: Report**

No commit for this task — it is verification only. Confirm to the user which checks passed, and describe any field that didn't fill as expected (e.g. a field Workday renders in a way this plan's scanner/matcher doesn't yet recognize — that's expected and fine to note as future scope, not a blocker).
