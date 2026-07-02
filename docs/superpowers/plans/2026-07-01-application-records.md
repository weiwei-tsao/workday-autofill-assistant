# Application Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user one-click "Save application" from the Side Panel — extracting company name, job title, job location, job URL, and application date from the current Workday page — and manage the saved list (edit status/notes/resume/cover-letter version, delete) from a new Options page section.

**Architecture:** A new `ApplicationRecord` domain type and `applicationRecordRepository` follow the exact same pattern as the existing list-based entities (Work Experience, Education, Answer Bank) — `createListRepository` under one `chrome.storage.local` key. A new `application-extractor.ts` content-script module does best-effort heuristic extraction from the page's own DOM/URL (company name from the Workday tenant subdomain — reliable, since it's the same hostname convention `isWorkdayPage` already relies on; job title from the page's `<h1>` falling back to `document.title`; job location from a `data-automation-id` containing "location" — both best-effort and may need correction after real-page testing, same as prior plans' heuristics). A new `SAVE_APPLICATION`/`APPLICATION_SAVED` message pair mirrors the existing `AUTOFILL_PAGE`/`AUTOFILL_RESULT` pattern: the content script owns both the DOM read (extraction) and the repository write, so the Side Panel stays thin (send message, display the response) exactly like the autofill button already does. A new Options page section (`ApplicationRecordsPage.tsx`) reuses the existing `useEntityCrudForm` hook unchanged, rendered as a table instead of a list to match the spec's required columns.

**Tech Stack:** Same as the existing scaffold — TypeScript + Vitest + React Hook Form + Zod. No new dependencies.

## Global Constraints

