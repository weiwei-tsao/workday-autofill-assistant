# JSON Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user export all their data (Profile, Work Experience, Education, Answer Bank, Application Records) as a single downloadable JSON file, and restore it later from a previously-exported file.

**Architecture:** A new `ExportBundle` type bundles all five data sources plus an `exportedAt` timestamp. `buildExportBundle`/`restoreFromBundle` (in a new `export-import.ts` module) read/write through the existing repositories exclusively — no direct `chrome.storage.local` access. Since restoring must overwrite each collection wholesale rather than merge, the existing `createListRepository` factory (shared by all four list-based repositories: Work Experience, Education, Answer Bank, Application Records) gains one new `replaceAll` method. A new Options page module (`ImportExportPage.tsx`) triggers a browser download via `Blob` + object URL for export (no new permissions needed), and reads a user-selected file via the File API for import, validating its shape before writing anything.

**Tech Stack:** Same as the existing scaffold — TypeScript + Vitest + Zod. No new dependencies.

## Global Constraints

- TypeScript `strict: true`.
- No network calls anywhere in the codebase — export/import is entirely local (Blob download, File API read).
- Content scripts and page components must read/write through the existing repositories (`profile-repository.ts`, `work-experience-repository.ts`, `education-repository.ts`, `answer-bank-repository.ts`, `application-record-repository.ts`) — never call `chrome.storage.local` directly.
- **Import validation is intentionally shallow**: it checks the top-level bundle shape (`exportedAt` is a string, `profile` is an optional object, the four list fields are arrays of objects) but does NOT deep-validate every field of every entity. Deep validation would duplicate the per-section form schemas that already exist under `src/options/*/​*-schema.ts` (which validate *form input*, not the *stored domain shape* — there's no existing domain-level zod schema to reuse) and would be brittle against future field additions to any entity. This is a deliberate scope decision, not an oversight.
- **Restoring a bundle with no `profile` key leaves any existing profile untouched** — it does not clear it. `JSON.stringify` drops `undefined`-valued object properties, so "no `profile` key in the JSON" is the *normal* outcome for any export made before Personal Info was ever filled in, not a signal that the user wants their profile wiped.
- Export must not require any new Chrome extension permission — implemented via `Blob` + `URL.createObjectURL` + a programmatic `<a download>` click, all standard web APIs available to any page context.

---

### Task 1: `replaceAll` on the list repository factory

**Files:**
- Modify: `src/shared/storage/list-repository.ts`
- Modify: `src/shared/storage/list-repository.test.ts` (add a test only — do not change the existing tests)

**Interfaces:**
- Produces: `createListRepository<T>(storageKey)` now also returns `replaceAll(items: T[]): Promise<void>`, alongside the existing `list`/`add`/`update`/`remove`. This is inherited automatically by every existing list-based repository (`workExperienceRepository`, `educationRepository`, `answerBankRepository`, `applicationRecordRepository`) since they're all built from this one factory. Consumed by Task 3 (`restoreFromBundle`).

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('createListRepository', ...)` block in `src/shared/storage/list-repository.test.ts` (after the existing tests, before the closing `})`):
```ts
  it('replaces the entire list at once', async () => {
    const repository = createListRepository<Widget>('widgets')

    await repository.add({ id: '1', name: 'First' })
    await repository.replaceAll([
      { id: '2', name: 'Second' },
      { id: '3', name: 'Third' },
    ])

    expect(await repository.list()).toEqual([
      { id: '2', name: 'Second' },
      { id: '3', name: 'Third' },
    ])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/list-repository.test.ts`
Expected: FAIL — `repository.replaceAll is not a function`.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/shared/storage/list-repository.ts`:
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

  async function replaceAll(items: T[]): Promise<void> {
    await setLocal(storageKey, items)
  }

  return { list, add, update, remove, replaceAll }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/list-repository.test.ts`
Expected: PASS — 3 tests passed (2 existing + 1 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/storage/list-repository.ts src/shared/storage/list-repository.test.ts
git commit -m "feat(storage): add replaceAll to the list repository factory"
```

---

### Task 2: ExportBundle type and shallow validation schema

**Files:**
- Create: `src/shared/types/export-bundle.ts`
- Create: `src/shared/types/export-bundle-schema.ts`
- Create: `src/shared/types/export-bundle-schema.test.ts`

**Interfaces:**
- Consumes: `Profile` (`src/shared/types/profile.ts`), `WorkExperience` (`src/shared/types/work-experience.ts`), `Education` (`src/shared/types/education.ts`), `AnswerBankEntry` (`src/shared/types/answer-bank.ts`), `ApplicationRecord` (`src/shared/types/application-record.ts`) — all existing.
- Produces: `ExportBundle { exportedAt: string; profile: Profile | undefined; workExperiences: WorkExperience[]; educations: Education[]; answerBank: AnswerBankEntry[]; applicationRecords: ApplicationRecord[] }`; `exportBundleSchema` (zod, shallow — see Global Constraints). Consumed by Task 3 (`ExportBundle`) and Task 4 (both).

- [ ] **Step 1: Write the failing test**

Create `src/shared/types/export-bundle-schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { exportBundleSchema } from './export-bundle-schema'

describe('exportBundleSchema', () => {
  it('accepts a valid full bundle', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: { firstName: 'Ada' },
      workExperiences: [{ id: '1', companyName: 'Acme' }],
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(true)
  })

  it('accepts a bundle with no profile key', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      workExperiences: [],
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a bundle missing a required list field', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(false)
  })

  it('rejects an unrelated JSON object', () => {
    const result = exportBundleSchema.safeParse({ foo: 'bar' })

    expect(result.success).toBe(false)
  })

  it('rejects a bundle where a list field is not an array', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      workExperiences: 'not an array',
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/types/export-bundle-schema.test.ts`
Expected: FAIL — `Cannot find module './export-bundle-schema'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/types/export-bundle.ts`:
```ts
import type { AnswerBankEntry } from './answer-bank'
import type { ApplicationRecord } from './application-record'
import type { Education } from './education'
import type { Profile } from './profile'
import type { WorkExperience } from './work-experience'

export interface ExportBundle {
  exportedAt: string
  profile: Profile | undefined
  workExperiences: WorkExperience[]
  educations: Education[]
  answerBank: AnswerBankEntry[]
  applicationRecords: ApplicationRecord[]
}
```

Create `src/shared/types/export-bundle-schema.ts`:
```ts
import { z } from 'zod'

export const exportBundleSchema = z.object({
  exportedAt: z.string(),
  profile: z.record(z.string(), z.unknown()).optional(),
  workExperiences: z.array(z.record(z.string(), z.unknown())),
  educations: z.array(z.record(z.string(), z.unknown())),
  answerBank: z.array(z.record(z.string(), z.unknown())),
  applicationRecords: z.array(z.record(z.string(), z.unknown())),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/types/export-bundle-schema.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/export-bundle.ts src/shared/types/export-bundle-schema.ts src/shared/types/export-bundle-schema.test.ts
git commit -m "feat(types): add export bundle type and shallow validation schema"
```

---

### Task 3: Export/import business logic

**Files:**
- Create: `src/shared/storage/export-import.ts`
- Create: `src/shared/storage/export-import.test.ts`

**Interfaces:**
- Consumes: `ExportBundle` (Task 2), `replaceAll` (Task 1) on `workExperienceRepository`/`educationRepository`/`answerBankRepository`/`applicationRecordRepository` (all existing), `getProfile`/`saveProfile` (existing, `src/shared/storage/profile-repository.ts`).
- Produces: `buildExportBundle(): Promise<ExportBundle>`; `restoreFromBundle(bundle: ExportBundle): Promise<void>`. Consumed by Task 4 (Options page).

- [ ] **Step 1: Write the failing test**

Create `src/shared/storage/export-import.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { answerBankRepository } from './answer-bank-repository'
import { applicationRecordRepository } from './application-record-repository'
import { educationRepository } from './education-repository'
import { buildExportBundle, restoreFromBundle } from './export-import'
import { getProfile, saveProfile } from './profile-repository'
import { workExperienceRepository } from './work-experience-repository'

const sampleProfile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  country: 'USA',
  addressLine1: '123 Main St',
  city: 'Springfield',
  province: 'IL',
  postalCode: '62704',
  workAuthorizationStatus: 'Citizen',
  sponsorshipRequired: false,
}

beforeEach(() => {
  installChromeStorageMock()
})

describe('buildExportBundle', () => {
  it('bundles all five data sources with a timestamp', async () => {
    await saveProfile(sampleProfile)
    await workExperienceRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      startMonth: 3,
      startYear: 2020,
      currentlyWorking: true,
    })

    const bundle = await buildExportBundle()

    expect(bundle.profile).toEqual(sampleProfile)
    expect(bundle.workExperiences).toHaveLength(1)
    expect(bundle.educations).toEqual([])
    expect(bundle.answerBank).toEqual([])
    expect(bundle.applicationRecords).toEqual([])
    expect(typeof bundle.exportedAt).toBe('string')
  })
})

describe('restoreFromBundle', () => {
  it('replaces all five data sources from a bundle', async () => {
    await restoreFromBundle({
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: { ...sampleProfile, firstName: 'Grace', lastName: 'Hopper' },
      workExperiences: [
        {
          id: '1',
          companyName: 'Acme',
          jobTitle: 'Engineer',
          startMonth: 3,
          startYear: 2020,
          currentlyWorking: true,
        },
      ],
      educations: [],
      answerBank: [
        {
          id: '1',
          questionKey: 'desiredSalary',
          questionLabel: 'Desired salary',
          type: 'text',
          value: '$120,000',
          isSensitive: false,
          autoFillEnabled: true,
        },
      ],
      applicationRecords: [],
    })

    expect(await getProfile()).toEqual({ ...sampleProfile, firstName: 'Grace', lastName: 'Hopper' })
    expect(await workExperienceRepository.list()).toHaveLength(1)
    expect(await educationRepository.list()).toEqual([])
    expect(await answerBankRepository.list()).toHaveLength(1)
    expect(await applicationRecordRepository.list()).toEqual([])
  })

  it('leaves an existing profile untouched when the bundle has no profile', async () => {
    await saveProfile(sampleProfile)

    await restoreFromBundle({
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: undefined,
      workExperiences: [],
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(await getProfile()).toEqual(sampleProfile)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/export-import.test.ts`
Expected: FAIL — `Cannot find module './export-import'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/storage/export-import.ts`:
```ts
import type { ExportBundle } from '../types/export-bundle'
import { answerBankRepository } from './answer-bank-repository'
import { applicationRecordRepository } from './application-record-repository'
import { educationRepository } from './education-repository'
import { getProfile, saveProfile } from './profile-repository'
import { workExperienceRepository } from './work-experience-repository'

export async function buildExportBundle(): Promise<ExportBundle> {
  const [profile, workExperiences, educations, answerBank, applicationRecords] =
    await Promise.all([
      getProfile(),
      workExperienceRepository.list(),
      educationRepository.list(),
      answerBankRepository.list(),
      applicationRecordRepository.list(),
    ])

  return {
    exportedAt: new Date().toISOString(),
    profile,
    workExperiences,
    educations,
    answerBank,
    applicationRecords,
  }
}

export async function restoreFromBundle(bundle: ExportBundle): Promise<void> {
  await Promise.all([
    bundle.profile ? saveProfile(bundle.profile) : Promise.resolve(),
    workExperienceRepository.replaceAll(bundle.workExperiences),
    educationRepository.replaceAll(bundle.educations),
    answerBankRepository.replaceAll(bundle.answerBank),
    applicationRecordRepository.replaceAll(bundle.applicationRecords),
  ])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/export-import.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/storage/export-import.ts src/shared/storage/export-import.test.ts
git commit -m "feat(storage): add export/import bundle build and restore"
```

---

### Task 4: Options page — Import / Export

**Files:**
- Create: `src/options/import-export/ImportExportPage.tsx`
- Create: `src/options/import-export/ImportExportPage.test.tsx`
- Modify: `src/options/App.tsx`
- Modify: `src/options/App.test.tsx` (add a test only — do not change the existing tests)

**Interfaces:**
- Consumes: `buildExportBundle`/`restoreFromBundle` (Task 3), `exportBundleSchema`/`ExportBundle` (Task 2).
- Produces: `ImportExportPage` component with an "Export data" button and an "Import data" file input (`aria-label`/`<label>` text: "Import data"). Wired into the Options `App.tsx` tab navigation as `'import-export'` / "Import / Export".

- [ ] **Step 1: Write the failing test**

Create `src/options/import-export/ImportExportPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { workExperienceRepository } from '../../shared/storage/work-experience-repository'
import { ImportExportPage } from './ImportExportPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('ImportExportPage', () => {
  it('imports a valid backup file and restores the data', async () => {
    const user = userEvent.setup()
    render(<ImportExportPage />)

    const bundle = {
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: {
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        phone: '555-0100',
        country: 'USA',
        addressLine1: '123 Main St',
        city: 'Springfield',
        province: 'IL',
        postalCode: '62704',
        workAuthorizationStatus: 'Citizen',
        sponsorshipRequired: false,
      },
      workExperiences: [
        {
          id: '1',
          companyName: 'Acme',
          jobTitle: 'Engineer',
          startMonth: 3,
          startYear: 2020,
          currentlyWorking: true,
        },
      ],
      educations: [],
      answerBank: [],
      applicationRecords: [],
    }
    const file = new File([JSON.stringify(bundle)], 'backup.json', { type: 'application/json' })

    await user.upload(screen.getByLabelText('Import data'), file)

    expect(
      await screen.findByText('Import successful. Your data has been restored.')
    ).toBeInTheDocument()
    expect(await workExperienceRepository.list()).toHaveLength(1)
  })

  it('shows an error for a file that is not a valid backup', async () => {
    const user = userEvent.setup()
    render(<ImportExportPage />)

    const file = new File([JSON.stringify({ foo: 'bar' })], 'not-a-backup.json', {
      type: 'application/json',
    })

    await user.upload(screen.getByLabelText('Import data'), file)

    expect(await screen.findByText('This file is not a valid backup.')).toBeInTheDocument()
  })
})
```

Add this test to the existing `describe('App', ...)` block in `src/options/App.test.tsx` (after the existing tests, before the closing `})`):
```tsx
  it('shows the import/export tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Import / Export' }))
    expect(screen.getByRole('button', { name: 'Export data' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/import-export/ImportExportPage.test.tsx src/options/App.test.tsx`
Expected: FAIL — `Cannot find module './ImportExportPage'`, and the App test fails because there is no "Import / Export" tab button yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/options/import-export/ImportExportPage.tsx`:
```tsx
import { useState, type ChangeEvent } from 'react'
import { buildExportBundle, restoreFromBundle } from '../../shared/storage/export-import'
import type { ExportBundle } from '../../shared/types/export-bundle'
import { exportBundleSchema } from '../../shared/types/export-bundle-schema'

type ImportStatus = 'idle' | 'success' | 'error'

export function ImportExportPage() {
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importError, setImportError] = useState('')

  async function handleExport() {
    const bundle = await buildExportBundle()
    const json = JSON.stringify(bundle, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workday-autofill-backup-${bundle.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      const result = exportBundleSchema.safeParse(parsed)
      if (!result.success) {
        setImportStatus('error')
        setImportError('This file is not a valid backup.')
        return
      }
      await restoreFromBundle(result.data as unknown as ExportBundle)
      setImportStatus('success')
      setImportError('')
    } catch {
      setImportStatus('error')
      setImportError('This file is not a valid backup.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section>
      <h2>Import / Export</h2>
      <div>
        <button type="button" onClick={handleExport}>
          Export data
        </button>
      </div>
      <div>
        <label htmlFor="importFile">Import data</label>
        <input
          id="importFile"
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
        />
      </div>
      {importStatus === 'success' && <p>Import successful. Your data has been restored.</p>}
      {importStatus === 'error' && <p role="alert">{importError}</p>}
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
import { WorkExperiencePage } from './work-experience/WorkExperiencePage'

const TABS = [
  { key: 'personal', label: 'Personal info' },
  { key: 'work', label: 'Work experience' },
  { key: 'education', label: 'Education' },
  { key: 'answers', label: 'Answer bank' },
  { key: 'applications', label: 'Application records' },
  { key: 'import-export', label: 'Import / Export' },
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
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/import-export/ImportExportPage.test.tsx src/options/App.test.tsx`
Expected: PASS — 2 tests passed in `ImportExportPage.test.tsx`, 3 tests passed in `App.test.tsx` (2 existing + 1 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/options/import-export/ src/options/App.tsx src/options/App.test.tsx
git commit -m "feat(options): add import/export data page"
```

---

### Task 5: Manual end-to-end verification of Import/Export in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–4.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Verify export**

In Chrome, reload the unpacked extension at `chrome://extensions` (pointing at `dist`). Open the Options page and add at least one entry to a few sections (e.g. Personal Info, one Work Experience entry, one Answer Bank entry). Go to the new "Import / Export" tab and click "Export data". Verify:
1. A JSON file downloads (named `workday-autofill-backup-<date>.json`).
2. Open the downloaded file and confirm it contains your Personal Info, the Work Experience entry, and the Answer Bank entry, plus an `exportedAt` timestamp.

- [ ] **Step 3: Verify import (restore)**

Change some data (e.g. edit the Personal Info first name, delete the Work Experience entry) so the current state differs from the exported file. Go back to the "Import / Export" tab, click "Import data", and select the JSON file downloaded in Step 2. Verify:
1. A success message appears.
2. Personal Info, Work Experience, and Answer Bank all reflect the ORIGINAL exported state (i.e. your edits/deletions were overwritten by the import), confirming `replaceAll` semantics rather than merge.
3. Autofill still works normally afterward — navigate to a Workday page and confirm the Side Panel's "Autofill current page" button still functions with the restored data.

- [ ] **Step 4: Verify a malformed file is rejected**

Create or download a JSON file that is NOT a valid backup (e.g. `{"hello": "world"}`), try to import it via the same "Import data" control, and confirm an error message appears (`This file is not a valid backup.`) and no existing data was overwritten.

- [ ] **Step 5: Report**

No commit for this task — it is verification only. Confirm to the user which checks passed, and describe anything unexpected.
