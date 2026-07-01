# Scaffold & Profile Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Chrome MV3 extension build pipeline and deliver a fully working Options page where a user can create, edit, and delete their Personal Info, Work Experience, Education, and Answer Bank data, persisted to `chrome.storage.local`.

**Architecture:** Vite + `@crxjs/vite-plugin` builds a Manifest V3 extension. The Options page is a React 18 + TypeScript app. A generic `list-repository` wraps `chrome.storage.local` for CRUD on array-shaped entities (Work Experience, Education, Answer Bank); a dedicated `profile-repository` wraps it for the single Profile object. React hooks (`useProfile`, `useStorageList`) subscribe to `chrome.storage.onChanged` so any tab editing data stays in sync. No content script, background worker, or Side Panel is built in this plan — those belong to later plans.

**Tech Stack:** React 18, TypeScript, Vite, `@crxjs/vite-plugin`, Tailwind CSS, react-hook-form, zod, Vitest, @testing-library/react, @testing-library/user-event.

## Global Constraints

- Manifest V3 only. This plan's manifest requests only the `storage` permission — no `activeTab`, `scripting`, or `host_permissions` (those are added when the content script plan introduces Workday page access), per spec §7 "MVP 应避免申请过宽权限".
- No network calls anywhere in this codebase. All persistence is local via `chrome.storage.local`, per spec §6.7.1/§6.7.2/§9.1.
- TypeScript `strict: true` everywhere.
- Work Experience and Education support unlimited entries in storage/UI (spec's "至少 3 段" / "至少 2 段" are minimums the UI must not block, not caps to enforce).
- Answer Bank entries marked `isSensitive: true` must default `autoFillEnabled: false`, and the UI must force this whenever the sensitive checkbox is checked, per spec §6.1.4/§6.5.2.
- Every storage-backed React hook must re-read from `chrome.storage.local` on `chrome.storage.onChanged`, not just on mount.

---

### Task 1: Initialize npm project & install dependencies

**Files:**
- Create: `package.json`
- Modify: `package.json` (add `scripts` and `"type": "module"`)

**Interfaces:**
- Produces: an npm project with all dependencies this entire plan needs already installed, so no later task runs `npm install`.

- [ ] **Step 1: Initialize the project**

Run: `cd /Users/bule-station/Documents/Repositories/workday-autofill-assistant && npm init -y`
Expected: `package.json` is created in the project root.

- [ ] **Step 2: Install runtime dependencies**

Run:
```bash
npm install react react-dom react-hook-form @hookform/resolvers zod
```
Expected: command exits 0; `react`, `react-dom`, `react-hook-form`, `@hookform/resolvers`, `zod` appear under `"dependencies"` in `package.json`.

- [ ] **Step 3: Install dev dependencies**

Run:
```bash
npm install -D typescript vite @vitejs/plugin-react @crxjs/vite-plugin@beta \
  tailwindcss@3 postcss autoprefixer @types/react @types/react-dom @types/chrome \
  vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Expected: command exits 0; all listed packages appear under `"devDependencies"` in `package.json`.

- [ ] **Step 4: Add scripts and module type**

Edit `package.json` so it contains:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```
(Merge these keys into the existing generated `package.json` — keep the `dependencies`/`devDependencies` npm already wrote.)

- [ ] **Step 5: Verify install integrity**

Run: `npm ls --depth=0`
Expected: exits 0 with no "UNMET DEPENDENCY" or "invalid" lines.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: initialize npm project with extension toolchain dependencies"
```

---

### Task 2: Configure Vite + CRXJS manifest + Tailwind, minimal Options shell

**Files:**
- Create: `tsconfig.json`
- Create: `manifest.config.ts`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/styles/tailwind.css`
- Create: `src/options/index.html`
- Create: `src/options/main.tsx`
- Create: `src/options/App.tsx`
- Create: `.gitignore`

**Interfaces:**
- Consumes: dependencies installed in Task 1.
- Produces: a `dist/` build loadable as a Chrome unpacked extension, with an Options page reachable and rendering `<App />`. Task 16 later modifies `src/options/App.tsx`.

- [ ] **Step 1: Add `.gitignore`**

```text
node_modules
dist
.DS_Store
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["chrome", "vite/client"]
  },
  "include": ["src", "tests", "vite.config.ts", "manifest.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Write `manifest.config.ts`**

```ts
import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Workday Autofill Assistant',
  version: pkg.version,
  description:
    'Save your job application profile locally and reuse it across Workday application forms.',
  permissions: ['storage'],
  options_page: 'src/options/index.html',
})
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
})
```

- [ ] **Step 5: Write Tailwind config**

`postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

`src/styles/tailwind.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Write the minimal Options shell**

`src/options/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Workday Autofill Assistant — Profile</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/options/App.tsx`:
```tsx
export function App() {
  return <h1 className="text-xl font-semibold p-6">Workday Autofill Assistant</h1>
}
```

`src/options/main.tsx`:
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

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: exits 0; `dist/manifest.json` exists and contains `"options_page"` pointing at the built options HTML.

- [ ] **Step 8: Manually load the extension**

In Chrome, open `chrome://extensions`, enable "Developer mode", click "Load unpacked", select the `dist` folder. Click "Details" on the loaded extension, then "Extension options". Confirm the page shows the heading "Workday Autofill Assistant".

- [ ] **Step 9: Commit**

```bash
git add tsconfig.json manifest.config.ts vite.config.ts tailwind.config.ts postcss.config.js \
  src/styles/tailwind.css src/options/index.html src/options/main.tsx src/options/App.tsx .gitignore
git commit -m "feat: scaffold MV3 extension build with minimal options page"
```

---

### Task 3: Set up Vitest test harness + chrome.storage mock

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/chrome-storage-mock.ts`
- Create: `tests/chrome-storage-mock.test.ts`

**Interfaces:**
- Produces: `installChromeStorageMock(): void` — installs an in-memory fake on `globalThis.chrome` with `chrome.storage.local.get(key)`, `chrome.storage.local.set(items)`, and `chrome.storage.onChanged.addListener/removeListener`. Every later test that touches storage calls this in `beforeEach`.

- [ ] **Step 1: Write the failing test**

`tests/chrome-storage-mock.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { installChromeStorageMock } from './chrome-storage-mock'

