# Work Experience & Education Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing autofill pipeline to also fill Work Experience and Education fields, disambiguating field names that collide between sections (e.g. "Location" and "Start Year" appear in both), reusing the same "Autofill current page" button.

**Architecture:** The Field Scanner is extended to capture each field's nearest preceding section heading text. The Field Dictionary gains Work Experience and Education entries, each tagged with which section they belong to (personal-info entries stay untagged/section-agnostic, unchanged). The Matcher detects the field's section from its heading text and only scores dictionary entries whose section matches (or is untagged), resolving the "Location"/"Start Year" collisions. The Executor gains a generalized value-writer (strings, numbers, and checkboxes — Work Experience/Education have non-string fields like `startYear: number` and `currentlyWorking: boolean`) and a new `autofillSectionFields` function for list-entity data. The content script's existing `AUTOFILL_PAGE` handler is extended to also read the first stored Work Experience and Education entry and sum all three summaries (personal info + work experience + education) into one response — the Side Panel button and UI are unchanged.

**Scope decision:** This plan fills only the **first** stored Work Experience/Education entry (`workExperiences[0]`/`educations[0]`) for whatever matching fields are found on the page. It does not attempt to detect multiple repeated DOM blocks or track "next unfilled entry" across separate button clicks — that would require heuristics this plan can't validate without real, varied Workday markup. If the user has added a second blank entry block on the page (via Workday's own "Add" button) and clicks Autofill again, both blocks' matching fields get the same first-entry data. This is a deliberate, documented simplification, not an oversight.