- TypeScript `strict: true`.
- No network calls anywhere in the codebase.
- Auto-extracted fields (company name, job title, job location) are **best-effort heuristics** — the user must be able to correct them afterward. Job URL and application date are always reliable (current tab URL, today's date) and need no correction path.
- Per spec §6.6.2, only these fields are user-editable via the Options page form: Company name, Job title, Status, Notes, Resume version, Cover letter version. Job location, Job URL, Application date, and Source platform are **not** exposed as form inputs — they're set once at save time (via extraction, or a silent default for a manually-added record) and never edited afterward.
- Per spec §6.6.3, the Options page list is a plain table with exactly these columns: Date, Company, Job title, Status, URL, Notes. No kanban, no location column.
- `sourcePlatform` is always the literal `'Workday'` — this extension only operates on Workday pages.
- Content scripts must read/write Application Record data through the new `applicationRecordRepository` (`src/shared/storage/application-record-repository.ts`) — never call `chrome.storage.local` directly.
- The content script owns both extraction and the repository write for `SAVE_APPLICATION` (mirrors the existing `AUTOFILL_PAGE` pattern) — the Side Panel never calls a repository directly.

---

### Task 1: ApplicationRecord type and repository

**Files:**
- Create: `src/shared/types/application-record.ts`
- Create: `src/shared/storage/application-record-repository.ts`
- Create: `src/shared/storage/application-record-repository.test.ts`

**Interfaces:**
- Produces: `ApplicationStatus = 'Applied' | 'Draft' | 'Interested'`; `ApplicationRecord { id: string; companyName: string; jobTitle: string; jobLocation?: string; jobUrl?: string; applicationDate: string; sourcePlatform: 'Workday'; status: ApplicationStatus; notes?: string; resumeVersion?: string; coverLetterVersion?: string }`; `applicationRecordRepository` with the standard `list`/`add`/`update`/`remove` shape from `createListRepository`. Consumed by every later task in this plan.

- [ ] **Step 1: Write the failing test**

Create `src/shared/storage/application-record-repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { applicationRecordRepository } from './application-record-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('applicationRecordRepository', () => {
  it('round-trips an application record under the applicationRecords key', async () => {
    await applicationRecordRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Software Engineer',
      jobLocation: 'Remote',
      jobUrl: 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1',
      applicationDate: '2026-07-01',
      sourcePlatform: 'Workday',
      status: 'Applied',
    })

    expect(await applicationRecordRepository.list()).toEqual([
      {
        id: '1',
        companyName: 'Acme',
        jobTitle: 'Software Engineer',
        jobLocation: 'Remote',
        jobUrl: 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1',
        applicationDate: '2026-07-01',
        sourcePlatform: 'Workday',
        status: 'Applied',
      },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/storage/application-record-repository.test.ts`
Expected: FAIL — `Cannot find module './application-record-repository'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/types/application-record.ts`:
```ts
export type ApplicationStatus = 'Applied' | 'Draft' | 'Interested'

export interface ApplicationRecord {
  id: string
  companyName: string
  jobTitle: string
  jobLocation?: string
  jobUrl?: string
  applicationDate: string
  sourcePlatform: 'Workday'
  status: ApplicationStatus
  notes?: string
  resumeVersion?: string
  coverLetterVersion?: string
}
```

Create `src/shared/storage/application-record-repository.ts`:
```ts
import type { ApplicationRecord } from '../types/application-record'
import { createListRepository } from './list-repository'

export const applicationRecordRepository =
  createListRepository<ApplicationRecord>('applicationRecords')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/storage/application-record-repository.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/application-record.ts src/shared/storage/application-record-repository.ts src/shared/storage/application-record-repository.test.ts
git commit -m "feat(storage): add application record type and repository"
```

---

### Task 2: Application info extractor (content script)

**Files:**
- Create: `src/content/application-extractor.ts`
- Create: `src/content/application-extractor.test.ts`

**Interfaces:**
- Produces: `ExtractedApplicationInfo { companyName: string; jobTitle: string; jobLocation: string; jobUrl: string; applicationDate: string }`; `extractApplicationInfo(doc?: Document, href?: string, hostname?: string): ExtractedApplicationInfo`. Consumed by Task 3 (content script wiring).

- [ ] **Step 1: Write the failing test**

Create `src/content/application-extractor.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { extractApplicationInfo } from './application-extractor'

describe('extractApplicationInfo', () => {
  it('derives company name from the Workday tenant subdomain', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.companyName).toBe('Acme')
  })

  it('extracts the job title from the page h1', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobTitle).toBe('Software Engineer')
  })

  it('falls back to document.title when there is no h1', () => {
    document.body.innerHTML = ''
    document.title = 'Software Engineer - Acme Careers'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobTitle).toBe('Software Engineer - Acme Careers')
  })

  it('extracts job location from a data-automation-id containing "location"', () => {
    document.body.innerHTML = '<div data-automation-id="jobPostingLocation">Remote - USA</div>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobLocation).toBe('Remote - USA')
  })

  it('returns an empty string for job location when no matching element exists', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobLocation).toBe('')
  })

  it('always uses the provided URL as jobUrl and today as applicationDate', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'
    const today = new Date().toISOString().split('T')[0]

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/42',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobUrl).toBe('https://acme.wd5.myworkdayjobs.com/en-US/careers/job/42')
    expect(info.applicationDate).toBe(today)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/application-extractor.test.ts`
Expected: FAIL — `Cannot find module './application-extractor'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/content/application-extractor.ts`:
```ts
export interface ExtractedApplicationInfo {
  companyName: string
  jobTitle: string
  jobLocation: string
  jobUrl: string
  applicationDate: string
}

function extractCompanyName(hostname: string): string {
  const subdomain = hostname.split('.')[0]
  if (!subdomain) return ''
  return subdomain.charAt(0).toUpperCase() + subdomain.slice(1)
}

function extractJobTitle(doc: Document): string {
  const heading = doc.querySelector('h1')
  if (heading?.textContent?.trim()) return heading.textContent.trim()
  return doc.title.trim()
}

function extractJobLocation(doc: Document): string {
  const candidate = doc.querySelector('[data-automation-id*="location" i]')
  return candidate?.textContent?.trim() ?? ''
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function extractApplicationInfo(
  doc: Document = document,
  href: string = location.href,
  hostname: string = location.hostname
): ExtractedApplicationInfo {
  return {
    companyName: extractCompanyName(hostname),
    jobTitle: extractJobTitle(doc),
    jobLocation: extractJobLocation(doc),
    jobUrl: href,
    applicationDate: todayIsoDate(),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/application-extractor.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/application-extractor.ts src/content/application-extractor.test.ts
git commit -m "feat(content): add best-effort application info extractor"
```

---

### Task 3: Wire SAVE_APPLICATION into the content script

**Files:**
- Modify: `src/shared/messaging/messages.ts`
- Modify: `src/content/index.ts`
- Modify: `src/content/index.test.ts` (add tests only — do not change the existing tests)

**Interfaces:**
- Consumes: `extractApplicationInfo` (Task 2), `applicationRecordRepository` (Task 1).
- Produces: `SaveApplicationMessage { type: 'SAVE_APPLICATION' }`, `ApplicationSavedMessage { type: 'APPLICATION_SAVED'; record: ApplicationRecord }`, both added to the `ExtensionMessage` union. A new `SAVE_APPLICATION` branch in the `AUTOFILL_PAGE` handler's sibling `chrome.runtime.onMessage` listener. Consumed by Task 5 (Side Panel wiring).

- [ ] **Step 1: Write the failing test**

Add this import to the top of `src/content/index.test.ts` (alongside the existing imports):
```ts
import { applicationRecordRepository } from '../shared/storage/application-record-repository'
```

Add this test to the existing `describe('content script entry', ...)` block in `src/content/index.test.ts` (after the existing tests, before the closing `})`):
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/index.test.ts`
Expected: FAIL — the current handler has no `SAVE_APPLICATION` branch, so `chrome.tabs.sendMessage` resolves `undefined` and `response.type` throws or is `undefined`.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/shared/messaging/messages.ts`:
```ts
import type { ApplicationRecord } from '../types/application-record'

export interface AutofillSummary {
  detected: number
  filled: number
  needsReview: number
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
  summary: AutofillSummary
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

        sendResponse({ type: 'AUTOFILL_RESULT', summary })
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
Expected: PASS — 12 tests passed (11 existing + 1 new). Double-check the actual pre-existing count in the file rather than assuming.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/messaging/messages.ts src/content/index.ts src/content/index.test.ts
git commit -m "feat(content): extract and save application records"
```

---

### Task 4: Options page — Application Records list and edit form

**Files:**
- Create: `src/options/application-records/application-record-schema.ts`
- Create: `src/options/application-records/ApplicationRecordsPage.tsx`
- Create: `src/options/application-records/ApplicationRecordsPage.test.tsx`
- Modify: `src/options/App.tsx`
- Modify: `src/options/App.test.tsx` (add a test only — do not change the existing test)

**Interfaces:**
- Consumes: `applicationRecordRepository` (Task 1), `useEntityCrudForm` (existing, `src/shared/storage/use-entity-crud-form.ts`, unchanged signature).
- Produces: `applicationRecordFormSchema` (zod), `ApplicationRecordFormValues` (`z.input` of that schema), `ApplicationRecordsPage` component rendering a table (`aria-label="Application records list"`) and a form (`aria-label="Application record form"`). Wired into the Options `App.tsx` tab navigation as `'applications'` / "Application records".

- [ ] **Step 1: Write the failing test**

Create `src/options/application-records/ApplicationRecordsPage.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { ApplicationRecordsPage } from './ApplicationRecordsPage'

beforeEach(() => {
  installChromeStorageMock()
})

async function addSampleRecord(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Company name'), 'Acme')
  await user.type(screen.getByLabelText('Job title'), 'Software Engineer')
  await user.click(screen.getByRole('button', { name: 'Add record' }))
}

describe('ApplicationRecordsPage', () => {
  it('adds an application record and lists it', async () => {
    const user = userEvent.setup()
    render(<ApplicationRecordsPage />)

    await addSampleRecord(user)

    const list = await screen.findByLabelText('Application records list')
    expect(within(list).getByText('Acme')).toBeInTheDocument()
    expect(within(list).getByText('Software Engineer')).toBeInTheDocument()
    expect(within(list).getByText('Applied')).toBeInTheDocument()
  })

  it('deletes an application record', async () => {
    const user = userEvent.setup()
    render(<ApplicationRecordsPage />)

    await addSampleRecord(user)

    const list = await screen.findByLabelText('Application records list')
    await user.click(within(list).getByRole('button', { name: 'Delete' }))

    expect(within(list).queryByText('Acme')).not.toBeInTheDocument()
  })
})
```

Add this test to the existing `describe('App', ...)` block in `src/options/App.test.tsx` (after the existing test, before the closing `})`):
```tsx
  it('shows the application records tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Application records' }))
    expect(screen.getByLabelText('Application record form')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/options/application-records/ApplicationRecordsPage.test.tsx src/options/App.test.tsx`
Expected: FAIL — `Cannot find module './ApplicationRecordsPage'`, and the App test fails because there is no "Application records" tab button yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/options/application-records/application-record-schema.ts`:
```ts
import { z } from 'zod'

export const applicationRecordFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  status: z.enum(['Applied', 'Draft', 'Interested']),
  notes: z.string().optional(),
  resumeVersion: z.string().optional(),
  coverLetterVersion: z.string().optional(),
  applicationDate: z.string(),
  sourcePlatform: z.literal('Workday'),
})

