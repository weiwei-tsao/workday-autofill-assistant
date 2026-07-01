# Page Detection & Field Matcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the content-script foundation — Workday page detection wired to a Side Panel UI, plus a Field Scanner and Field Matcher that identify and score form fields — without yet writing any values into the page (that's a later, out-of-scope plan).

**Architecture:** A content script injected on `*.myworkdayjobs.com` detects whether the current page is a Workday application page and answers status queries over `chrome.runtime` messaging. A minimal background service worker configures the Side Panel to open on the toolbar icon click. The Side Panel (a small React app, parallel to the Options page) queries the active tab and displays detection status. Independently, a Field Scanner walks the DOM for fillable fields and a Field Matcher scores each field against a canonical-field dictionary — both are pure, framework-free functions tested against fixture HTML, not yet wired into any UI (that wiring is the Autofill Executor's job in a later plan).

**Tech Stack:** Same as the merged Phase 0+1 scaffold — React 18/19 + TypeScript + Vite + `@crxjs/vite-plugin` + Tailwind + Vitest + `@testing-library/react`. No new dependencies.

## Global Constraints

- Manifest V3. This plan adds `activeTab`, `scripting`, `sidePanel` permissions and `host_permissions: ["*://*.myworkdayjobs.com/*"]` — still no broader host access, per spec §7 ("MVP 应避免申请过宽权限").
- No network calls anywhere in the codebase.
- TypeScript `strict: true`.
- Page detection must satisfy EITHER condition per spec §6.2.1: the hostname matches `*.myworkdayjobs.com`, OR the page contains a Workday-specific DOM marker (`[data-automation-id]`, a real Workday attribute).
- Field Matcher confidence tiers per `docs/implementation.md` §5: score ≥ 60 → `high`; 30–59 → `medium`; < 30 → `low`.
- This plan does not write any values into the page. No autofill execution — that belongs to a later plan (the Autofill Executor).

---

### Task 1: Manifest permissions + stub files for background/content/side panel

**Files:**
- Modify: `manifest.config.ts`
- Create: `src/background/service-worker.ts` (stub, replaced by Task 5)
- Create: `src/content/index.ts` (stub, replaced by Task 4)
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/main.tsx`
- Create: `src/sidepanel/App.tsx` (stub, replaced by Task 6)

**Interfaces:**
- Produces: a `dist/` build with `background.service_worker`, `content_scripts`, and `side_panel.default_path` all present in `dist/manifest.json`, and a Side Panel page loadable in Chrome. Later tasks replace the stub file bodies without touching this task's file list.

- [ ] **Step 1: Update the manifest**

Replace the contents of `manifest.config.ts`:
```ts
import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Workday Autofill Assistant',
  version: pkg.version,
  description:
    'Save your job application profile locally and reuse it across Workday application forms.',
  permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
  host_permissions: ['*://*.myworkdayjobs.com/*'],
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: ['*://*.myworkdayjobs.com/*'],
      js: ['src/content/index.ts'],
    },
  ],
})
```

- [ ] **Step 2: Create stub background and content script files**

`src/background/service-worker.ts`:
```ts
export {}
```

`src/content/index.ts`:
```ts
export {}
```

- [ ] **Step 3: Create the Side Panel entry**

`src/sidepanel/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Workday Autofill Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/sidepanel/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/tailwind.css'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`src/sidepanel/App.tsx`:
```tsx
export function App() {
  return <h1 className="text-lg font-semibold p-4">Workday Autofill Assistant</h1>
}
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: exits 0. `dist/manifest.json` contains:
- `"permissions"` including `"storage"`, `"activeTab"`, `"scripting"`, `"sidePanel"`
- `"host_permissions": ["*://*.myworkdayjobs.com/*"]`
- `"background"` with a `"service_worker"` path
- `"side_panel"` with a `"default_path"`
- `"content_scripts"` with one entry whose `"matches"` is `["*://*.myworkdayjobs.com/*"]`

- [ ] **Step 5: Commit**

```bash
git add manifest.config.ts src/background/service-worker.ts src/content/index.ts \
  src/sidepanel/index.html src/sidepanel/main.tsx src/sidepanel/App.tsx