**Tech Stack:** Same as the existing scaffold — TypeScript + Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`.
- No network calls anywhere in the codebase.
- Only `high`-confidence field matches (score ≥ 60) are auto-filled. `medium`-confidence matches (30–59) are counted as "needs review" but never written to. `low`-confidence and unmatched fields are ignored entirely.
- After writing a field's value, dispatch `input`, `change`, and `blur` DOM events in that order (`bubbles: true`).
- Fills only the first stored entry per list type (`workExperiences[0]`/`educations[0]`) — see Scope decision above. No multi-block DOM indexing, no cross-click "next entry" tracking.
- Section detection is a best-effort heuristic (nearest preceding heading text matched against `/work\s*experience/i` or `/education/i`) — not guaranteed correct against every possible page structure.
- Personal-info fields (firstName/lastName/email/phone/linkedinUrl/postalCode) remain section-agnostic — they must still match anywhere on the page, exactly as before this plan (no regression to the existing Autofill Executor plan's behavior).
- Content scripts must read Work Experience/Education data through the existing `workExperienceRepository`/`educationRepository` (`src/shared/storage/`) — never call `chrome.storage.local` directly.

---

### Task 1: Field Scanner — capture section heading context

**Files:**
- Modify: `src/content/scanner.ts`
- Modify: `src/content/scanner.test.ts` (add tests only — do not remove or change the three existing tests)

**Interfaces:**
- Produces: `ScannedField` gains a new field `sectionHeadingText: string` (empty string when no heading precedes the field). `scanFields`'s signature is unchanged. Consumed by Task 3 (Matcher).

- [ ] **Step 1: Write the failing test**

Add these three tests to the existing `describe('scanFields', ...)` block in `src/content/scanner.test.ts` (after the existing three tests, before the closing `})`):
```ts
  it('captures the nearest preceding section heading for a field', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <div class="entry">
          <label for="companyName">Company Name</label>
          <input id="companyName" name="companyName" />
        </div>
      </section>
    `

    const fields = scanFields(document)

    expect(fields[0].sectionHeadingText).toBe('Work Experience')
  })

  it('returns an empty string when there is no preceding heading', () => {
    document.body.innerHTML = '<label for="firstName">First Name</label><input id="firstName" />'

    const fields = scanFields(document)

    expect(fields[0].sectionHeadingText).toBe('')
  })

  it('finds the correct heading when multiple sections precede the field', () => {
    document.body.innerHTML = `
      <section>
        <h2>Personal Information</h2>
        <input id="firstName" aria-label="First Name" />
      </section>
      <section>
        <h2>Education</h2>
        <input id="schoolName" aria-label="School Name" />
      </section>
    `

    const fields = scanFields(document)

    expect(fields[0].sectionHeadingText).toBe('Personal Information')
    expect(fields[1].sectionHeadingText).toBe('Education')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/scanner.test.ts`
Expected: FAIL — `fields[0].sectionHeadingText` is `undefined` (the property doesn't exist yet), so `toBe('Work Experience')` etc. fail. The three pre-existing tests still pass.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/scanner.ts`:
```ts
export interface ScannedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  labelText: string
  ariaLabel: string
  placeholder: string
  name: string
  id: string
  sectionHeadingText: string
}

const FIELD_SELECTOR =
  'input[type="text"], input[type="email"], input[type="tel"], input:not([type]), ' +
  'textarea, select, input[type="checkbox"], input[type="radio"]'

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]'

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

function findSectionHeadingText(element: Element): string {
  let current: Element | null = element

  while (current) {
    let sibling: Element | null = current.previousElementSibling
    while (sibling) {
      if (sibling.matches(HEADING_SELECTOR)) {
        return sibling.textContent?.trim() ?? ''
      }
      const nestedHeading = sibling.querySelector(HEADING_SELECTOR)
      if (nestedHeading?.textContent) {
        return nestedHeading.textContent.trim()
      }
      sibling = sibling.previousElementSibling
    }
    current = current.parentElement
  }

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
    sectionHeadingText: findSectionHeadingText(element),
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/scanner.test.ts`
Expected: PASS — 6 tests passed (3 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/content/scanner.ts src/content/scanner.test.ts
git commit -m "feat(content): capture nearest section heading text per field"
```

---

### Task 2: Field Dictionary — add Work Experience and Education entries

**Files:**
- Modify: `src/content/field-dictionary.ts`
- Modify: `src/content/field-dictionary.test.ts` (add tests only — do not change the existing test)

**Interfaces:**
- Produces: `FieldSection = 'workExperience' | 'education'`, `FieldDictionaryEntry` gains an optional `section?: FieldSection` field (personal-info entries leave it `undefined`, meaning section-agnostic). `FIELD_DICTIONARY` gains 9 Work Experience entries and 8 Education entries. Consumed by Task 3 (Matcher) and Task 4 (Executor, for the `FieldSection` type).

- [ ] **Step 1: Write the failing test**

Add these tests to `src/content/field-dictionary.test.ts` (after the existing `it`, inside the same `describe('FIELD_DICTIONARY', ...)` block):
```ts
  it('tags work experience fields with the workExperience section', () => {
    const byKey = (key: string, section: string) =>
      FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key && entry.section === section)

    expect(byKey('companyName', 'workExperience')?.patterns.some((p) => p.test('Company Name'))).toBe(
      true
    )
    expect(byKey('jobTitle', 'workExperience')?.patterns.some((p) => p.test('Job Title'))).toBe(true)
    expect(byKey('startYear', 'workExperience')?.patterns.some((p) => p.test('Start Year'))).toBe(true)
    expect(
      byKey('currentlyWorking', 'workExperience')?.patterns.some((p) => p.test('Currently Working'))
    ).toBe(true)
  })

  it('tags education fields with the education section', () => {
    const byKey = (key: string, section: string) =>
      FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key && entry.section === section)

    expect(byKey('schoolName', 'education')?.patterns.some((p) => p.test('School Name'))).toBe(true)
    expect(byKey('degree', 'education')?.patterns.some((p) => p.test('Degree'))).toBe(true)
    expect(byKey('fieldOfStudy', 'education')?.patterns.some((p) => p.test('Field of Study'))).toBe(
      true
    )
    expect(byKey('gpa', 'education')?.patterns.some((p) => p.test('GPA'))).toBe(true)
  })

  it('leaves personal-info fields section-agnostic', () => {
    const firstNameEntry = FIELD_DICTIONARY.find((entry) => entry.canonicalKey === 'firstName')
    expect(firstNameEntry?.section).toBeUndefined()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: FAIL — `byKey('companyName', 'workExperience')` returns `undefined` since no such entry exists yet.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/field-dictionary.ts`:
```ts
export type FieldSection = 'workExperience' | 'education'

export interface FieldDictionaryEntry {
  canonicalKey: string
  patterns: RegExp[]
  section?: FieldSection
}

export const FIELD_DICTIONARY: FieldDictionaryEntry[] = [
  // Personal info — section-agnostic, matches anywhere on the page
  { canonicalKey: 'firstName', patterns: [/first\s*name/i, /given\s*name/i] },
  { canonicalKey: 'lastName', patterns: [/last\s*name/i, /family\s*name/i, /surname/i] },
  { canonicalKey: 'email', patterns: [/email/i] },
  { canonicalKey: 'phone', patterns: [/phone/i, /mobile/i] },
  { canonicalKey: 'linkedinUrl', patterns: [/linkedin/i] },
  { canonicalKey: 'postalCode', patterns: [/postal\s*code/i, /zip\s*code/i, /\bzip\b/i] },

  // Work experience
  {
    canonicalKey: 'companyName',
    patterns: [/company\s*name/i, /employer/i],
    section: 'workExperience',
  },
  {
    canonicalKey: 'jobTitle',
    patterns: [/job\s*title/i, /position\s*title/i],
    section: 'workExperience',
  },
  { canonicalKey: 'location', patterns: [/location/i], section: 'workExperience' },
  { canonicalKey: 'startMonth', patterns: [/start\s*month/i], section: 'workExperience' },
  { canonicalKey: 'startYear', patterns: [/start\s*year/i], section: 'workExperience' },
  { canonicalKey: 'endMonth', patterns: [/end\s*month/i], section: 'workExperience' },
  { canonicalKey: 'endYear', patterns: [/end\s*year/i], section: 'workExperience' },
  {
    canonicalKey: 'currentlyWorking',
    patterns: [/currently\s*working/i, /current\s*(position|role|job)/i],
    section: 'workExperience',
  },
  {
    canonicalKey: 'description',
    patterns: [/description/i, /responsibilities/i],
    section: 'workExperience',
  },

  // Education
  {
    canonicalKey: 'schoolName',
    patterns: [/school\s*name/i, /\bschool\b/i, /university/i, /institution/i],
    section: 'education',
  },
  { canonicalKey: 'degree', patterns: [/degree/i], section: 'education' },
  {
    canonicalKey: 'fieldOfStudy',
    patterns: [/field\s*of\s*study/i, /major/i],
    section: 'education',
  },
  { canonicalKey: 'location', patterns: [/location/i], section: 'education' },
  { canonicalKey: 'startYear', patterns: [/start\s*year/i], section: 'education' },
  { canonicalKey: 'endYear', patterns: [/end\s*year/i], section: 'education' },
  { canonicalKey: 'gpa', patterns: [/\bgpa\b/i], section: 'education' },
  { canonicalKey: 'description', patterns: [/description/i], section: 'education' },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/field-dictionary.test.ts`
Expected: PASS — 4 tests passed (1 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/content/field-dictionary.ts src/content/field-dictionary.test.ts
git commit -m "feat(content): add work experience and education dictionary entries"
```

---

### Task 3: Matcher — section-aware scoring

**Files:**
- Modify: `src/content/matcher.ts`
- Modify: `src/content/matcher.test.ts` (add a new `describe` block only — do not change the existing tests)

**Interfaces:**
- Consumes: `ScannedField.sectionHeadingText` (Task 1), `FieldDictionaryEntry.section`/`FieldSection` (Task 2).
- Produces: `FieldMatch` gains a new field `section: FieldSection | null` (the field's detected section, independent of whether a dictionary match succeeded — `null` means no section heading matched, which is also what section-agnostic personal-info fields get). `matchField`/`matchFields` signatures are unchanged. Consumed by Task 4 (Executor) and Task 5 (content script wiring).

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/content/matcher.test.ts` (after the existing `describe('matchFields', ...)` block):
```ts
describe('section-aware matching', () => {
  it('matches a Work Experience field only when the section heading indicates Work Experience', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
      </section>
    `
    const field = scanFields(document)[0]

    const match = matchField(field)

    expect(match.canonicalKey).toBe('companyName')
    expect(match.section).toBe('workExperience')
    expect(match.confidence).toBe('high')
  })

  it('disambiguates "Location" between Work Experience and Education sections', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <input aria-label="Location" />
      </section>
      <section>
        <h2>Education</h2>
        <input aria-label="Location" />
      </section>
    `
    const fields = scanFields(document)

    const workExperienceMatch = matchField(fields[0])
    const educationMatch = matchField(fields[1])

    expect(workExperienceMatch.canonicalKey).toBe('location')
    expect(workExperienceMatch.section).toBe('workExperience')
    expect(educationMatch.canonicalKey).toBe('location')
    expect(educationMatch.section).toBe('education')
  })

  it('does not match a work-experience-only field when there is no section heading', () => {
    document.body.innerHTML = '<label for="cn">Company Name</label><input id="cn" name="cn" />'
    const field = scanFields(document)[0]

    const match = matchField(field)

    expect(match.canonicalKey).toBeNull()
    expect(match.section).toBeNull()
  })

  it('still matches section-agnostic personal-info fields inside a labelled section', () => {
    document.body.innerHTML = `
      <section>
        <h2>Personal Information</h2>
        <label for="email">Email Address</label>
        <input id="email" name="email" type="email" />
      </section>
    `
    const field = scanFields(document)[0]

    const match = matchField(field)

    expect(match.canonicalKey).toBe('email')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/matcher.test.ts`
Expected: FAIL — `match.section` is `undefined` (the property doesn't exist yet), so `toBe('workExperience')` etc. fail. Also, without section filtering, the first test's "Company Name" field would still match correctly by coincidence (no competing entry), but the second test's two "Location" fields would both resolve to whichever `location` dictionary entry appears first in the array (both showing the same section, failing the disambiguation assertion).

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/matcher.ts`:
```ts
import { FIELD_DICTIONARY, type FieldSection } from './field-dictionary'
import type { ScannedField } from './scanner'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface FieldMatch {
  field: ScannedField
  canonicalKey: string | null
  section: FieldSection | null
  score: number
  confidence: ConfidenceLevel
}

const WORK_EXPERIENCE_HEADING_PATTERN = /work\s*experience/i
const EDUCATION_HEADING_PATTERN = /education/i

function detectSection(sectionHeadingText: string): FieldSection | null {
  if (WORK_EXPERIENCE_HEADING_PATTERN.test(sectionHeadingText)) return 'workExperience'
  if (EDUCATION_HEADING_PATTERN.test(sectionHeadingText)) return 'education'
  return null
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
  const section = detectSection(field.sectionHeadingText)

  let bestKey: string | null = null
  let bestScore = 0

  for (const entry of FIELD_DICTIONARY) {
    if (entry.section && entry.section !== section) continue
    const score = scoreAgainstEntry(field, entry.patterns)
    if (score > bestScore) {
      bestScore = score
      bestKey = entry.canonicalKey
    }
  }

  return {
    field,
    canonicalKey: bestScore > 0 ? bestKey : null,
    section,
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
Expected: PASS — 9 tests passed (5 existing + 4 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/matcher.ts src/content/matcher.test.ts
git commit -m "feat(content): detect field section and filter dictionary matches by it"
```

---

### Task 4: Executor — generalized value writing and section-scoped autofill

**Files:**
- Modify: `src/content/executor.ts`
- Modify: `src/content/executor.test.ts` (add a new `describe` block only — do not change the existing tests)

**Interfaces:**
- Consumes: `FieldSection` (Task 2), `FieldMatch.section` (Task 3), `WorkExperience`/`Education` (existing, `src/shared/types/`).
- Produces: `autofillFields` (existing signature, unchanged, but its value-write path now also handles numbers/booleans — the four existing Profile-based tests are unaffected since every `Profile` field `autofillFields` reads is a string). New: `autofillSectionFields(matches: FieldMatch[], section: FieldSection, entry: Record<string, unknown> | undefined): AutofillSummary`. Consumed by Task 5 (content script wiring).

- [ ] **Step 1: Write the failing test**

Add these imports to the top of `src/content/executor.test.ts` (alongside the existing imports):
```ts
import type { WorkExperience } from '../shared/types/work-experience'
```

Add this `describe` block to `src/content/executor.test.ts` (after the existing `describe('autofillFields', ...)` block):
```ts
describe('autofillSectionFields', () => {
  const workExperience: WorkExperience = {
    id: '1',
    companyName: 'Acme',
    jobTitle: 'Engineer',
    startMonth: 3,
    startYear: 2020,
    currentlyWorking: true,
  }

  it('fills high-confidence work experience fields, including numbers and checkboxes', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
        <label for="startYear">Start Year</label>
        <input id="startYear" name="startYear" type="number" />
        <label for="currentlyWorking">Currently Working</label>
        <input id="currentlyWorking" name="currentlyWorking" type="checkbox" />
      </section>
    `
    const matches = matchFields(scanFields(document))

    const summary = autofillSectionFields(matches, 'workExperience', workExperience)

    expect((document.getElementById('companyName') as HTMLInputElement).value).toBe('Acme')
    expect((document.getElementById('startYear') as HTMLInputElement).value).toBe('2020')
    expect((document.getElementById('currentlyWorking') as HTMLInputElement).checked).toBe(true)
    expect(summary).toEqual({ detected: 3, filled: 3, needsReview: 0 })
  })

  it('ignores matches from a different section', () => {
    document.body.innerHTML = `
      <section>
        <h2>Education</h2>
        <label for="schoolName">School Name</label>
        <input id="schoolName" name="schoolName" />
      </section>
    `
    const matches = matchFields(scanFields(document))

    const summary = autofillSectionFields(matches, 'workExperience', workExperience)

    expect((document.getElementById('schoolName') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 0, filled: 0, needsReview: 0 })
  })

  it('reports zero filled fields when no entry is provided', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
      </section>
    `
    const matches = matchFields(scanFields(document))

    const summary = autofillSectionFields(matches, 'workExperience', undefined)

    expect((document.getElementById('companyName') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/executor.test.ts`
Expected: FAIL — `Cannot find name 'autofillSectionFields'` (not exported yet). The existing `autofillFields` tests still pass.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/executor.ts`:
```ts
import type { AutofillSummary } from '../shared/messaging/messages'
import type { Profile } from '../shared/types/profile'
import type { FieldSection } from './field-dictionary'
import type { FieldMatch } from './matcher'

type FillableValue = string | number | boolean

function hasFillableValue(value: unknown): value is FillableValue {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.length > 0
  return typeof value === 'number' || typeof value === 'boolean'
}

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
}

export function autofillFields(matches: FieldMatch[], profile: Profile): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.canonicalKey === null || match.confidence === 'low') continue
    detected++

    if (match.confidence === 'high') {
      const value = profile[match.canonicalKey as keyof Profile]
      if (hasFillableValue(value)) {
        setFieldValue(match.field.element, value)
        filled++
      }
    } else if (match.confidence === 'medium') {
      needsReview++
    }
  }

  return { detected, filled, needsReview }
}

export function autofillSectionFields(
  matches: FieldMatch[],
  section: FieldSection,
  entry: Record<string, unknown> | undefined
): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.section !== section) continue
    if (match.canonicalKey === null || match.confidence === 'low') continue
    detected++

    if (match.confidence === 'high') {
      const value = entry?.[match.canonicalKey]
      if (hasFillableValue(value)) {
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
Expected: PASS — 7 tests passed (4 existing + 3 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass — confirm in particular that all 4 pre-existing `autofillFields` tests (Profile-based) still pass unchanged, proving the generalized `hasFillableValue`/`setFieldValue` didn't regress Phase 4 behavior.

- [ ] **Step 6: Commit**

```bash
git add src/content/executor.ts src/content/executor.test.ts
git commit -m "feat(content): generalize field writer and add section-scoped autofill"
```

---

### Task 5: Wire Work Experience and Education into the content script's AUTOFILL_PAGE handler

**Files:**
- Modify: `src/content/index.ts`
- Modify: `src/content/index.test.ts` (add tests only — do not change the existing tests)

**Interfaces:**
- Consumes: `autofillSectionFields` (Task 4), `workExperienceRepository`/`educationRepository` (existing, `src/shared/storage/`).
- Produces: the `AUTOFILL_PAGE` handler now also fills Work Experience and Education fields from the first stored entry of each, merging all three summaries (personal info + work experience + education) into the single `AUTOFILL_RESULT` response. This is the last task in this plan with automated tests — Task 6 is manual browser verification.

- [ ] **Step 1: Write the failing test**

Add these imports to the top of `src/content/index.test.ts` (alongside the existing imports):
```ts
import { educationRepository } from '../shared/storage/education-repository'
import { workExperienceRepository } from '../shared/storage/work-experience-repository'
```

Add these three tests to the existing `describe('content script entry', ...)` block in `src/content/index.test.ts` (after the existing tests, before the closing `})`):
```ts
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
      summary: { detected: 1, filled: 1, needsReview: 0 },
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
      summary: { detected: 1, filled: 1, needsReview: 0 },
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
      summary: { detected: 2, filled: 2, needsReview: 0 },
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/index.test.ts`
Expected: FAIL — the current handler never reads `workExperienceRepository`/`educationRepository`, so no Work Experience/Education fields ever get filled; the three new tests' `filled`/`detected` counts come back lower than expected (0 instead of 1, etc). The pre-existing tests still pass.

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `src/content/index.ts`:
```ts
import { getProfile } from '../shared/storage/profile-repository'
import { educationRepository } from '../shared/storage/education-repository'
import { workExperienceRepository } from '../shared/storage/work-experience-repository'
import type {
  AutofillResultMessage,
  AutofillSummary,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
import type { Profile } from '../shared/types/profile'
import { isWorkdayPage } from './detector'
import { autofillFields, autofillSectionFields } from './executor'
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
      ]).then(([profile, workExperiences, educations]) => {
        const matches = matchFields(scanFields(document))
        const personalInfoMatches = matches.filter((match) => match.section === null)
        const workExperienceMatches = matches.filter(
          (match) => match.section === 'workExperience'
        )
        const educationMatches = matches.filter((match) => match.section === 'education')

        const summary = sumSummaries([
          autofillFields(personalInfoMatches, profile ?? ({} as Profile)),
          autofillSectionFields(workExperienceMatches, 'workExperience', workExperiences[0]),
          autofillSectionFields(educationMatches, 'education', educations[0]),
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
Expected: PASS — 8 tests passed (5 existing + 3 new).

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/index.ts src/content/index.test.ts
git commit -m "feat(content): fill work experience and education fields on autofill"
```

---

### Task 6: Manual end-to-end verification of Work Experience/Education autofill in Chrome

**Files:** None (verification only).

**Interfaces:**
- Consumes: everything built in Tasks 1–5.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Load the unpacked extension and save Work Experience / Education entries**

In Chrome, reload the unpacked extension at `chrome://extensions` (pointing at `dist` if not already loaded). Open the extension's Options page and add at least one Work Experience entry (company name, job title, start month/year, "currently working" checked) and one Education entry (school name, degree, field of study, start year) — these are the fields this plan's dictionary recognizes. Save both.

- [ ] **Step 3: Verify on the real Workday Work Experience / Education steps**

Navigate to the Work Experience step of a real Workday application (refresh the tab so the content script is freshly injected), open the Side Panel, and click "Autofill current page". Verify:
1. Company Name, Job Title, and Start Year fields get filled with your saved entry's values.
2. If "Currently Working" is a checkbox on the page, confirm it gets checked/unchecked correctly (this is the first checkbox-writing path this plan added — worth double-checking it actually toggles, not just that `.checked` was set in code).
3. If Start/End Month/Year are rendered as `<select>` dropdowns on the real page (common on Workday) rather than plain number inputs, check whether the value actually gets selected — our Scanner treats `<select>` the same as text inputs and writes via `.value = String(year)`, which only works if the dropdown's `<option>` values match that exact string. If it doesn't select correctly, that's a known limitation to note, not something to silently work around here.

Repeat for the Education step with School Name, Degree, Field of Study, and Start Year.

- [ ] **Step 4: Report**

No commit for this task — it is verification only. Confirm to the user which checks passed, and describe any field that didn't fill as expected (e.g. a `<select>`-based date field, or a field label Workday phrases differently than this plan's dictionary patterns) — that's expected territory for future refinement, not a blocker for this plan.