describe('installChromeStorageMock', () => {
  it('provides an in-memory chrome.storage.local that round-trips values', async () => {
    installChromeStorageMock()

    await chrome.storage.local.set({ hello: 'world' })
    const result = await chrome.storage.local.get('hello')

    expect(result).toEqual({ hello: 'world' })
  })

  it('notifies onChanged listeners when a value is set', async () => {
    installChromeStorageMock()
    const received: Array<Record<string, chrome.storage.StorageChange>> = []
    chrome.storage.onChanged.addListener((changes) => received.push(changes))

    await chrome.storage.local.set({ counter: 1 })

    expect(received).toEqual([{ counter: { oldValue: undefined, newValue: 1 } }])
  })
})
```

- [ ] **Step 2: Add config so the test can even run, then verify it fails**

`vitest.config.ts`:
```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
```

`tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

Run: `npx vitest run tests/chrome-storage-mock.test.ts`
Expected: FAIL — `Cannot find module './chrome-storage-mock'` (file does not exist yet).

- [ ] **Step 3: Implement the mock**

`tests/chrome-storage-mock.ts`:
```ts
type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void

export function installChromeStorageMock() {
  const store = new Map<string, unknown>()
  const listeners = new Set<StorageChangeListener>()

  const local = {
    async get(key: string) {
      return { [key]: store.get(key) }
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, chrome.storage.StorageChange> = {}
      for (const [key, newValue] of Object.entries(items)) {
        changes[key] = { oldValue: store.get(key), newValue }
        store.set(key, newValue)
      }
      listeners.forEach((listener) => listener(changes, 'local'))
    },
  }

  const onChanged = {
    addListener(listener: StorageChangeListener) {
      listeners.add(listener)
    },
    removeListener(listener: StorageChangeListener) {
      listeners.delete(listener)
    },
  }

  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { storage: { local, onChanged } }

  return { store }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chrome-storage-mock.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/setup.ts tests/chrome-storage-mock.ts tests/chrome-storage-mock.test.ts
git commit -m "test: add vitest harness and in-memory chrome.storage mock"
```

---

### Task 4: Local storage primitives (`getLocal` / `setLocal`)

**Files:**
- Create: `src/shared/storage/local-store.ts`
- Test: `src/shared/storage/local-store.test.ts`

**Interfaces:**
- Consumes: `installChromeStorageMock` from Task 3 (test-only).
- Produces: `getLocal<T>(key: string): Promise<T | undefined>` and `setLocal<T>(key: string, value: T): Promise<void>`. All later repositories (Task 5+) are built on these two functions.

- [ ] **Step 1: Write the failing test**

`src/shared/storage/local-store.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getLocal, setLocal } from './local-store'

beforeEach(() => {
  installChromeStorageMock()
})

describe('local-store', () => {
  it('returns undefined when key has not been set', async () => {
    const result = await getLocal('missingKey')
    expect(result).toBeUndefined()
  })

  it('round-trips a value through setLocal and getLocal', async () => {
    await setLocal('profile', { firstName: 'Ada' })
    const result = await getLocal<{ firstName: string }>('profile')
    expect(result).toEqual({ firstName: 'Ada' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/local-store.test.ts`
Expected: FAIL — `Cannot find module './local-store'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/local-store.ts`:
```ts
export async function getLocal<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key] as T | undefined
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/local-store.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/storage/local-store.ts src/shared/storage/local-store.test.ts
git commit -m "feat: add typed chrome.storage.local get/set primitives"
```

---

### Task 5: Generic list repository factory

**Files:**
- Create: `src/shared/storage/list-repository.ts`
- Test: `src/shared/storage/list-repository.test.ts`

**Interfaces:**
- Consumes: `getLocal`/`setLocal` from Task 4.
- Produces: `createListRepository<T extends { id: string }>(storageKey: string): { list(): Promise<T[]>; add(item: T): Promise<void>; update(id: string, patch: Partial<T>): Promise<void>; remove(id: string): Promise<void> }`. Tasks 7, 8, 9 each call this once with their own storage key and type.

- [ ] **Step 1: Write the failing test**

`src/shared/storage/list-repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { createListRepository } from './list-repository'

interface Widget {
  id: string
  name: string
}

beforeEach(() => {
  installChromeStorageMock()
})

describe('createListRepository', () => {
  it('starts empty', async () => {
    const repository = createListRepository<Widget>('widgets')
    expect(await repository.list()).toEqual([])
  })

  it('adds, updates, and removes items', async () => {
    const repository = createListRepository<Widget>('widgets')

    await repository.add({ id: '1', name: 'First' })
    await repository.add({ id: '2', name: 'Second' })
    expect(await repository.list()).toEqual([
      { id: '1', name: 'First' },
      { id: '2', name: 'Second' },
    ])

    await repository.update('1', { name: 'First updated' })
    expect(await repository.list()).toEqual([
      { id: '1', name: 'First updated' },
      { id: '2', name: 'Second' },
    ])

    await repository.remove('2')
    expect(await repository.list()).toEqual([{ id: '1', name: 'First updated' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/list-repository.test.ts`
Expected: FAIL — `Cannot find module './list-repository'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/list-repository.ts`:
```ts
import { getLocal, setLocal } from './local-store'

export interface Identifiable {
  id: string
}

export function createListRepository<T extends Identifiable>(storageKey: string) {
  async function list(): Promise<T[]> {
    const items = await getLocal<T[]>(storageKey)
    return items ?? []
  }

  async function add(item: T): Promise<void> {
    const items = await list()
    await setLocal(storageKey, [...items, item])
  }

  async function update(id: string, patch: Partial<T>): Promise<void> {
    const items = await list()
    const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    await setLocal(storageKey, next)
  }

  async function remove(id: string): Promise<void> {
    const items = await list()
    await setLocal(
      storageKey,
      items.filter((item) => item.id !== id)
    )
  }

  return { list, add, update, remove }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/list-repository.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/storage/list-repository.ts src/shared/storage/list-repository.test.ts
git commit -m "feat: add generic CRUD list repository over chrome.storage.local"
```

