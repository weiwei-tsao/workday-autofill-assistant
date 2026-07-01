import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'
import { installChromeStorageMock } from '../../tests/chrome-storage-mock'
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

  it('still counts medium-confidence matches as needing review when no profile has been saved', async () => {
    // "Given Name" alone (no matching id/name) scores 40 from the label
    // match only — medium confidence, per the same scoring matchFields
    // uses when a profile is saved.
    document.body.innerHTML = '<label for="fn">Given Name</label><input id="fn" name="fn" />'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'AUTOFILL_PAGE' })

    expect(response).toEqual({
      type: 'AUTOFILL_RESULT',
      summary: { detected: 1, filled: 0, needsReview: 1 },
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
})