git commit -m "feat: add manifest permissions and stub files for content script, background, and side panel"
```

---

### Task 2: `chrome.runtime`/`chrome.tabs`/`chrome.sidePanel` test mock

**Files:**
- Create: `tests/chrome-runtime-mock.ts`
- Test: `tests/chrome-runtime-mock.test.ts`

**Interfaces:**
- Produces: `installChromeRuntimeMock(): { triggerInstalled(): void; getSidePanelBehavior(): { openPanelOnActionClick?: boolean } | undefined }` — installs an in-memory fake on `globalThis.chrome` covering `chrome.runtime.onMessage.addListener/removeListener`, `chrome.runtime.onInstalled.addListener`, `chrome.tabs.query`, `chrome.tabs.sendMessage`, and `chrome.sidePanel.setPanelBehavior`. This mock follows the same pattern as `tests/chrome-storage-mock.ts` (replaces `globalThis.chrome` wholesale — do not call both mocks in the same test unless one is extended to merge, which is out of scope here since no task in this plan needs both storage and runtime mocking at once). Consumed by Tasks 4, 5, 6.

- [ ] **Step 1: Write the failing test**

`tests/chrome-runtime-mock.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { installChromeRuntimeMock } from './chrome-runtime-mock'

describe('installChromeRuntimeMock', () => {
  it('delivers chrome.tabs.sendMessage to a chrome.runtime.onMessage listener and returns its response', async () => {
    installChromeRuntimeMock()

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      sendResponse({ echoed: message })
      return true
    })

    const response = await chrome.tabs.sendMessage(1, { hello: 'world' })

    expect(response).toEqual({ echoed: { hello: 'world' } })
  })

  it('resolves undefined when no listener responds', async () => {
    installChromeRuntimeMock()

    const response = await chrome.tabs.sendMessage(1, { hello: 'world' })

    expect(response).toBeUndefined()
  })

  it('records the side panel behavior set on install, triggered via triggerInstalled', async () => {
    const mock = installChromeRuntimeMock()

    chrome.runtime.onInstalled.addListener(() => {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    })
    mock.triggerInstalled()

    expect(mock.getSidePanelBehavior()).toEqual({ openPanelOnActionClick: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chrome-runtime-mock.test.ts`
Expected: FAIL — `Cannot find module './chrome-runtime-mock'`.

- [ ] **Step 3: Write minimal implementation**

`tests/chrome-runtime-mock.ts`:
```ts
type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => void | boolean

export function installChromeRuntimeMock() {
  const messageListeners = new Set<MessageListener>()
  const installedListeners = new Set<() => void>()
  let sidePanelBehavior: { openPanelOnActionClick?: boolean } | undefined

  const runtime = {
    onMessage: {
      addListener(listener: MessageListener) {
        messageListeners.add(listener)
      },
      removeListener(listener: MessageListener) {
        messageListeners.delete(listener)
      },
    },
    onInstalled: {
      addListener(listener: () => void) {
        installedListeners.add(listener)
      },
    },
  }

  const tabs = {
    async query() {
      return [{ id: 1 }]
    },
    async sendMessage(tabId: number, message: unknown) {
      return new Promise((resolve) => {
        let responded = false
        messageListeners.forEach((listener) => {
          listener(message, { tab: { id: tabId } } as chrome.runtime.MessageSender, (response) => {
            responded = true
            resolve(response)
          })
        })
        if (!responded) resolve(undefined)
      })
    },
  }

  const sidePanel = {
    async setPanelBehavior(options: { openPanelOnActionClick?: boolean }) {
      sidePanelBehavior = options
    },
  }

  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { runtime, tabs, sidePanel }

  return {
    triggerInstalled() {
      installedListeners.forEach((listener) => listener())
    },
    getSidePanelBehavior: () => sidePanelBehavior,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chrome-runtime-mock.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add tests/chrome-runtime-mock.ts tests/chrome-runtime-mock.test.ts
git commit -m "test: add chrome.runtime/tabs/sidePanel mock for content script and side panel tests"
```

---

### Task 3: Page Detector

**Files:**
- Create: `src/content/detector.ts`
- Test: `src/content/detector.test.ts`

**Interfaces:**
- Produces: `isWorkdayPage(hostname: string, doc: Document): boolean`. Consumed by Task 4 (content script entry).

- [ ] **Step 1: Write the failing test**

`src/content/detector.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { isWorkdayPage } from './detector'

describe('isWorkdayPage', () => {
  it('returns true when the hostname matches *.myworkdayjobs.com', () => {
    const doc = document.implementation.createHTMLDocument('')
    expect(isWorkdayPage('acme.wd1.myworkdayjobs.com', doc)).toBe(true)
  })

  it('returns true when the page has a Workday automation-id marker, regardless of hostname', () => {
    const doc = document.implementation.createHTMLDocument('')
    doc.body.innerHTML = '<div data-automation-id="jobPostingHeader"></div>'
    expect(isWorkdayPage('careers.example.com', doc)).toBe(true)
  })

  it('returns false for an unrelated hostname with no Workday markers', () => {
    const doc = document.implementation.createHTMLDocument('')
    doc.body.innerHTML = '<div>Hello</div>'
    expect(isWorkdayPage('example.com', doc)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/detector.test.ts`
Expected: FAIL — `Cannot find module './detector'`.

- [ ] **Step 3: Write minimal implementation**

`src/content/detector.ts`:
```ts
const WORKDAY_HOSTNAME_PATTERN = /\.myworkdayjobs\.com$/i

export function isWorkdayPage(hostname: string, doc: Document): boolean {
  if (WORKDAY_HOSTNAME_PATTERN.test(hostname)) return true
  return doc.querySelector('[data-automation-id]') !== null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/detector.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/content/detector.ts src/content/detector.test.ts
git commit -m "feat: add Workday page detector (hostname or DOM marker)"
```

---

### Task 4: Content script entry (message wiring)

**Files:**
- Create: `src/shared/messaging/messages.ts`
- Modify: `src/content/index.ts` (replace stub)
- Test: `src/content/index.test.ts`

**Interfaces:**
- Consumes: `isWorkdayPage` (Task 3), `installChromeRuntimeMock` (Task 2, test-only).
- Produces: `GetPageStatusMessage`, `PageStatusMessage`, `ExtensionMessage` types; a content script that answers `{ type: 'GET_PAGE_STATUS' }` with `{ type: 'PAGE_STATUS', isWorkdayPage: boolean }` over `chrome.runtime.onMessage`. Consumed by Task 6 (Side Panel).

- [ ] **Step 1: Write the failing test**

`src/shared/messaging/messages.ts`:
```ts
export interface GetPageStatusMessage {
  type: 'GET_PAGE_STATUS'
}

export interface PageStatusMessage {
  type: 'PAGE_STATUS'
  isWorkdayPage: boolean
}

export type ExtensionMessage = GetPageStatusMessage | PageStatusMessage
```

`src/content/index.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'

describe('content script entry', () => {
  beforeEach(() => {
    vi.resetModules()
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/index.test.ts`
Expected: FAIL — the stub `export {}` registers no listener, so `chrome.tabs.sendMessage` resolves `undefined`, not the expected object. The assertion `expect(undefined).toEqual({ type: 'PAGE_STATUS', isWorkdayPage: true })` fails.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/index.ts`:
```ts
import type { ExtensionMessage, PageStatusMessage } from '../shared/messaging/messages'
import { isWorkdayPage } from './detector'

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: PageStatusMessage) => void) => {
    if (message.type === 'GET_PAGE_STATUS') {
      sendResponse({
        type: 'PAGE_STATUS',
        isWorkdayPage: isWorkdayPage(location.hostname, document),
      })
      return true
    }
    return undefined
  }
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/index.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/messaging/messages.ts src/content/index.ts src/content/index.test.ts
git commit -m "feat: wire content script to answer page-status queries"
```

---

### Task 5: Background service worker

**Files:**
- Modify: `src/background/service-worker.ts` (replace stub)
- Test: `src/background/service-worker.test.ts`

**Interfaces:**
- Consumes: `installChromeRuntimeMock` (Task 2).
- Produces: a background service worker that calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` on `chrome.runtime.onInstalled`.

- [ ] **Step 1: Write the failing test**

`src/background/service-worker.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'

describe('background service worker', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('enables opening the side panel on toolbar icon click once installed', async () => {
    const mock = installChromeRuntimeMock()
    await import('./service-worker')

    mock.triggerInstalled()

    expect(mock.getSidePanelBehavior()).toEqual({ openPanelOnActionClick: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/background/service-worker.test.ts`
Expected: FAIL — the stub `export {}` never calls `chrome.sidePanel.setPanelBehavior`, so `mock.getSidePanelBehavior()` returns `undefined`, which does not equal `{ openPanelOnActionClick: true }`.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/background/service-worker.ts`:
```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/background/service-worker.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/background/service-worker.ts src/background/service-worker.test.ts
git commit -m "feat: configure side panel to open on toolbar icon click"
```

---

### Task 6: Side Panel `App` (page status display)

**Files:**
- Modify: `src/sidepanel/App.tsx` (replace stub)
- Test: `src/sidepanel/App.test.tsx`

**Interfaces:**
- Consumes: `installChromeRuntimeMock` (Task 2, test-only), `PageStatusMessage` (Task 4).
- Produces: `<App />` rendering one of "Checking current page…", "Workday page detected.", "No Workday page detected." based on the active tab's response to `GET_PAGE_STATUS`.

- [ ] **Step 1: Write the failing test**

`src/sidepanel/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
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

  it('shows "Workday page detected." when the content script reports a Workday page', async () => {
    chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
      return true
    })

    render(<App />)

    expect(await screen.findByText('Workday page detected.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/sidepanel/App.test.tsx`
Expected: FAIL — the stub `App` only renders a static heading, so `screen.findByText('No Workday page detected.')` times out.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/sidepanel/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type { PageStatusMessage } from '../shared/messaging/messages'

type Status = 'loading' | 'workday-detected' | 'not-workday'

export function App() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false

    async function checkPageStatus() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        if (!cancelled) setStatus('not-workday')
        return
      }
      const response = (await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_PAGE_STATUS',
      })) as PageStatusMessage | undefined
      if (!cancelled) {
        setStatus(response?.isWorkdayPage ? 'workday-detected' : 'not-workday')
      }
    }

    checkPageStatus()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-2">Workday Autofill Assistant</h1>
      {status === 'loading' && <p>Checking current page…</p>}
      {status === 'workday-detected' && <p>Workday page detected.</p>}
      {status === 'not-workday' && <p>No Workday page detected.</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/sidepanel/App.test.tsx`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/App.tsx src/sidepanel/App.test.tsx
git commit -m "feat: add Side Panel page-status display"
```

---

### Task 7: Field dictionary

**Files:**
- Create: `src/content/field-dictionary.ts`
- Test: `src/content/field-dictionary.test.ts`

**Interfaces:**
- Produces: `FieldDictionaryEntry { canonicalKey: string; patterns: RegExp[] }`, `FIELD_DICTIONARY: FieldDictionaryEntry[]`. Consumed by Task 9 (Field Matcher).

- [ ] **Step 1: Write the failing test**

`src/content/field-dictionary.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { FIELD_DICTIONARY } from './field-dictionary'

describe('FIELD_DICTIONARY', () => {
  it('maps common label synonyms to their canonical keys', () => {
    const byKey = (key: string) => FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key)

    expect(byKey('firstName')?.patterns.some((p) => p.test('First Name'))).toBe(true)
    expect(byKey('firstName')?.patterns.some((p) => p.test('Given Name'))).toBe(true)
    expect(byKey('lastName')?.patterns.some((p) => p.test('Last Name'))).toBe(true)
    expect(byKey('lastName')?.patterns.some((p) => p.test('Family Name'))).toBe(true)
    expect(byKey('email')?.patterns.some((p) => p.test('Email Address'))).toBe(true)
    expect(byKey('phone')?.patterns.some((p) => p.test('Phone Number'))).toBe(true)
    expect(byKey('linkedinUrl')?.patterns.some((p) => p.test('LinkedIn Profile'))).toBe(true)
    expect(byKey('postalCode')?.patterns.some((p) => p.test('Postal Code'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: FAIL — `Cannot find module './field-dictionary'`.

- [ ] **Step 3: Write minimal implementation**

`src/content/field-dictionary.ts`:
```ts
export interface FieldDictionaryEntry {
  canonicalKey: string
  patterns: RegExp[]
}

export const FIELD_DICTIONARY: FieldDictionaryEntry[] = [
  { canonicalKey: 'firstName', patterns: [/first\s*name/i, /given\s*name/i] },
  { canonicalKey: 'lastName', patterns: [/last\s*name/i, /family\s*name/i, /surname/i] },
  { canonicalKey: 'email', patterns: [/email/i] },
  { canonicalKey: 'phone', patterns: [/phone/i, /mobile/i] },
  { canonicalKey: 'linkedinUrl', patterns: [/linkedin/i] },
  { canonicalKey: 'postalCode', patterns: [/postal\s*code/i, /zip\s*code/i, /\bzip\b/i] },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/content/field-dictionary.ts src/content/field-dictionary.test.ts
git commit -m "feat: add field dictionary mapping label synonyms to canonical keys"
```

---

### Task 8: Field Scanner

**Files:**
- Create: `src/content/scanner.ts`
- Test: `src/content/scanner.test.ts`

**Interfaces:**
- Produces: `ScannedField { element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; labelText: string; ariaLabel: string; placeholder: string; name: string; id: string }`, `scanFields(doc?: Document): ScannedField[]`. Consumed by Task 9 (Field Matcher).

- [ ] **Step 1: Write the failing test**

`src/content/scanner.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { scanFields } from './scanner'

describe('scanFields', () => {
  it('collects labelled text inputs with their label, name, and id', () => {
    document.body.innerHTML = `
      <form>
        <label for="firstName">First Name</label>
        <input id="firstName" name="legalName--firstName" type="text" />
        <label for="email">Email Address</label>
        <input id="email" name="email" type="email" />
      </form>
    `

    const fields = scanFields(document)

    expect(fields).toHaveLength(2)
    expect(fields[0]).toMatchObject({
      labelText: 'First Name',
      name: 'legalName--firstName',
      id: 'firstName',
    })
    expect(fields[1]).toMatchObject({
      labelText: 'Email Address',
      name: 'email',
      id: 'email',
    })
  })

  it('falls back to aria-label and placeholder when there is no associated label', () => {
    document.body.innerHTML = `
      <input id="phone" aria-label="Phone Number" placeholder="555-0100" type="tel" />
    `

    const fields = scanFields(document)

    expect(fields).toHaveLength(1)
    expect(fields[0]).toMatchObject({
      labelText: '',
      ariaLabel: 'Phone Number',
      placeholder: '555-0100',
    })
  })

  it('includes textarea, select, checkbox, and radio fields', () => {
    document.body.innerHTML = `
      <textarea aria-label="Description"></textarea>
      <select aria-label="Country"><option value="ca">Canada</option></select>
      <input type="checkbox" aria-label="Currently working here" />
      <input type="radio" aria-label="Remote" />
    `

    const fields = scanFields(document)

    expect(fields.map((f) => f.ariaLabel)).toEqual([
      'Description',
      'Country',
      'Currently working here',
      'Remote',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/scanner.test.ts`
Expected: FAIL — `Cannot find module './scanner'`.

- [ ] **Step 3: Write minimal implementation**

`src/content/scanner.ts`:
```ts
export interface ScannedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  labelText: string
  ariaLabel: string
  placeholder: string
  name: string
  id: string
}

const FIELD_SELECTOR =
  'input[type="text"], input[type="email"], input[type="tel"], input:not([type]), ' +
  'textarea, select, input[type="checkbox"], input[type="radio"]'

function findLabelText(element: Element, doc: Document): string {
  const id = element.getAttribute('id')
  if (id) {
    const label = doc.querySelector(`label[for="${id}"]`)
    if (label?.textContent) return label.textContent.trim()
  }
  const parentLabel = element.closest('label')
  if (parentLabel?.textContent) return parentLabel.textContent.trim()
  return ''
}

export function scanFields(doc: Document = document): ScannedField[] {
  const elements = Array.from(
    doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      FIELD_SELECTOR
    )
  )

  return elements.map((element) => ({
    element,
    labelText: findLabelText(element, doc),
    ariaLabel: element.getAttribute('aria-label') ?? '',
    placeholder: element.getAttribute('placeholder') ?? '',
    name: element.getAttribute('name') ?? '',
    id: element.getAttribute('id') ?? '',
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/scanner.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/content/scanner.ts src/content/scanner.test.ts
git commit -m "feat: add field scanner collecting label/aria/placeholder/name/id context"
```

---

### Task 9: Field Matcher

**Files:**
- Create: `src/content/matcher.ts`
- Test: `src/content/matcher.test.ts`

**Interfaces:**
- Consumes: `FIELD_DICTIONARY` (Task 7), `ScannedField`/`scanFields` (Task 8).
- Produces: `ConfidenceLevel = 'high' | 'medium' | 'low'`, `FieldMatch { field: ScannedField; canonicalKey: string | null; score: number; confidence: ConfidenceLevel }`, `matchField(field: ScannedField): FieldMatch`, `matchFields(fields: ScannedField[]): FieldMatch[]`. This is the last task in this plan — no later task consumes these yet (the Autofill Executor, which does, is out of scope here).

- [ ] **Step 1: Write the failing test**

`src/content/matcher.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { matchField, matchFields } from './matcher'
import { scanFields } from './scanner'

function scanField(html: string) {
  document.body.innerHTML = html
  return scanFields(document)[0]
}

describe('matchField', () => {
  it('matches a labelled input whose id also matches the pattern at high confidence', () => {
    const field = scanField(
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    )

    const match = matchField(field)

    expect(match.canonicalKey).toBe('firstName')
    expect(match.confidence).toBe('high')
  })

  it('matches "Given Name" as firstName from the label alone, at medium confidence', () => {
    const field = scanField('<label for="fn">Given Name</label><input id="fn" name="fn" />')

    const match = matchField(field)

    expect(match.canonicalKey).toBe('firstName')
    expect(match.confidence).toBe('medium')
  })

  it('matches "Postal Code" via aria-label alone at medium confidence', () => {
    const field = scanField('<input aria-label="Postal Code" />')

    const match = matchField(field)

    expect(match.canonicalKey).toBe('postalCode')
    expect(match.confidence).toBe('medium')
  })

  it('returns low confidence and no canonical key for an unrecognized field', () => {
    const field = scanField('<label for="x">Favorite Color</label><input id="x" name="x" />')

    const match = matchField(field)

    expect(match.canonicalKey).toBeNull()
    expect(match.confidence).toBe('low')
  })
})

describe('matchFields', () => {
  it('matches every field in a small form', () => {
    document.body.innerHTML = `
      <label for="fn">First Name</label><input id="fn" name="fn" />
      <label for="ln">Last Name</label><input id="ln" name="ln" />
      <label for="em">Email Address</label><input id="em" name="em" type="email" />
    `
    const fields = scanFields(document)

    const matches = matchFields(fields)

    expect(matches.map((m) => m.canonicalKey)).toEqual(['firstName', 'lastName', 'email'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/matcher.test.ts`
Expected: FAIL — `Cannot find module './matcher'`.

- [ ] **Step 3: Write minimal implementation**

`src/content/matcher.ts`:
```ts
import { FIELD_DICTIONARY } from './field-dictionary'
import type { ScannedField } from './scanner'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface FieldMatch {
  field: ScannedField
  canonicalKey: string | null
  score: number
  confidence: ConfidenceLevel
}

function scoreAgainstEntry(field: ScannedField, patterns: RegExp[]): number {
  let score = 0
  if (patterns.some((pattern) => pattern.test(field.labelText))) score += 40
  if (patterns.some((pattern) => pattern.test(field.ariaLabel))) score += 35
  if (patterns.some((pattern) => pattern.test(field.name) || pattern.test(field.id))) score += 25
  if (patterns.some((pattern) => pattern.test(field.placeholder))) score += 20
  return score
}

function confidenceFor(score: number): ConfidenceLevel {
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

export function matchField(field: ScannedField): FieldMatch {
  let bestKey: string | null = null
  let bestScore = 0

  for (const entry of FIELD_DICTIONARY) {
    const score = scoreAgainstEntry(field, entry.patterns)
    if (score > bestScore) {
      bestScore = score
      bestKey = entry.canonicalKey
    }
  }

  return {
    field,
    canonicalKey: bestScore > 0 ? bestKey : null,
    score: bestScore,
    confidence: confidenceFor(bestScore),
  }
}

export function matchFields(fields: ScannedField[]): FieldMatch[] {
  return fields.map(matchField)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/matcher.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all test files pass (this plan's 8 new test files plus every test file from the merged Phase 0+1 scaffold), 0 failures.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/content/matcher.ts src/content/matcher.test.ts
git commit -m "feat: add field matcher with confidence scoring"
```

---

### Task 10: Manual end-to-end verification of page detection in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–9.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Load the unpacked extension**

In Chrome, go to `chrome://extensions`, reload the unpacked extension (or "Load unpacked" pointing at `dist` if not already loaded).

- [ ] **Step 3: Verify on a non-Workday page**

Open any regular website (e.g. `https://example.com`) in a new tab. Click the extension's toolbar icon — the Side Panel should open (via the background worker's `openPanelOnActionClick` behavior) and show "No Workday page detected."

- [ ] **Step 4: Verify on a Workday page (if you have access to one)**

If you have access to a real Workday careers application page (URL containing `myworkdayjobs.com`), open it and click the toolbar icon. The Side Panel should show "Workday page detected." If you don't have access to one, this step can be skipped — Tasks 3 and 4's automated tests already cover the detection logic against both the hostname and DOM-marker conditions.

- [ ] **Step 5: Report**

No commit for this task — it is verification only. Confirm to the user that both checks passed (or note which were skipped and why).