export type ApplicationRecordFormValues = z.input<typeof applicationRecordFormSchema>
```

Create `src/options/application-records/ApplicationRecordsPage.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { applicationRecordRepository } from '../../shared/storage/application-record-repository'
import { useEntityCrudForm } from '../../shared/storage/use-entity-crud-form'
import type { ApplicationRecord } from '../../shared/types/application-record'
import {
  applicationRecordFormSchema,
  type ApplicationRecordFormValues,
} from './application-record-schema'

const emptyValues: ApplicationRecordFormValues = {
  companyName: '',
  jobTitle: '',
  status: 'Applied',
  notes: '',
  resumeVersion: '',
  coverLetterVersion: '',
  applicationDate: new Date().toISOString().split('T')[0],
  sourcePlatform: 'Workday',
}

export function ApplicationRecordsPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationRecordFormValues>({
    resolver: zodResolver(applicationRecordFormSchema),
    defaultValues: emptyValues,
  })
  const { items, editingId, submit, startEdit, remove } = useEntityCrudForm<
    ApplicationRecord,
    ApplicationRecordFormValues
  >('applicationRecords', applicationRecordRepository, emptyValues, reset)

  const onSubmit = handleSubmit(submit)

  return (
    <section>
      <h2>Application records</h2>
      <table aria-label="Application records list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Company</th>
            <th>Job title</th>
            <th>Status</th>
            <th>URL</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.applicationDate}</td>
              <td>{item.companyName}</td>
              <td>{item.jobTitle}</td>
              <td>{item.status}</td>
              <td>{item.jobUrl ?? ''}</td>
              <td>{item.notes ?? ''}</td>
              <td>
                <button type="button" onClick={() => startEdit(item)}>
                  Edit
                </button>
                <button type="button" onClick={() => remove(item.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        onSubmit={onSubmit}
        aria-label="Application record form"
        className="space-y-2 max-w-xl"
      >
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
          <label htmlFor="status">Status</label>
          <select id="status" {...register('status')}>
            <option value="Applied">Applied</option>
            <option value="Draft">Draft</option>
            <option value="Interested">Interested</option>
          </select>
        </div>
        <div>
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" {...register('notes')} />
        </div>
        <div>
          <label htmlFor="resumeVersion">Resume version</label>
          <input id="resumeVersion" {...register('resumeVersion')} />
        </div>
        <div>
          <label htmlFor="coverLetterVersion">Cover letter version</label>
          <input id="coverLetterVersion" {...register('coverLetterVersion')} />
        </div>
        <button type="submit">{editingId ? 'Update record' : 'Add record'}</button>
      </form>
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
import { PersonalInfoPage } from './personal-info/PersonalInfoPage'
import { WorkExperiencePage } from './work-experience/WorkExperiencePage'

const TABS = [
  { key: 'personal', label: 'Personal info' },
  { key: 'work', label: 'Work experience' },
  { key: 'education', label: 'Education' },
  { key: 'answers', label: 'Answer bank' },
  { key: 'applications', label: 'Application records' },
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
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/options/application-records/ApplicationRecordsPage.test.tsx src/options/App.test.tsx`
Expected: PASS — 2 tests passed in `ApplicationRecordsPage.test.tsx`, 2 tests passed in `App.test.tsx` (1 existing + 1 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/options/application-records/ src/options/App.tsx src/options/App.test.tsx
git commit -m "feat(options): add application records list and edit form"
```

---

### Task 5: Side Panel — "Save application" button

**Files:**
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/App.test.tsx` (add a test only — do not change the existing tests)

**Interfaces:**
- Consumes: `SAVE_APPLICATION`/`APPLICATION_SAVED` messages (Task 3).
- Produces: a "Save application" button rendered alongside the existing "Autofill current page" button, showing a confirmation message with the saved record's job title and company name on success.

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('Side Panel App', ...)` block in `src/sidepanel/App.test.tsx` (after the existing tests, before the closing `})`):
```tsx
  it('saves the application and displays a confirmation when the button is clicked', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'SAVE_APPLICATION') {
          sendResponse({
            type: 'APPLICATION_SAVED',
            record: {
              id: '1',
              companyName: 'Acme',
              jobTitle: 'Software Engineer',
              applicationDate: '2026-07-01',
              sourcePlatform: 'Workday',
              status: 'Applied',
            },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')

    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(
      await screen.findByText('Saved application for Software Engineer at Acme.')
    ).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/sidepanel/App.test.tsx`
Expected: FAIL — there is no "Save application" button yet.

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
            <p>
              Detected {summary.detected} supported fields. Filled {summary.filled} fields.
              {summary.needsReview > 0 ? ` ${summary.needsReview} fields require review.` : ''}
            </p>
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
Expected: PASS — 5 tests passed (4 existing + 1 new). Double-check the actual pre-existing count in the file rather than assuming.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/App.tsx src/sidepanel/App.test.tsx
git commit -m "feat(sidepanel): add save application button and confirmation"
```

---

### Task 6: Manual end-to-end verification of Application Records in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–5.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Verify the save flow on a real Workday job posting page**

In Chrome, reload the unpacked extension at `chrome://extensions` (pointing at `dist`). Navigate to a real Workday job posting or application page (refresh the tab so the content script is freshly injected), open the Side Panel, and click "Save application". Verify:
1. A confirmation message appears with a job title and company name.
2. Open the Options page's "Application records" tab and confirm the new row appears with today's date, the extracted company/job title, status "Applied", and the page's URL.
3. Check whether the extracted company name (from the URL subdomain) and job title (from `<h1>`/page title) are actually correct for this real page — if either is wrong, that's expected best-effort territory, not a blocker; note what the real value should have been.

- [ ] **Step 3: Verify editing and deleting**

On the Options page's Application records tab: click "Edit" on the saved row, change the Status to "Interested" and add a Note, click "Update record", and confirm the table reflects the change. Then click "Delete" and confirm the row disappears.

- [ ] **Step 4: Report**

No commit for this task — it is verification only. Confirm to the user which checks passed, and describe any extraction mismatch (wrong company name or job title) so it can be refined in a future pass — this is expected iteration territory, matching how the section-heading and field-matching heuristics in prior plans needed real-page correction too.
