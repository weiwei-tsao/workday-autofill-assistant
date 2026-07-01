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
})
