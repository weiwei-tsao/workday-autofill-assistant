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