---

### Task 6: Profile type + repository

**Files:**
- Create: `src/shared/types/profile.ts`
- Create: `src/shared/storage/profile-repository.ts`
- Test: `src/shared/storage/profile-repository.test.ts`

**Interfaces:**
- Consumes: `getLocal`/`setLocal` from Task 4.
- Produces: `Profile` interface; `getProfile(): Promise<Profile | undefined>`; `saveProfile(profile: Profile): Promise<void>`. Consumed by Task 10 (`useProfile`) and Task 12 (`PersonalInfoPage`).

- [ ] **Step 1: Write the failing test**

`src/shared/types/profile.ts`:
```ts
export interface Profile {
  firstName: string
  lastName: string
  preferredName?: string
  email: string
  phone: string
  country: string
  addressLine1: string
  addressLine2?: string
  city: string
  province: string
  postalCode: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  workAuthorizationStatus: string
  sponsorshipRequired: boolean
  earliestStartDate?: string
}
```

`src/shared/storage/profile-repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import type { Profile } from '../types/profile'
import { getProfile, saveProfile } from './profile-repository'

beforeEach(() => {
  installChromeStorageMock()
})

const sampleProfile: Profile = {
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

describe('profile-repository', () => {
  it('returns undefined when no profile has been saved', async () => {
    expect(await getProfile()).toBeUndefined()
  })

  it('saves and retrieves a profile', async () => {
    await saveProfile(sampleProfile)
    expect(await getProfile()).toEqual(sampleProfile)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/profile-repository.test.ts`
Expected: FAIL — `Cannot find module './profile-repository'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/profile-repository.ts`:
```ts
import type { Profile } from '../types/profile'
import { getLocal, setLocal } from './local-store'

const PROFILE_KEY = 'profile'

export async function getProfile(): Promise<Profile | undefined> {
  return getLocal<Profile>(PROFILE_KEY)
}

export async function saveProfile(profile: Profile): Promise<void> {
  await setLocal(PROFILE_KEY, profile)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/profile-repository.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/profile.ts src/shared/storage/profile-repository.ts \
  src/shared/storage/profile-repository.test.ts
git commit -m "feat: add Profile type and single-object storage repository"
```

---

### Task 7: WorkExperience type + repository

**Files:**
- Create: `src/shared/types/work-experience.ts`
- Create: `src/shared/storage/work-experience-repository.ts`
- Test: `src/shared/storage/work-experience-repository.test.ts`

