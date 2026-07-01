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

  it('ignores low-confidence matches entirely, even when they have a canonical key', () => {
    document.body.innerHTML = '<input placeholder="linkedin profile" />'
    const matches = matchFields(scanFields(document))

    // Sanity-check this test actually exercises the low-confidence, non-null-key path
    expect(matches[0].canonicalKey).toBe('linkedinUrl')
    expect(matches[0].confidence).toBe('low')

    const summary = autofillFields(matches, profile)

    expect(summary).toEqual({ detected: 0, filled: 0, needsReview: 0 })
  })

  it('does not fill a high-confidence match when the profile value is an empty string', () => {
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillFields(matches, { ...profile, firstName: '' })

    expect((document.getElementById('firstName') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })
})