**Interfaces:**
- Consumes: `createListRepository` from Task 5.
- Produces: `WorkExperience` interface; `workExperienceRepository` (same shape as `createListRepository`'s return value). Consumed by Task 13 (`WorkExperiencePage`).

- [ ] **Step 1: Write the failing test**

`src/shared/types/work-experience.ts`:
```ts
export interface WorkExperience {
  id: string
  companyName: string
  jobTitle: string
  location?: string
  startMonth: number
  startYear: number
  endMonth?: number
  endYear?: number
  currentlyWorking: boolean
  description?: string
}
```

`src/shared/storage/work-experience-repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { workExperienceRepository } from './work-experience-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('workExperienceRepository', () => {
  it('round-trips a work experience entry under the workExperiences key', async () => {
    await workExperienceRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      startMonth: 1,
      startYear: 2020,
      currentlyWorking: true,
    })

    expect(await workExperienceRepository.list()).toEqual([
      {
        id: '1',
        companyName: 'Acme',
        jobTitle: 'Engineer',
        startMonth: 1,
        startYear: 2020,
        currentlyWorking: true,
      },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/work-experience-repository.test.ts`
Expected: FAIL — `Cannot find module './work-experience-repository'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/work-experience-repository.ts`:
```ts
import type { WorkExperience } from '../types/work-experience'
import { createListRepository } from './list-repository'

export const workExperienceRepository = createListRepository<WorkExperience>('workExperiences')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/work-experience-repository.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/work-experience.ts src/shared/storage/work-experience-repository.ts \
  src/shared/storage/work-experience-repository.test.ts
git commit -m "feat: add WorkExperience type and list repository"
```

---

### Task 8: Education type + repository

**Files:**
- Create: `src/shared/types/education.ts`
- Create: `src/shared/storage/education-repository.ts`
- Test: `src/shared/storage/education-repository.test.ts`

**Interfaces:**
- Consumes: `createListRepository` from Task 5.
- Produces: `Education` interface; `educationRepository`. Consumed by Task 14 (`EducationPage`).

- [ ] **Step 1: Write the failing test**

`src/shared/types/education.ts`:
```ts
export interface Education {
  id: string
  schoolName: string
  degree: string
  fieldOfStudy: string
  location?: string
  startYear: number
  endYear?: number
  gpa?: string
  description?: string
}
```

`src/shared/storage/education-repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { educationRepository } from './education-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('educationRepository', () => {
  it('round-trips an education entry under the educations key', async () => {
    await educationRepository.add({
      id: '1',
      schoolName: 'MIT',
      degree: 'BSc',
      fieldOfStudy: 'Computer Science',
      startYear: 2016,
    })

    expect(await educationRepository.list()).toEqual([
      {
        id: '1',
        schoolName: 'MIT',
        degree: 'BSc',
        fieldOfStudy: 'Computer Science',
        startYear: 2016,
      },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/education-repository.test.ts`
Expected: FAIL — `Cannot find module './education-repository'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/education-repository.ts`:
```ts
import type { Education } from '../types/education'
import { createListRepository } from './list-repository'

export const educationRepository = createListRepository<Education>('educations')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/education-repository.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/education.ts src/shared/storage/education-repository.ts \
  src/shared/storage/education-repository.test.ts
git commit -m "feat: add Education type and list repository"
```

---

### Task 9: AnswerBank type + repository

**Files:**
- Create: `src/shared/types/answer-bank.ts`
- Create: `src/shared/storage/answer-bank-repository.ts`
- Test: `src/shared/storage/answer-bank-repository.test.ts`

**Interfaces:**
- Consumes: `createListRepository` from Task 5.
- Produces: `AnswerType`, `AnswerBankEntry` interface; `answerBankRepository`. Consumed by Task 15 (`AnswerBankPage`).

- [ ] **Step 1: Write the failing test**

`src/shared/types/answer-bank.ts`:
```ts
export type AnswerType = 'yesNo' | 'text' | 'select'

export interface AnswerBankEntry {
  id: string
  questionKey: string
  questionLabel: string
  type: AnswerType
  value: string
  isSensitive: boolean
  autoFillEnabled: boolean
}
```

`src/shared/storage/answer-bank-repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { answerBankRepository } from './answer-bank-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('answerBankRepository', () => {
  it('round-trips an answer bank entry under the answerBank key', async () => {
    await answerBankRepository.add({
      id: '1',
      questionKey: 'workAuthorization',
      questionLabel: 'Are you legally authorized to work in this country?',
      type: 'yesNo',
      value: 'Yes',
      isSensitive: false,
      autoFillEnabled: true,
    })

    expect(await answerBankRepository.list()).toEqual([
      {
        id: '1',
        questionKey: 'workAuthorization',
        questionLabel: 'Are you legally authorized to work in this country?',
        type: 'yesNo',
        value: 'Yes',
        isSensitive: false,
        autoFillEnabled: true,
      },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/answer-bank-repository.test.ts`
Expected: FAIL — `Cannot find module './answer-bank-repository'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/answer-bank-repository.ts`:
```ts
import type { AnswerBankEntry } from '../types/answer-bank'
import { createListRepository } from './list-repository'

export const answerBankRepository = createListRepository<AnswerBankEntry>('answerBank')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/answer-bank-repository.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/answer-bank.ts src/shared/storage/answer-bank-repository.ts \
  src/shared/storage/answer-bank-repository.test.ts
git commit -m "feat: add AnswerBankEntry type and list repository"
```

---

### Task 10: `useProfile` hook

**Files:**
- Create: `src/shared/storage/use-profile.ts`
- Test: `src/shared/storage/use-profile.test.tsx`

**Interfaces:**
- Consumes: `getProfile`, `saveProfile` from Task 6.
- Produces: `useProfile(): { profile: Profile | undefined; isLoading: boolean; reload: () => Promise<void> }`. Consumed by Task 12 (`PersonalInfoPage`).

- [ ] **Step 1: Write the failing test**

`src/shared/storage/use-profile.test.tsx`:
```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { saveProfile } from './profile-repository'
import { useProfile } from './use-profile'

beforeEach(() => {
  installChromeStorageMock()
})

describe('useProfile', () => {
  it('loads undefined when no profile is saved, then reflects storage updates', async () => {
    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.profile).toBeUndefined()

    await act(async () => {
      await saveProfile({
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
      })
    })

    await waitFor(() => expect(result.current.profile?.firstName).toBe('Ada'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/use-profile.test.tsx`
Expected: FAIL — `Cannot find module './use-profile'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/use-profile.ts`:
```ts
import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '../types/profile'
import { getProfile } from './profile-repository'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    const next = await getProfile()
    setProfile(next)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    reload()
    function handleChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
      if (areaName === 'local' && 'profile' in changes) {
        reload()
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [reload])

  return { profile, isLoading, reload }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/use-profile.test.tsx`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/storage/use-profile.ts src/shared/storage/use-profile.test.tsx
git commit -m "feat: add useProfile hook reactive to chrome.storage changes"
```

---

### Task 11: `useStorageList` hook

**Files:**
- Create: `src/shared/storage/use-storage-list.ts`
- Test: `src/shared/storage/use-storage-list.test.tsx`

**Interfaces:**
- Consumes: any repository shaped `{ list(): Promise<T[]> }` (Tasks 5, 7, 8, 9 all satisfy this).
- Produces: `useStorageList<T>(storageKey: string, repository: { list(): Promise<T[]> }): { items: T[]; isLoading: boolean; reload: () => Promise<void> }`. Consumed by Tasks 13, 14, 15.

- [ ] **Step 1: Write the failing test**

`src/shared/storage/use-storage-list.test.tsx`:
```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { createListRepository } from './list-repository'
import { useStorageList } from './use-storage-list'

interface Widget {
  id: string
  name: string
}

beforeEach(() => {
  installChromeStorageMock()
})

describe('useStorageList', () => {
  it('loads existing items on mount and reflects storage changes', async () => {
    const repository = createListRepository<Widget>('widgets')
    await repository.add({ id: '1', name: 'First' })

    const { result } = renderHook(() => useStorageList<Widget>('widgets', repository))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual([{ id: '1', name: 'First' }])

    await act(async () => {
      await repository.add({ id: '2', name: 'Second' })
    })

    await waitFor(() => expect(result.current.items).toHaveLength(2))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/use-storage-list.test.tsx`
Expected: FAIL — `Cannot find module './use-storage-list'`.

- [ ] **Step 3: Write minimal implementation**

`src/shared/storage/use-storage-list.ts`:
```ts
import { useCallback, useEffect, useState } from 'react'

export function useStorageList<T>(storageKey: string, repository: { list: () => Promise<T[]> }) {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    const next = await repository.list()
    setItems(next)
    setIsLoading(false)
  }, [repository])

  useEffect(() => {
    reload()
    function handleChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
      if (areaName === 'local' && storageKey in changes) {
        reload()
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [storageKey, reload])

  return { items, isLoading, reload }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/use-storage-list.test.tsx`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/storage/use-storage-list.ts src/shared/storage/use-storage-list.test.tsx
git commit -m "feat: add useStorageList hook reactive to chrome.storage changes"
```

---

### Task 12: `PersonalInfoPage`

**Files:**
- Create: `src/options/personal-info/profile-schema.ts`
- Create: `src/options/personal-info/PersonalInfoPage.tsx`
- Test: `src/options/personal-info/PersonalInfoPage.test.tsx`

**Interfaces:**
- Consumes: `useProfile` (Task 10), `saveProfile` (Task 6).
- Produces: `<PersonalInfoPage />`, a form with `aria-label="Personal info form"`. Consumed by Task 16 (`App`).

- [ ] **Step 1: Write the failing test**

`src/options/personal-info/profile-schema.ts`:
```ts
import { z } from 'zod'

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  preferredName: z.string().optional(),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province / State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  workAuthorizationStatus: z.string().min(1, 'Work authorization status is required'),
  sponsorshipRequired: z.boolean(),
  earliestStartDate: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
```

`src/options/personal-info/PersonalInfoPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getProfile } from '../../shared/storage/profile-repository'
import { PersonalInfoPage } from './PersonalInfoPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('PersonalInfoPage', () => {
  it('saves a filled-in profile to storage', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoPage />)

    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lovelace')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Phone number'), '555-0100')
    await user.type(screen.getByLabelText('Country'), 'Canada')
    await user.type(screen.getByLabelText('Address line 1'), '123 Main St')
    await user.type(screen.getByLabelText('City'), 'Toronto')
    await user.type(screen.getByLabelText('Province / State'), 'ON')
    await user.type(screen.getByLabelText('Postal code'), 'M5V 2T6')
    await user.type(screen.getByLabelText('Work authorization status'), 'Citizen')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('status')
    const saved = await getProfile()
    expect(saved).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' })
  })

  it('shows a validation error when email is invalid', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoPage />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/personal-info/PersonalInfoPage.test.tsx`
Expected: FAIL — `Cannot find module './PersonalInfoPage'`.

- [ ] **Step 3: Write minimal implementation**

`src/options/personal-info/PersonalInfoPage.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { saveProfile } from '../../shared/storage/profile-repository'
import { useProfile } from '../../shared/storage/use-profile'
import { profileSchema, type ProfileFormValues } from './profile-schema'

const defaultValues: ProfileFormValues = {
  firstName: '',
  lastName: '',
  preferredName: '',
  email: '',
  phone: '',
  country: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  workAuthorizationStatus: '',
  sponsorshipRequired: false,
  earliestStartDate: '',
}

export function PersonalInfoPage() {
  const { profile, reload } = useProfile()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  })

  useEffect(() => {
    if (profile) reset(profile)
  }, [profile, reset])

  const onSubmit = handleSubmit(async (values) => {
    await saveProfile(values)
    await reload()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl" aria-label="Personal info form">
      <div>
        <label htmlFor="firstName">First name</label>
        <input id="firstName" {...register('firstName')} />
        {errors.firstName && <p role="alert">{errors.firstName.message}</p>}
      </div>
      <div>
        <label htmlFor="lastName">Last name</label>
        <input id="lastName" {...register('lastName')} />
        {errors.lastName && <p role="alert">{errors.lastName.message}</p>}
      </div>
      <div>
        <label htmlFor="preferredName">Preferred name</label>
        <input id="preferredName" {...register('preferredName')} />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="phone">Phone number</label>
        <input id="phone" {...register('phone')} />
        {errors.phone && <p role="alert">{errors.phone.message}</p>}
      </div>
      <div>
        <label htmlFor="country">Country</label>
        <input id="country" {...register('country')} />
        {errors.country && <p role="alert">{errors.country.message}</p>}
      </div>
      <div>
        <label htmlFor="addressLine1">Address line 1</label>
        <input id="addressLine1" {...register('addressLine1')} />
        {errors.addressLine1 && <p role="alert">{errors.addressLine1.message}</p>}
      </div>
      <div>
        <label htmlFor="addressLine2">Address line 2</label>
        <input id="addressLine2" {...register('addressLine2')} />
      </div>
      <div>
        <label htmlFor="city">City</label>
        <input id="city" {...register('city')} />
        {errors.city && <p role="alert">{errors.city.message}</p>}
      </div>
      <div>
        <label htmlFor="province">Province / State</label>
        <input id="province" {...register('province')} />
        {errors.province && <p role="alert">{errors.province.message}</p>}
      </div>
      <div>
        <label htmlFor="postalCode">Postal code</label>
        <input id="postalCode" {...register('postalCode')} />
        {errors.postalCode && <p role="alert">{errors.postalCode.message}</p>}
      </div>
      <div>
        <label htmlFor="linkedinUrl">LinkedIn URL</label>
        <input id="linkedinUrl" {...register('linkedinUrl')} />
      </div>
      <div>
        <label htmlFor="githubUrl">GitHub URL</label>
        <input id="githubUrl" {...register('githubUrl')} />
      </div>
      <div>
        <label htmlFor="portfolioUrl">Portfolio / personal website</label>
        <input id="portfolioUrl" {...register('portfolioUrl')} />
      </div>
      <div>
        <label htmlFor="workAuthorizationStatus">Work authorization status</label>
        <input id="workAuthorizationStatus" {...register('workAuthorizationStatus')} />
        {errors.workAuthorizationStatus && (
          <p role="alert">{errors.workAuthorizationStatus.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="sponsorshipRequired">
          <input id="sponsorshipRequired" type="checkbox" {...register('sponsorshipRequired')} />
          Will now or in the future require sponsorship
        </label>
      </div>
      <div>
        <label htmlFor="earliestStartDate">Earliest start date</label>
        <input id="earliestStartDate" type="date" {...register('earliestStartDate')} />
      </div>
      <button type="submit">Save</button>
      {isSubmitSuccessful && <p role="status">Profile saved.</p>}
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/personal-info/PersonalInfoPage.test.tsx`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/options/personal-info/profile-schema.ts src/options/personal-info/PersonalInfoPage.tsx \
  src/options/personal-info/PersonalInfoPage.test.tsx
git commit -m "feat: add PersonalInfoPage with validated profile form"
```

---

### Task 13: `WorkExperiencePage`

**Files:**
- Create: `src/options/work-experience/work-experience-schema.ts`
- Create: `src/options/work-experience/WorkExperiencePage.tsx`
- Test: `src/options/work-experience/WorkExperiencePage.test.tsx`

**Interfaces:**
- Consumes: `useStorageList` (Task 11), `workExperienceRepository` (Task 7).
- Produces: `<WorkExperiencePage />` with a list `aria-label="Work experience list"` and a form `aria-label="Work experience form"`. Consumed by Task 16 (`App`).

- [ ] **Step 1: Write the failing test**

`src/options/work-experience/work-experience-schema.ts`:
```ts
import { z } from 'zod'

export const workExperienceFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  location: z.string().optional(),
  startMonth: z.coerce.number().int().min(1).max(12),
  startYear: z.coerce.number().int().min(1950).max(2100),
  endMonth: z.coerce.number().int().min(1).max(12).optional(),
  endYear: z.coerce.number().int().min(1950).max(2100).optional(),
  currentlyWorking: z.boolean(),
  description: z.string().optional(),
})

export type WorkExperienceFormValues = z.infer<typeof workExperienceFormSchema>
```

`src/options/work-experience/WorkExperiencePage.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { WorkExperiencePage } from './WorkExperiencePage'

beforeEach(() => {
  installChromeStorageMock()
})

async function addSampleEntry(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Company name'), 'Acme')
  await user.type(screen.getByLabelText('Job title'), 'Engineer')
  await user.clear(screen.getByLabelText('Start month'))
  await user.type(screen.getByLabelText('Start month'), '3')
  await user.clear(screen.getByLabelText('Start year'))
  await user.type(screen.getByLabelText('Start year'), '2021')
  await user.click(screen.getByRole('button', { name: 'Add experience' }))
}

describe('WorkExperiencePage', () => {
  it('adds a work experience entry and lists it', async () => {
    const user = userEvent.setup()
    render(<WorkExperiencePage />)

    await addSampleEntry(user)

    const list = await screen.findByLabelText('Work experience list')
    expect(within(list).getByText('Engineer at Acme')).toBeInTheDocument()
  })

  it('deletes a work experience entry', async () => {
    const user = userEvent.setup()
    render(<WorkExperiencePage />)

    await addSampleEntry(user)

    const list = await screen.findByLabelText('Work experience list')
    await user.click(within(list).getByRole('button', { name: 'Delete' }))

    expect(within(list).queryByText('Engineer at Acme')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/work-experience/WorkExperiencePage.test.tsx`
Expected: FAIL — `Cannot find module './WorkExperiencePage'`.

- [ ] **Step 3: Write minimal implementation**

`src/options/work-experience/WorkExperiencePage.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { workExperienceRepository } from '../../shared/storage/work-experience-repository'
import { useStorageList } from '../../shared/storage/use-storage-list'
import type { WorkExperience } from '../../shared/types/work-experience'
import {
  workExperienceFormSchema,
  type WorkExperienceFormValues,
} from './work-experience-schema'

const emptyValues: WorkExperienceFormValues = {
  companyName: '',
  jobTitle: '',
  location: '',
  startMonth: 1,
  startYear: new Date().getFullYear(),
  endMonth: undefined,
  endYear: undefined,
  currentlyWorking: false,
  description: '',
}

export function WorkExperiencePage() {
  const { items, reload } = useStorageList<WorkExperience>(
    'workExperiences',
    workExperienceRepository
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    defaultValues: emptyValues,
  })

  const onSubmit = handleSubmit(async (values) => {
    if (editingId) {
      await workExperienceRepository.update(editingId, values)
    } else {
      await workExperienceRepository.add({ id: crypto.randomUUID(), ...values })
    }
    setEditingId(null)
    reset(emptyValues)
    await reload()
  })

  function startEdit(item: WorkExperience) {
    setEditingId(item.id)
    reset(item)
  }

  async function remove(id: string) {
    await workExperienceRepository.remove(id)
    await reload()
  }

  return (
    <section>
      <h2>Work experience</h2>
      <ul aria-label="Work experience list">
        {items.map((item) => (
          <li key={item.id}>
            <span>
              {item.jobTitle} at {item.companyName}
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
      <form onSubmit={onSubmit} aria-label="Work experience form" className="space-y-2 max-w-xl">
        <div>
          <label htmlFor="companyName">Company name</label>
          <input id="companyName" {...register('companyName')} />
          {errors.companyName && <p role="alert">{errors.companyName.message}</p>}
        </div>
        <div>
          <label htmlFor="jobTitle">Job title</label>
          <input id="jobTitle" {...register('jobTitle')} />
          {errors.jobTitle && <p role="alert">{errors.jobTitle.message}</p>}
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input id="location" {...register('location')} />
        </div>
        <div>
          <label htmlFor="startMonth">Start month</label>
          <input id="startMonth" type="number" {...register('startMonth')} />
        </div>
        <div>
          <label htmlFor="startYear">Start year</label>
          <input id="startYear" type="number" {...register('startYear')} />
        </div>
        <div>
          <label htmlFor="endMonth">End month</label>
          <input id="endMonth" type="number" {...register('endMonth')} />
        </div>
        <div>
          <label htmlFor="endYear">End year</label>
          <input id="endYear" type="number" {...register('endYear')} />
        </div>
        <div>
          <label htmlFor="currentlyWorking">
            <input id="currentlyWorking" type="checkbox" {...register('currentlyWorking')} />
            Currently working here
          </label>
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea id="description" {...register('description')} />
        </div>
        <button type="submit">{editingId ? 'Update experience' : 'Add experience'}</button>
      </form>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/work-experience/WorkExperiencePage.test.tsx`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/options/work-experience/work-experience-schema.ts \
  src/options/work-experience/WorkExperiencePage.tsx \
  src/options/work-experience/WorkExperiencePage.test.tsx
git commit -m "feat: add WorkExperiencePage with add/edit/delete flow"
```

---

### Task 14: `EducationPage`

**Files:**
- Create: `src/options/education/education-schema.ts`
- Create: `src/options/education/EducationPage.tsx`
- Test: `src/options/education/EducationPage.test.tsx`

**Interfaces:**
- Consumes: `useStorageList` (Task 11), `educationRepository` (Task 8).
- Produces: `<EducationPage />` with a list `aria-label="Education list"` and a form `aria-label="Education form"`. Consumed by Task 16 (`App`).

- [ ] **Step 1: Write the failing test**

`src/options/education/education-schema.ts`:
```ts
import { z } from 'zod'

export const educationFormSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  degree: z.string().min(1, 'Degree is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  location: z.string().optional(),
  startYear: z.coerce.number().int().min(1950).max(2100),
  endYear: z.coerce.number().int().min(1950).max(2100).optional(),
  gpa: z.string().optional(),
  description: z.string().optional(),
})

export type EducationFormValues = z.infer<typeof educationFormSchema>
```

`src/options/education/EducationPage.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { EducationPage } from './EducationPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('EducationPage', () => {
  it('adds an education entry and lists it', async () => {
    const user = userEvent.setup()
    render(<EducationPage />)

    await user.type(screen.getByLabelText('School name'), 'MIT')
    await user.type(screen.getByLabelText('Degree'), 'BSc')
    await user.type(screen.getByLabelText('Field of study'), 'Computer Science')
    await user.clear(screen.getByLabelText('Start year'))
    await user.type(screen.getByLabelText('Start year'), '2016')
    await user.click(screen.getByRole('button', { name: 'Add education' }))

    const list = await screen.findByLabelText('Education list')
    expect(within(list).getByText('BSc, Computer Science — MIT')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/education/EducationPage.test.tsx`
Expected: FAIL — `Cannot find module './EducationPage'`.

- [ ] **Step 3: Write minimal implementation**

`src/options/education/EducationPage.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { educationRepository } from '../../shared/storage/education-repository'
import { useStorageList } from '../../shared/storage/use-storage-list'
import type { Education } from '../../shared/types/education'
import { educationFormSchema, type EducationFormValues } from './education-schema'

const emptyValues: EducationFormValues = {
  schoolName: '',
  degree: '',
  fieldOfStudy: '',
  location: '',
  startYear: new Date().getFullYear(),
  endYear: undefined,
  gpa: '',
  description: '',
}

export function EducationPage() {
  const { items, reload } = useStorageList<Education>('educations', educationRepository)
  const [editingId, setEditingId] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: emptyValues,
  })

  const onSubmit = handleSubmit(async (values) => {
    if (editingId) {
      await educationRepository.update(editingId, values)
    } else {
      await educationRepository.add({ id: crypto.randomUUID(), ...values })
    }
    setEditingId(null)
    reset(emptyValues)
    await reload()
  })

  function startEdit(item: Education) {
    setEditingId(item.id)
    reset(item)
  }

  async function remove(id: string) {
    await educationRepository.remove(id)
    await reload()
  }

  return (
    <section>
      <h2>Education</h2>
      <ul aria-label="Education list">
        {items.map((item) => (
          <li key={item.id}>
            <span>
              {item.degree}, {item.fieldOfStudy} — {item.schoolName}
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
      <form onSubmit={onSubmit} aria-label="Education form" className="space-y-2 max-w-xl">
        <div>
          <label htmlFor="schoolName">School name</label>
          <input id="schoolName" {...register('schoolName')} />
          {errors.schoolName && <p role="alert">{errors.schoolName.message}</p>}
        </div>
        <div>
          <label htmlFor="degree">Degree</label>
          <input id="degree" {...register('degree')} />
          {errors.degree && <p role="alert">{errors.degree.message}</p>}
        </div>
        <div>
          <label htmlFor="fieldOfStudy">Field of study</label>
          <input id="fieldOfStudy" {...register('fieldOfStudy')} />
          {errors.fieldOfStudy && <p role="alert">{errors.fieldOfStudy.message}</p>}
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input id="location" {...register('location')} />
        </div>
        <div>
          <label htmlFor="startYear">Start year</label>
          <input id="startYear" type="number" {...register('startYear')} />
        </div>
        <div>
          <label htmlFor="endYear">End year</label>
          <input id="endYear" type="number" {...register('endYear')} />
        </div>
        <div>
          <label htmlFor="gpa">GPA</label>
          <input id="gpa" {...register('gpa')} />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea id="description" {...register('description')} />
        </div>
        <button type="submit">{editingId ? 'Update education' : 'Add education'}</button>
      </form>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/education/EducationPage.test.tsx`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/options/education/education-schema.ts src/options/education/EducationPage.tsx \
  src/options/education/EducationPage.test.tsx
git commit -m "feat: add EducationPage with add/edit/delete flow"
```

---

### Task 15: `AnswerBankPage`

**Files:**
- Create: `src/options/answer-bank/answer-bank-schema.ts`
- Create: `src/options/answer-bank/AnswerBankPage.tsx`
- Test: `src/options/answer-bank/AnswerBankPage.test.tsx`

**Interfaces:**
- Consumes: `useStorageList` (Task 11), `answerBankRepository` (Task 9).
- Produces: `<AnswerBankPage />` with a list `aria-label="Answer bank list"` and a form `aria-label="Answer bank form"`. Consumed by Task 16 (`App`).

- [ ] **Step 1: Write the failing test**

`src/options/answer-bank/answer-bank-schema.ts`:
```ts
import { z } from 'zod'

export const answerBankFormSchema = z.object({
  questionKey: z.string().min(1, 'Question key is required'),
  questionLabel: z.string().min(1, 'Question label is required'),
  type: z.enum(['yesNo', 'text', 'select']),
  value: z.string().min(1, 'Answer value is required'),
  isSensitive: z.boolean(),
  autoFillEnabled: z.boolean(),
})

export type AnswerBankFormValues = z.infer<typeof answerBankFormSchema>
```

`src/options/answer-bank/AnswerBankPage.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { AnswerBankPage } from './AnswerBankPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('AnswerBankPage', () => {
  it('adds an answer bank entry marked as sensitive with auto-fill disabled', async () => {
    const user = userEvent.setup()
    render(<AnswerBankPage />)

    await user.type(screen.getByLabelText('Question key'), 'veteranStatus')
    await user.type(screen.getByLabelText('Question label'), 'Are you a veteran?')
    await user.selectOptions(screen.getByLabelText('Question type'), 'yesNo')
    await user.type(screen.getByLabelText('Answer'), 'Prefer not to answer')
    await user.click(screen.getByLabelText('Sensitive question'))
    await user.click(screen.getByRole('button', { name: 'Add answer' }))

    const list = await screen.findByLabelText('Answer bank list')
    expect(within(list).getByText('Are you a veteran?')).toBeInTheDocument()
    expect(within(list).getByText('Sensitive — auto-fill off')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/answer-bank/AnswerBankPage.test.tsx`
Expected: FAIL — `Cannot find module './AnswerBankPage'`.

- [ ] **Step 3: Write minimal implementation**

`src/options/answer-bank/AnswerBankPage.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { answerBankRepository } from '../../shared/storage/answer-bank-repository'
import { useStorageList } from '../../shared/storage/use-storage-list'
import type { AnswerBankEntry } from '../../shared/types/answer-bank'
import { answerBankFormSchema, type AnswerBankFormValues } from './answer-bank-schema'

const emptyValues: AnswerBankFormValues = {
  questionKey: '',
  questionLabel: '',
  type: 'yesNo',
  value: '',
  isSensitive: false,
  autoFillEnabled: true,
}

export function AnswerBankPage() {
  const { items, reload } = useStorageList<AnswerBankEntry>('answerBank', answerBankRepository)
  const [editingId, setEditingId] = useState<string | null>(null)
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
  const isSensitiveField = register('isSensitive')

  const onSubmit = handleSubmit(async (values) => {
    if (editingId) {
      await answerBankRepository.update(editingId, values)
    } else {
      await answerBankRepository.add({ id: crypto.randomUUID(), ...values })
    }
    setEditingId(null)
    reset(emptyValues)
    await reload()
  })

  function startEdit(item: AnswerBankEntry) {
    setEditingId(item.id)
    reset(item)
  }

  async function remove(id: string) {
    await answerBankRepository.remove(id)
    await reload()
  }

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

Note: `type` on the `<select>` question type field is set with the raw `register('type')` (no custom `onChange`), which is safe because it has no side effect on another field, unlike `isSensitive`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/answer-bank/AnswerBankPage.test.tsx`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/options/answer-bank/answer-bank-schema.ts src/options/answer-bank/AnswerBankPage.tsx \
  src/options/answer-bank/AnswerBankPage.test.tsx
git commit -m "feat: add AnswerBankPage with sensitive-question auto-fill guard"
```

---

### Task 16: Wire the Options `App` shell (tab navigation) + manual end-to-end verification

**Files:**
- Modify: `src/options/App.tsx`
- Test: `src/options/App.test.tsx`

**Interfaces:**
- Consumes: `PersonalInfoPage` (Task 12), `WorkExperiencePage` (Task 13), `EducationPage` (Task 14), `AnswerBankPage` (Task 15).
- Produces: the assembled Options page. This is the last task in this plan — Application Records, Import/Export, and Privacy Settings tabs are out of scope and belong to a later plan.

- [ ] **Step 1: Write the failing test**

`src/options/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../tests/chrome-storage-mock'
import { App } from './App'

beforeEach(() => {
  installChromeStorageMock()
})

describe('App', () => {
  it('switches between profile sections via the tab navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByLabelText('Personal info form')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Work experience' }))
    expect(screen.getByLabelText('Work experience form')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Education' }))
    expect(screen.getByLabelText('Education form')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Answer bank' }))
    expect(screen.getByLabelText('Answer bank form')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/App.test.tsx`
Expected: FAIL — the current `App` only renders a static heading, so `getByLabelText('Personal info form')` throws "Unable to find a label with the text of: Personal info form".

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/options/App.tsx`:
```tsx
import { useState } from 'react'
import { AnswerBankPage } from './answer-bank/AnswerBankPage'
import { EducationPage } from './education/EducationPage'
import { PersonalInfoPage } from './personal-info/PersonalInfoPage'
import { WorkExperiencePage } from './work-experience/WorkExperiencePage'

const TABS = [
  { key: 'personal', label: 'Personal info' },
  { key: 'work', label: 'Work experience' },
  { key: 'education', label: 'Education' },
  { key: 'answers', label: 'Answer bank' },
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
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/App.test.tsx`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all test files pass (Tasks 3 through 16), 0 failures.

- [ ] **Step 6: Build and manually verify in Chrome**

Run: `npm run build`
Expected: exits 0.

In Chrome, reload the unpacked extension at `chrome://extensions` (or load `dist` again if not already loaded), then open "Extension options". Verify:
1. The "Personal info" tab is active by default; fill in all required fields and click "Save" — a "Profile saved." message appears.
2. Click "Work experience", add an entry — it appears in the list above the form. Click "Edit" on it, change the job title, save, and confirm the list updates. Click "Delete" and confirm it disappears.
3. Click "Education", add an entry — confirm it appears in the list.
4. Click "Answer bank", add an entry with "Sensitive question" checked — confirm the list shows "Sensitive — auto-fill off" and the "Auto-fill this answer" checkbox is unchecked.
5. Close and reopen the Options page (or reload the tab) — confirm all previously entered data is still present, proving persistence through `chrome.storage.local`.

- [ ] **Step 7: Commit**

```bash
git add src/options/App.tsx src/options/App.test.tsx
git commit -m "feat: wire Options page tab navigation across all profile sections"
```

---

## What this plan does not cover

Page detection, field scanning/matching, autofill execution, the Side Panel, Application Records, Import/Export, and Privacy Settings are deliberately out of scope — each becomes its own plan once this one is merged, per the phased breakdown in `docs/implementation.md`.

